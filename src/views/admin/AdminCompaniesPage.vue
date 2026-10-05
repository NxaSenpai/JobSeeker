<script setup lang="ts">
import { computed, ref, watch } from "vue";
import AdminWorkspaceLayout from "@/components/admin/AdminWorkspaceLayout.vue";
import UiIcon from "@/components/company/UiIcon.vue";
import {
  approveAdminCompany,
  listAdminCompanies,
  rejectAdminCompany,
  type AdminCompanyQueueItem,
} from "@/services/adminCompanies";

const companies = ref<AdminCompanyQueueItem[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = 20;
const searchInput = ref("");
const appliedSearch = ref("");
const selectedId = ref("");
const detailOpen = ref(false);
const loading = ref(true);
const loadError = ref("");
const actionError = ref("");
const actionMessage = ref("");
const queueNotice = ref("");
const rejectReason = ref("");
const actionBusy = ref<"approve" | "reject" | "">("");
let requestVersion = 0;

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)));
const selectedItem = computed(() => companies.value.find(({ company }) => company.id === selectedId.value) ?? null);
const selectedCompany = computed(() => selectedItem.value?.company ?? null);
const selectedOwner = computed(() => selectedItem.value?.ownerContact ?? null);
const approvalBlocker = computed(() => {
  if (!selectedOwner.value) return "No owner account is attached to this company profile.";
  if (selectedOwner.value.suspendedAt) return "The owner account is suspended. Resolve the account status before approving this company.";
  if (!selectedOwner.value.emailVerified) return "The owner must verify their email address before this company can be approved.";
  return "";
});
const canApprove = computed(() => Boolean(selectedCompany.value) && !approvalBlocker.value && !actionBusy.value);
const companyInitials = computed(() => selectedCompany.value?.name
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0])
  .join("")
  .toUpperCase() || "CO");
const companyFacts = computed(() => {
  const company = selectedCompany.value;
  if (!company) return [];
  return [
    { label: "Industry", value: company.industry || "Not provided" },
    { label: "Company size", value: company.companySize || "Not provided" },
    { label: "Founded", value: company.foundedYear ? String(company.foundedYear) : "Not provided" },
    { label: "Location", value: company.location || "Not provided" },
    { label: "Public contact", value: company.contactEmail || "Not provided" },
    { label: "Time zone", value: company.timezone || "Not provided" },
  ];
});
const pageSummary = computed(() => {
  const start = total.value ? (page.value - 1) * pageSize + 1 : 0;
  const end = Math.min(page.value * pageSize, total.value);
  return `${start}–${end} of ${total.value.toLocaleString()}`;
});

async function loadQueue() {
  const request = ++requestVersion;
  loading.value = true;
  loadError.value = "";
  try {
    const result = await listAdminCompanies({
      page: page.value,
      limit: pageSize,
      search: appliedSearch.value,
    });
    if (request !== requestVersion) return;
    companies.value = result.companies;
    total.value = result.total;
    if (!companies.value.some(({ company }) => company.id === selectedId.value)) {
      selectedId.value = companies.value[0]?.company.id ?? "";
    }
  } catch (cause) {
    if (request === requestVersion) {
      loadError.value = cause instanceof Error ? cause.message : "The company queue could not be loaded.";
    }
  } finally {
    if (request === requestVersion) loading.value = false;
  }
}

watch(page, () => { void loadQueue(); }, { immediate: true });
watch(selectedId, () => {
  actionError.value = "";
  actionMessage.value = "";
  rejectReason.value = "";
});

function applySearch() {
  appliedSearch.value = searchInput.value.trim();
  detailOpen.value = false;
  queueNotice.value = "";
  if (page.value !== 1) page.value = 1;
  else void loadQueue();
}

function openCompany(item: AdminCompanyQueueItem) {
  selectedId.value = item.company.id;
  actionError.value = "";
  actionMessage.value = "";
  rejectReason.value = "";
  queueNotice.value = "";
  detailOpen.value = true;
}

function backToQueue() {
  detailOpen.value = false;
}

async function approveSelected() {
  const company = selectedCompany.value;
  if (!company || !canApprove.value) return;
  actionBusy.value = "approve";
  actionError.value = "";
  actionMessage.value = "";
  queueNotice.value = "";
  try {
    await approveAdminCompany(company.id);
    queueNotice.value = `${company.name} is approved. Its profile can now appear publicly and its owner can publish jobs.`;
    detailOpen.value = false;
    await loadQueue();
  } catch (cause) {
    actionError.value = cause instanceof Error ? cause.message : "The company could not be approved.";
  } finally {
    actionBusy.value = "";
  }
}

async function rejectSelected() {
  const company = selectedCompany.value;
  const reason = rejectReason.value.trim();
  if (!company || actionBusy.value) return;
  if (reason.length < 3 || reason.length > 500) {
    actionError.value = "Add a decision note between 3 and 500 characters.";
    return;
  }
  actionBusy.value = "reject";
  actionError.value = "";
  actionMessage.value = "";
  queueNotice.value = "";
  try {
    await rejectAdminCompany(company.id, reason);
    actionMessage.value = "Decision saved. The company remains unverified, and this note is available for a later review.";
    rejectReason.value = "";
    await loadQueue();
  } catch (cause) {
    actionError.value = cause instanceof Error ? cause.message : "The decision could not be saved.";
  } finally {
    actionBusy.value = "";
  }
}

function ownerLabel(item: AdminCompanyQueueItem) {
  return item.ownerContact?.contactName?.trim() || item.ownerContact?.email || "Owner not linked";
}

function dateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric" }).format(date);
}
</script>

<template>
  <AdminWorkspaceLayout
    v-model:search="searchInput"
    title="Company verification"
    search-label="Search company applications"
    search-placeholder="Search companies"
    @search="applySearch"
  >
    <div class="verification-page">
      <section class="verification-intro" aria-labelledby="verification-title">
        <div>
          <p class="section-kicker">Trust &amp; safety · Company accounts</p>
          <h2 id="verification-title">Review company applications</h2>
          <p>Check the company profile and owner account before granting public visibility and job-posting access.</p>
        </div>
        <div class="queue-total" aria-live="polite">
          <span>Awaiting verification</span>
          <strong>{{ total.toLocaleString() }}</strong>
          <small>{{ appliedSearch ? "Matching companies" : "Unverified company accounts" }}</small>
        </div>
      </section>

      <p v-if="queueNotice" class="queue-notice" role="status">{{ queueNotice }}</p>

      <div v-if="loadError" class="inline-alert" role="alert">
        <span>{{ loadError }}</span>
        <button type="button" @click="loadQueue">Try again</button>
      </div>

      <section v-if="!detailOpen" class="queue-view" aria-label="Company verification queue">
        <section class="queue-panel" aria-labelledby="queue-heading">
          <header class="panel-heading">
            <div>
              <p class="panel-kicker">Review queue</p>
              <h3 id="queue-heading">Unverified companies</h3>
            </div>
            <span class="page-label">{{ pageSummary }}</span>
          </header>

          <div v-if="loading" class="queue-skeletons" role="status" aria-label="Loading company applications">
            <div v-for="index in 4" :key="index" class="queue-skeleton"><i /><span><b /><small /></span></div>
          </div>

          <div v-else-if="companies.length" class="queue-list">
            <button
              v-for="item in companies"
              :key="item.company.id"
              type="button"
              class="company-row"
              :class="{ selected: selectedId === item.company.id }"
              :aria-label="`Review ${item.company.name}`"
              @click="openCompany(item)"
            >
              <span class="company-mark" aria-hidden="true">{{ item.company.name.trim().slice(0, 1).toUpperCase() || "C" }}</span>
              <span class="company-row-copy">
                <span class="company-row-heading">
                  <strong>{{ item.company.name }}</strong>
                  <span class="review-state" :class="item.company.moderationNote ? 'returned' : 'new'">
                    {{ item.company.moderationNote ? "Changes requested" : "New submission" }}
                  </span>
                </span>
                <small>{{ item.company.industry || "Industry not provided" }}<span> · </span>{{ item.company.location || "Location not provided" }}</small>
                <small class="owner-line">{{ ownerLabel(item) }}<span> · </span>{{ item.ownerContact?.emailVerified ? "Email verified" : "Email not verified" }}</small>
              </span>
              <span class="view-details"><span>View details</span><UiIcon name="chevron" :size="16" /></span>
            </button>
          </div>

          <div v-else-if="!loading && !loadError" class="queue-empty">
            <span class="empty-mark"><UiIcon name="building" :size="21" /></span>
            <h3>{{ appliedSearch ? "No companies match this search" : "The verification queue is clear" }}</h3>
            <p>{{ appliedSearch ? "Try a company name, industry, location, or owner email." : "New company applications will appear here when they are ready for review." }}</p>
          </div>

          <nav v-if="total > pageSize" class="pagination" aria-label="Company queue pages">
            <button type="button" :disabled="page === 1 || loading" @click="page--">Previous</button>
            <span>Page {{ page }} <i>/</i> {{ pageCount }}</span>
            <button type="button" :disabled="page >= pageCount || loading" @click="page++">Next</button>
          </nav>
        </section>
      </section>

      <section v-else class="detail-view" aria-label="Company application details">
        <section class="detail-panel" aria-labelledby="company-detail-heading">
          <template v-if="selectedCompany">
            <button class="back-to-queue" type="button" @click="backToQueue">
              <UiIcon name="chevron" :size="15" />
              <span>Back to company list</span>
            </button>
            <header class="detail-header">
              <div class="identity-heading">
                <span class="identity-mark" aria-hidden="true">{{ companyInitials }}</span>
                <div>
                  <div class="detail-tags">
                    <span class="detail-tag">Company account</span>
                    <span class="review-state" :class="selectedCompany.moderationNote ? 'returned' : 'new'">{{ selectedCompany.moderationNote ? "Changes requested" : "Pending review" }}</span>
                  </div>
                  <h2 id="company-detail-heading">{{ selectedCompany.name }}</h2>
                  <p>{{ selectedCompany.industry || "Industry not provided" }}<span> · </span>{{ selectedCompany.location || "Location not provided" }}</p>
                </div>
              </div>
            </header>

            <div class="detail-content">
              <section class="owner-card" aria-labelledby="owner-heading">
                <div class="owner-card-heading">
                  <span class="owner-icon"><UiIcon name="users" :size="17" /></span>
                  <div><p class="detail-label">Account owner</p><h3 id="owner-heading">{{ selectedOwner?.contactName || "Owner account" }}</h3></div>
                </div>
                <p class="owner-email">{{ selectedOwner?.email || "No owner email available" }}</p>
                <span v-if="selectedOwner?.emailVerified && !selectedOwner.suspendedAt" class="owner-status ready"><i /> Verified and active</span>
                <span v-else class="owner-status blocked"><i />{{ selectedOwner?.suspendedAt ? "Owner account suspended" : selectedOwner ? "Email verification required" : "Owner account not linked" }}</span>
              </section>

              <section class="company-facts-section" aria-labelledby="company-facts-heading">
                <div class="section-heading"><div><p class="panel-kicker">Application details</p><h3 id="company-facts-heading">Company profile</h3></div><span class="created-date">Submitted {{ dateLabel(selectedCompany.createdAt) }}</span></div>
                <dl class="facts-grid">
                  <div v-for="fact in companyFacts" :key="fact.label"><dt>{{ fact.label }}</dt><dd>{{ fact.value }}</dd></div>
                  <div><dt>Owner account email</dt><dd>{{ selectedOwner?.email || "Not linked" }}</dd></div>
                  <div><dt>Last profile update</dt><dd>{{ dateLabel(selectedCompany.updatedAt) }}</dd></div>
                  <div v-if="selectedCompany.website"><dt>Website</dt><dd class="break-anywhere">{{ selectedCompany.website }}</dd></div>
                </dl>
              </section>

              <section class="description-section" aria-labelledby="description-heading">
                <p class="panel-kicker">Company introduction</p>
                <h3 id="description-heading">About the company</h3>
                <p v-if="selectedCompany.description" class="description-copy">{{ selectedCompany.description }}</p>
                <p v-else class="missing-copy">No company description has been added.</p>
              </section>

              <section v-if="selectedCompany.moderationNote" class="previous-note" aria-label="Previous review note">
                <p class="detail-label">Previous review note</p>
                <p>{{ selectedCompany.moderationNote }}</p>
                <small>Profile last updated {{ dateLabel(selectedCompany.updatedAt) }}. Review the updated details before making another decision.</small>
              </section>

              <section class="decision-section" aria-labelledby="decision-heading">
                <div class="section-heading"><div><p class="panel-kicker">Admin decision</p><h3 id="decision-heading">Choose an outcome</h3></div></div>
                <p v-if="approvalBlocker" class="eligibility-note blocked" role="status"><UiIcon name="help" :size="16" /><span>{{ approvalBlocker }}</span></p>
                <p v-else class="eligibility-note ready" role="status"><UiIcon name="building" :size="16" /><span>The owner is verified and active. The server will re-check eligibility when you approve.</span></p>

                <button class="approve-button" type="button" :disabled="!canApprove" @click="approveSelected">
                  <UiIcon name="building" :size="16" />
                  {{ actionBusy === "approve" ? "Approving…" : "Verify and approve" }}
                </button>
                <p class="approval-impact">Approval makes this company profile public and allows its owner to publish jobs.</p>

                <div class="reject-form">
                  <label for="company-review-reason"><span>Reason for rejection</span><small>Required · 3–500 characters</small></label>
                  <textarea id="company-review-reason" v-model="rejectReason" minlength="3" maxlength="500" rows="3" placeholder="Explain what needs to change or why the company cannot be verified." />
                  <div class="reject-footer"><small>{{ rejectReason.trim().length }} / 500</small><button class="reject-button" type="button" :disabled="actionBusy !== '' || rejectReason.trim().length < 3" @click="rejectSelected">{{ actionBusy === "reject" ? "Saving decision…" : "Reject with reason" }}</button></div>
                </div>

                <p v-if="actionError" class="inline-alert decision-alert" role="alert">{{ actionError }}</p>
                <p v-if="actionMessage" class="inline-success" role="status">{{ actionMessage }}</p>
              </section>
            </div>
          </template>
          <div v-else class="detail-empty">
            <span class="empty-mark"><UiIcon name="building" :size="21" /></span>
            <h2 id="company-detail-heading">This application is no longer in the queue</h2>
            <p>Return to the list to choose another company to review.</p>
            <button class="back-to-queue" type="button" @click="backToQueue">Back to company list</button>
          </div>
        </section>
      </section>
    </div>
  </AdminWorkspaceLayout>
</template>

<style scoped>
.verification-page { display: grid; gap: 18px; color: #19233c; }
.verification-intro { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: end; gap: 26px; }
.section-kicker, .panel-kicker { margin: 0 0 8px; color: #5643b9; font-size: 11px; font-weight: 650; letter-spacing: .085em; text-transform: uppercase; }
.verification-intro h2 { max-width: 700px; margin: 0; color: #19233c; font-size: clamp(30px, 3.4vw, 43px); font-weight: 600; line-height: 1.06; letter-spacing: -.05em; text-wrap: balance; }
.verification-intro > div:first-child > p:last-child { max-width: 650px; margin: 10px 0 0; color: #657088; font-size: 14px; line-height: 1.65; }
.queue-total { min-width: 190px; padding: 14px 17px 15px; border-left: 3px solid #6a56cf; display: grid; gap: 3px; background: #f0eefb; }
.queue-total span { color: #5643b9; font-size: 10px; font-weight: 700; letter-spacing: .04em; }
.queue-total strong { color: #19233c; font-size: 28px; font-weight: 600; line-height: 1.05; letter-spacing: -.04em; font-variant-numeric: tabular-nums; }
.queue-total small { color: #657088; font-size: 10px; }
.queue-notice { margin: 0; padding: 12px 14px; border: 1px solid #cce8d6; border-radius: 6px; background: #edf7f0; color: #276c48; font-size: 12px; line-height: 1.55; }
.inline-alert, .inline-success { min-width: 0; margin: 0; padding: 12px 14px; border: 1px solid #f0c9ce; border-radius: 6px; display: flex; align-items: center; justify-content: space-between; gap: 14px; background: #fff3f4; color: #963448; font-size: 12px; line-height: 1.55; }
.inline-alert button { padding: 4px 0; border: 0; background: transparent; color: inherit; text-decoration: underline; font-weight: 700; cursor: pointer; }
.inline-success { border-color: #cce8d6; background: #edf7f0; color: #276c48; }
.queue-panel, .detail-panel { min-width: 0; overflow: hidden; border: 1px solid #e2e4e8; border-radius: 9px; background: #fff; box-shadow: 0 8px 25px rgb(25 35 60 / 4%); }
.detail-view { width: min(100%, 1040px); margin-inline: auto; }
.panel-heading { min-height: 74px; padding: 15px 17px; border-bottom: 1px solid #e8eaf0; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.panel-heading h3 { margin: 3px 0 0; color: #19233c; font-size: 17px; font-weight: 600; letter-spacing: -.025em; }
.panel-kicker { margin-bottom: 0; font-size: 9px; }
.page-label { padding: 6px 8px; border-radius: 4px; background: #f3f4f7; color: #657088; font-size: 10px; font-weight: 600; white-space: nowrap; font-variant-numeric: tabular-nums; }
.queue-list { display: grid; }
.company-row { position: relative; width: 100%; min-width: 0; min-height: 91px; padding: 14px 17px; border: 0; border-bottom: 1px solid #eceef1; display: grid; grid-template-columns: 39px minmax(0, 1fr) auto; align-items: center; gap: 14px; background: #fff; color: inherit; text-align: left; cursor: pointer; transition: background 160ms ease; }
.company-row:last-child { border-bottom: 0; }
.company-row:hover, .company-row.selected { background: #f8f7fd; }
.company-row.selected::before { position: absolute; inset: 0 auto 0 0; width: 3px; background: #6a56cf; content: ""; }
.company-row:focus-visible { z-index: 1; outline: 3px solid rgb(106 86 207 / 32%); outline-offset: -3px; }
.company-mark { width: 38px; height: 38px; border: 1px solid #ded9f3; border-radius: 10px; display: grid; place-items: center; background: #f0eefb; color: #5643b9; font-size: 13px; font-weight: 700; }
.company-row-copy { min-width: 0; display: grid; gap: 5px; }
.company-row-heading { min-width: 0; display: flex; align-items: center; justify-content: space-between; gap: 7px; }
.company-row-heading strong { min-width: 0; overflow: hidden; color: #19233c; font-size: 12px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.company-row-copy > small { min-width: 0; overflow: hidden; color: #657088; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.company-row-copy .owner-line { color: #7c8799; }
.view-details { min-height: 34px; padding: 0 9px; border: 1px solid #e2e4e8; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; gap: 5px; color: #5643b9; font-size: 10px; font-weight: 600; white-space: nowrap; transition: border-color 160ms ease, background 160ms ease; }
.company-row:hover .view-details { border-color: #d7d1f4; background: #f0eefb; }
.review-state { flex: 0 0 auto; padding: 4px 6px; border: 1px solid transparent; border-radius: 4px; font-size: 9px; font-weight: 700; white-space: nowrap; }
.review-state.new { border-color: #f0dfb6; background: #fff8e8; color: #85620d; }
.review-state.returned { border-color: #d7d1f4; background: #f2f0fc; color: #5948ae; }
.queue-empty, .detail-empty { min-height: 300px; padding: 36px 23px; display: grid; align-content: center; justify-items: center; text-align: center; }
.empty-mark { width: 43px; height: 43px; border-radius: 11px; display: grid; place-items: center; background: #f0eefb; color: #5643b9; }
.queue-empty h3, .detail-empty h2 { margin: 14px 0 0; color: #19233c; font-size: 15px; font-weight: 600; letter-spacing: -.015em; }
.queue-empty p, .detail-empty p { max-width: 330px; margin: 7px 0 0; color: #657088; font-size: 11px; line-height: 1.65; }
.pagination { min-height: 56px; padding: 9px 14px; border-top: 1px solid #e8eaf0; display: flex; align-items: center; justify-content: space-between; }
.pagination button { min-height: 33px; padding: 0 10px; border: 1px solid #dfe2e8; border-radius: 6px; background: #fff; color: #40506b; font-size: 10px; font-weight: 600; cursor: pointer; transition: background 160ms ease, border-color 160ms ease; }
.pagination button:hover:not(:disabled) { border-color: #c9ced7; background: #f0eefb; }
.pagination button:disabled { cursor: default; opacity: .45; }
.pagination span { color: #40506b; font-size: 10px; font-weight: 600; font-variant-numeric: tabular-nums; }
.pagination i { margin: 0 4px; color: #99a1af; font-style: normal; }
.detail-panel { min-height: 430px; padding-top: 15px; }
.back-to-queue { min-height: 34px; margin: 0 20px 14px; padding: 0 10px; border: 1px solid #e2e4e8; border-radius: 6px; display: inline-flex; align-items: center; gap: 6px; background: #fff; color: #40506b; font-size: 10px; font-weight: 600; cursor: pointer; transition: border-color 160ms ease, background 160ms ease, color 160ms ease; }
.back-to-queue > .ui-icon { transform: rotate(180deg); }
.back-to-queue:hover { border-color: #d7d1f4; background: #f0eefb; color: #5643b9; }
.detail-empty .back-to-queue { margin: 17px 0 0; }
.detail-header { padding: 21px 22px 18px; border-bottom: 1px solid #e8eaf0; background: linear-gradient(115deg, #fff 55%, #faf9ff); }
.identity-heading { min-width: 0; display: flex; align-items: center; gap: 15px; }
.identity-mark { width: 58px; height: 58px; flex: 0 0 auto; border: 1px solid #dcd6f2; border-radius: 15px; display: grid; place-items: center; background: #f0eefb; color: #5643b9; font-size: 19px; font-weight: 700; letter-spacing: -.04em; }
.identity-heading h2 { margin: 7px 0 2px; overflow-wrap: anywhere; color: #19233c; font-size: 22px; font-weight: 600; line-height: 1.2; letter-spacing: -.035em; }
.identity-heading p { margin: 0; color: #657088; font-size: 11px; }
.detail-tags { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.detail-tag { width: max-content; padding: 4px 6px; border: 1px solid #e2e4e8; border-radius: 4px; background: #f7f8fa; color: #586476; font-size: 9px; font-weight: 600; }
.detail-content { padding: 17px 20px 21px; display: grid; gap: 17px; }
.owner-card { padding: 13px 14px; border: 1px solid #e4e1f1; border-radius: 7px; background: #faf9ff; }
.owner-card-heading { display: flex; align-items: center; gap: 9px; }
.owner-icon { width: 32px; height: 32px; border-radius: 8px; display: grid; place-items: center; background: #f0eefb; color: #5643b9; }
.detail-label { margin: 0; color: #7b8493; font-size: 9px; font-weight: 700; letter-spacing: .065em; text-transform: uppercase; }
.owner-card-heading h3 { margin: 3px 0 0; color: #19233c; font-size: 12px; font-weight: 600; }
.owner-email { margin: 10px 0 8px 41px; color: #40506b; font-size: 11px; overflow-wrap: anywhere; }
.owner-status { width: max-content; max-width: 100%; padding: 5px 7px; border: 1px solid transparent; border-radius: 4px; display: inline-flex; align-items: center; gap: 6px; font-size: 9px; font-weight: 700; }
.owner-status i { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.owner-status.ready { border-color: #cce8d6; background: #edf7f0; color: #276c48; }
.owner-status.blocked { border-color: #f0dfb6; background: #fff8e8; color: #85620d; }
.section-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; }
.section-heading h3, .description-section h3 { margin: 4px 0 0; color: #19233c; font-size: 14px; font-weight: 600; letter-spacing: -.018em; }
.created-date { color: #7c8799; font-size: 9px; white-space: nowrap; }
.facts-grid { margin: 11px 0 0; padding: 12px 13px; border: 1px solid #e8eaf0; border-radius: 7px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 13px 16px; background: #fbfbf9; }
.facts-grid > div { min-width: 0; }
.facts-grid dt { color: #7c8799; font-size: 8px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
.facts-grid dd { margin: 4px 0 0; overflow-wrap: anywhere; color: #40506b; font-size: 10px; font-weight: 500; line-height: 1.4; }
.break-anywhere { overflow-wrap: anywhere; }
.description-section { padding-top: 2px; }
.description-copy, .missing-copy { margin: 9px 0 0; padding: 11px 12px; border-left: 2px solid #d7d1f4; background: #fbfbf9; color: #40506b; font-size: 11px; line-height: 1.7; white-space: pre-wrap; overflow-wrap: anywhere; }
.missing-copy { color: #7c8799; font-style: italic; }
.previous-note { padding: 11px 12px; border: 1px solid #f0dfb6; border-radius: 6px; background: #fffaf0; }
.previous-note > p:nth-child(2) { margin: 6px 0 0; color: #695624; font-size: 11px; line-height: 1.6; white-space: pre-wrap; }
.previous-note small { display: block; margin-top: 7px; color: #85764e; font-size: 9px; line-height: 1.5; }
.decision-section { padding-top: 15px; border-top: 1px solid #e8eaf0; display: grid; gap: 11px; }
.eligibility-note { margin: 0; padding: 9px 10px; border: 1px solid transparent; border-radius: 6px; display: flex; align-items: flex-start; gap: 8px; font-size: 10px; line-height: 1.55; }
.eligibility-note .ui-icon { margin-top: 1px; }
.eligibility-note.ready { border-color: #cce8d6; background: #edf7f0; color: #276c48; }
.eligibility-note.blocked { border-color: #f0dfb6; background: #fff8e8; color: #765d1b; }
.approve-button { min-height: 40px; padding: 0 13px; border: 1px solid #5d49c4; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; gap: 7px; background: #6a56cf; color: #fff; font-size: 11px; font-weight: 600; cursor: pointer; transition: background 160ms ease, transform 160ms ease; }
.approve-button:hover:not(:disabled) { background: #5643b9; transform: translateY(-1px); }
.approve-button:disabled { cursor: not-allowed; opacity: .48; }
.approval-impact { margin: -5px 0 0; color: #7c8799; font-size: 9px; line-height: 1.5; }
.reject-form { margin-top: 2px; padding-top: 13px; border-top: 1px dashed #e2e4e8; display: grid; gap: 7px; }
.reject-form label { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; color: #40506b; font-size: 10px; font-weight: 600; }
.reject-form label small { color: #7c8799; font-size: 9px; font-weight: 400; }
.reject-form textarea { min-height: 76px; padding: 9px 10px; border: 1px solid #d9dde3; border-radius: 6px; resize: vertical; background: #fff; color: #19233c; font-size: 10px; line-height: 1.5; }
.reject-form textarea::placeholder { color: #929baa; }
.reject-form textarea:focus { border-color: #6a56cf; outline: 0; box-shadow: 0 0 0 3px rgb(106 86 207 / 12%); }
.reject-footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.reject-footer > small { color: #7c8799; font-size: 9px; font-variant-numeric: tabular-nums; }
.reject-button { min-height: 34px; padding: 0 11px; border: 1px solid #ead1d5; border-radius: 6px; background: #fff; color: #963f50; font-size: 10px; font-weight: 600; cursor: pointer; transition: background 160ms ease, border-color 160ms ease; }
.reject-button:hover:not(:disabled) { border-color: #d8aeb5; background: #fff3f4; }
.reject-button:disabled { cursor: not-allowed; opacity: .46; }
.decision-alert { margin: 0; }
.queue-skeletons { display: grid; }
.queue-skeleton { min-height: 82px; padding: 14px; border-bottom: 1px solid #eceef1; display: flex; align-items: center; gap: 11px; }
.queue-skeleton > i { width: 38px; height: 38px; border-radius: 10px; background: linear-gradient(90deg, #f1f2f5 25%, #e9eaf0 45%, #f1f2f5 65%); background-size: 300% 100%; animation: shimmer 1.4s ease infinite; }
.queue-skeleton > span { flex: 1; display: grid; gap: 9px; }
.queue-skeleton b, .queue-skeleton small { height: 9px; border-radius: 6px; background: #eff0f4; }
.queue-skeleton b { width: 62%; }
.queue-skeleton small { width: 83%; }
@keyframes shimmer { to { background-position: -150% 0; } }

@media (max-width: 760px) {
  .verification-intro { grid-template-columns: minmax(0, 1fr); gap: 14px; }
  .queue-total { width: 100%; min-width: 0; padding: 11px 13px; grid-template-columns: 1fr auto; align-items: center; }
  .queue-total strong { grid-column: 2; grid-row: 1 / span 2; }
  .queue-total small { grid-column: 1; }
}
@media (max-width: 560px) {
  .verification-page { gap: 14px; }
  .verification-intro h2 { font-size: clamp(27px, 7vw, 35px); }
  .panel-heading { padding-inline: 13px; }
  .company-row { grid-template-columns: 34px minmax(0, 1fr) auto; gap: 8px; padding-inline: 10px; }
  .company-mark { width: 34px; height: 34px; }
  .company-row-heading { align-items: flex-start; flex-direction: column; }
  .review-state { max-width: 100%; }
  .view-details { min-height: 31px; padding-inline: 6px; font-size: 9px; }
  .view-details > span { display: none; }
  .detail-header { padding: 17px 14px; }
  .back-to-queue { margin-inline: 13px; }
  .identity-heading { align-items: flex-start; gap: 11px; }
  .identity-mark { width: 48px; height: 48px; border-radius: 12px; font-size: 16px; }
  .identity-heading h2 { font-size: 19px; }
  .detail-content { padding: 14px 13px 17px; gap: 15px; }
  .facts-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .section-heading { align-items: flex-start; flex-direction: column; gap: 5px; }
  .created-date { white-space: normal; }
  .reject-form label { align-items: flex-start; flex-direction: column; gap: 3px; }
}
@media (prefers-reduced-motion: reduce) {
  .loading-mark, .queue-skeleton > i { animation: none; }
}
</style>
