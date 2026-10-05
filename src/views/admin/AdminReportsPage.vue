<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import AdminWorkspaceLayout from "@/components/admin/AdminWorkspaceLayout.vue";
import UiIcon from "@/components/company/UiIcon.vue";
import {
  dismissAdminReport,
  getAdminReport,
  listAdminReports,
  reportCategoryLabels,
  reportStatusLabels,
  resolveAdminReport,
  startAdminReportReview,
  type AdminReport,
  type ReportCategory,
  type ReportStatus,
  type ReportSubjectType,
} from "@/services/reports";

const route = useRoute();
const router = useRouter();
const initialSearch =
  typeof route.query.search === "string" ? route.query.search : "";
const initialStatus =
  typeof route.query.status === "string" &&
  Object.prototype.hasOwnProperty.call(reportStatusLabels, route.query.status)
    ? (route.query.status as ReportStatus)
    : "";
const initialSubjectType = ["JOB", "COMPANY", "USER"].includes(
  String(route.query.subjectType ?? ""),
)
  ? (route.query.subjectType as ReportSubjectType)
  : "";
const initialCategory =
  typeof route.query.category === "string" &&
  Object.prototype.hasOwnProperty.call(reportCategoryLabels, route.query.category)
    ? (route.query.category as ReportCategory)
    : "";
const reports = ref<AdminReport[]>([]);
const total = ref(0);
const page = ref(1);
const limit = 20;
const statusFilter = ref<ReportStatus | "">(initialStatus);
const subjectTypeFilter = ref<ReportSubjectType | "">(initialSubjectType);
const categoryFilter = ref<ReportCategory | "">(initialCategory);
const searchInput = ref(initialSearch);
const appliedSearch = ref(initialSearch.trim());
const loading = ref(true);
const loadError = ref("");
const selectedId = ref("");
const selectedReport = ref<AdminReport | null>(null);
const detailLoading = ref(false);
const detailError = ref("");
const actionError = ref("");
const actionMessage = ref("");
const actionBusy = ref(false);
const decisionNote = ref("");
let listVersion = 0;

const selectedSubjectTitle = computed(() => {
  const subject = selectedReport.value?.subject;
  if (!subject)
    return selectedReport.value?.subjectId ?? "Item no longer available";
  const title = subject.title ?? subject.name;
  if (typeof title === "string" && title.trim()) return title;
  const fullName = [subject.firstName, subject.lastName]
    .filter(
      (value): value is string =>
        typeof value === "string" && Boolean(value.trim()),
    )
    .join(" ");
  return (
    fullName ||
    (typeof subject.email === "string"
      ? subject.email
      : (selectedReport.value?.subjectId ?? "Reported item"))
  );
});

const pageCount = computed(() => Math.ceil(total.value / limit));

async function loadQueue() {
  const request = ++listVersion;
  loading.value = true;
  loadError.value = "";
  try {
    const result = await listAdminReports({
      page: page.value,
      limit,
      status: statusFilter.value,
      subjectType: subjectTypeFilter.value,
      category: categoryFilter.value,
      search: appliedSearch.value,
    });
    if (request !== listVersion) return;
    reports.value = result.reports;
    total.value = result.total;
  } catch (cause) {
    if (request === listVersion)
      loadError.value =
        cause instanceof Error
          ? cause.message
          : "The report queue could not be loaded.";
  } finally {
    if (request === listVersion) loading.value = false;
  }
}

watch(
  page,
  () => {
    void loadQueue();
  },
  { immediate: true },
);

watch(
  () => [
    route.query.search,
    route.query.status,
    route.query.subjectType,
    route.query.category,
  ],
  ([searchValue, statusValue, subjectTypeValue, categoryValue]) => {
    const search = typeof searchValue === "string" ? searchValue : "";
    const status =
      typeof statusValue === "string" &&
      Object.prototype.hasOwnProperty.call(reportStatusLabels, statusValue)
        ? (statusValue as ReportStatus)
        : "";
    const subjectType = ["JOB", "COMPANY", "USER"].includes(
      String(subjectTypeValue ?? ""),
    )
      ? (subjectTypeValue as ReportSubjectType)
      : "";
    const category =
      typeof categoryValue === "string" &&
      Object.prototype.hasOwnProperty.call(reportCategoryLabels, categoryValue)
        ? (categoryValue as ReportCategory)
        : "";
    if (
      search === appliedSearch.value &&
      status === statusFilter.value &&
      subjectType === subjectTypeFilter.value &&
      category === categoryFilter.value
    ) return;
    searchInput.value = search;
    appliedSearch.value = search.trim();
    statusFilter.value = status;
    subjectTypeFilter.value = subjectType;
    categoryFilter.value = category;
    if (page.value !== 1) page.value = 1;
    else void loadQueue();
  },
);

async function applyFilters() {
  appliedSearch.value = searchInput.value.trim();
  const query: Record<string, string> = {};
  if (appliedSearch.value) query.search = appliedSearch.value;
  if (statusFilter.value) query.status = statusFilter.value;
  if (subjectTypeFilter.value) query.subjectType = subjectTypeFilter.value;
  if (categoryFilter.value) query.category = categoryFilter.value;
  const routeSearch =
    typeof route.query.search === "string" ? route.query.search : "";
  if (
    routeSearch !== appliedSearch.value ||
    route.query.status !== (statusFilter.value || undefined) ||
    route.query.subjectType !== (subjectTypeFilter.value || undefined) ||
    route.query.category !== (categoryFilter.value || undefined)
  ) {
    await router.replace({ path: route.path, query });
    if (page.value !== 1) page.value = 1;
    return;
  }
  if (page.value !== 1) page.value = 1;
  else await loadQueue();
}

function submitSearch() {
  void applyFilters();
}

async function selectReport(report: AdminReport) {
  selectedId.value = report.id;
  selectedReport.value = null;
  detailError.value = "";
  actionError.value = "";
  actionMessage.value = "";
  decisionNote.value = "";
  detailLoading.value = true;
  try {
    const result = await getAdminReport(report.id);
    if (selectedId.value === report.id) selectedReport.value = result.report;
  } catch (cause) {
    if (selectedId.value === report.id)
      detailError.value =
        cause instanceof Error
          ? cause.message
          : "Report details could not be loaded.";
  } finally {
    if (selectedId.value === report.id) detailLoading.value = false;
  }
}

function closeDetails() {
  selectedId.value = "";
  selectedReport.value = null;
  detailError.value = "";
  actionError.value = "";
  actionMessage.value = "";
  decisionNote.value = "";
}

async function startReview() {
  if (!selectedReport.value || actionBusy.value) return;
  actionBusy.value = true;
  actionError.value = "";
  actionMessage.value = "";
  try {
    const result = await startAdminReportReview(selectedReport.value.id);
    selectedReport.value = result.report;
    actionMessage.value = "Review started. The report is now marked in review.";
    await loadQueue();
  } catch (cause) {
    actionError.value =
      cause instanceof Error ? cause.message : "Review could not be started.";
  } finally {
    actionBusy.value = false;
  }
}

async function closeReport(decision: "resolve" | "dismiss") {
  if (!selectedReport.value || actionBusy.value) return;
  const note = decisionNote.value.trim();
  if (note.length < 3) {
    actionError.value =
      "Add a review note of at least 3 characters before closing this report.";
    return;
  }
  actionBusy.value = true;
  actionError.value = "";
  actionMessage.value = "";
  try {
    const result =
      decision === "resolve"
        ? await resolveAdminReport(selectedReport.value.id, note)
        : await dismissAdminReport(selectedReport.value.id, note);
    selectedReport.value = result.report;
    decisionNote.value = "";
    actionMessage.value =
      decision === "resolve"
        ? "Report resolved and recorded in the audit log."
        : "Report dismissed and recorded in the audit log.";
    await loadQueue();
  } catch (cause) {
    actionError.value =
      cause instanceof Error
        ? cause.message
        : "The report decision could not be saved.";
  } finally {
    actionBusy.value = false;
  }
}

function subjectFacts(report: AdminReport) {
  const subject = report.subject;
  if (!subject) return [];
  const fields: [string, unknown][] =
    report.subjectType === "JOB"
      ? [
          ["Company", subject.company],
          ["Location", subject.location],
          ["Listing status", subject.status],
          ["Moderation", subject.moderationStatus],
        ]
      : report.subjectType === "COMPANY"
        ? [
            ["Industry", subject.industry],
            ["Location", subject.location],
            ["Website", subject.website],
            ["Verified", subject.isVerified],
          ]
        : [
            ["Role", subject.role],
            ["Email verified", subject.emailVerified],
            ["Joined", subject.createdAt],
          ];
  return fields.filter(
    ([, value]) => value !== null && value !== undefined && value !== "",
  );
}

function dateLabel(value: string) {
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
</script>

<template>
  <AdminWorkspaceLayout
    v-model:search="searchInput"
    title="Report review"
    @search="submitSearch"
  >
    <div class="reports-page">
      <section class="reports-intro" aria-labelledby="reports-title">
        <div>
          <p class="section-kicker">Trust &amp; safety</p>
          <h2 id="reports-title">Review reported content</h2>
          <p>
            Examine what was reported, record your reasoning, and make a
            consistent moderation decision.
          </p>
        </div>
        <div class="matching-count" aria-live="polite">
          <span>Matching reports</span>
          <strong>{{ total.toLocaleString() }}</strong>
          <small>Open or in review</small>
        </div>
      </section>

      <form class="filter-bar" @submit.prevent="applyFilters">
        <label class="filter-field">
          <span>Status</span>
          <select v-model="statusFilter">
            <option value="">Open + in review</option>
            <option
              v-for="(label, value) in reportStatusLabels"
              :key="value"
              :value="value"
            >
              {{ label }}
            </option>
          </select>
        </label>
        <label class="filter-field">
          <span>Reported item</span>
          <select v-model="subjectTypeFilter">
            <option value="">All item types</option>
            <option value="JOB">Job</option>
            <option value="COMPANY">Company</option>
            <option value="USER">Account</option>
          </select>
        </label>
        <label class="filter-field">
          <span>Reason</span>
          <select v-model="categoryFilter">
            <option value="">All reasons</option>
            <option
              v-for="(label, value) in reportCategoryLabels"
              :key="value"
              :value="value"
            >
              {{ label }}
            </option>
          </select>
        </label>
        <button class="filter-submit" type="submit" :disabled="loading">
          Apply filters
        </button>
      </form>

      <div v-if="loadError" class="inline-alert" role="alert">
        <span>{{ loadError }}</span>
        <button type="button" @click="loadQueue">Try again</button>
      </div>

      <div class="review-layout">
        <section class="queue-panel" aria-labelledby="queue-heading">
          <header class="panel-heading">
            <div>
              <p class="panel-kicker">Admin queue</p>
              <h2 id="queue-heading">
                {{
                  statusFilter
                    ? reportStatusLabels[statusFilter]
                    : "Needs attention"
                }}
              </h2>
            </div>
            <span class="page-label">Page {{ page }}</span>
          </header>

          <div v-if="loading" class="queue-loading" role="status">
            <span class="loading-mark" aria-hidden="true" />
            <span>Loading reports…</span>
          </div>

          <div v-else-if="reports.length" class="queue-list">
            <button
              v-for="report in reports"
              :key="report.id"
              type="button"
              class="report-row"
              :class="{ selected: selectedId === report.id }"
              :aria-label="`Review report about ${report.subject?.title ?? report.subject?.name ?? report.subjectId}`"
              :aria-pressed="selectedId === report.id"
              @click="selectReport(report)"
            >
              <div class="row-heading">
                <div class="row-title-group">
                  <p class="row-kicker">
                    {{ report.subjectType }} ·
                    {{ reportCategoryLabels[report.category] }}
                  </p>
                  <h3>
                    {{
                      report.subject?.title ??
                      report.subject?.name ??
                      report.subject?.email ??
                      report.subjectId
                    }}
                  </h3>
                </div>
                <span
                  class="status-badge"
                  :class="report.status === 'OPEN' ? 'status-open' : 'status-review'"
                  >{{ reportStatusLabels[report.status] }}</span
                >
              </div>
              <p class="report-summary">{{ report.description }}</p>
              <div class="row-meta">
                <span>{{ report.reporter?.email ?? "Reporter unavailable" }}</span>
                <time :datetime="report.createdAt">{{ dateLabel(report.createdAt) }}</time>
              </div>
            </button>
          </div>

          <div v-else-if="!loading && !loadError" class="empty-state">
            <span class="empty-icon"><UiIcon name="chart" :size="20" /></span>
            <h3>No reports match this view</h3>
            <p>New user reports will appear here for review.</p>
          </div>

          <nav
            v-if="total > limit"
            class="pagination"
            aria-label="Report queue pages"
          >
            <button
              type="button"
              :disabled="page === 1 || loading"
              @click="page--"
            >
              Previous
            </button>
            <span>{{ page }} <i>/</i> {{ pageCount }}</span>
            <button
              type="button"
              :disabled="page * limit >= total || loading"
              @click="page++"
            >
              Next
            </button>
          </nav>
        </section>

        <section
          class="detail-panel"
          aria-labelledby="report-detail-heading"
        >
          <template v-if="selectedId">
            <header class="detail-header">
              <div>
                <p class="panel-kicker">Report details</p>
                <h2 id="report-detail-heading">
                  {{ selectedReport ? selectedSubjectTitle : "Loading report" }}
                </h2>
              </div>
              <button
                class="close-detail"
                type="button"
                aria-label="Close report details"
                @click="closeDetails"
              >
                <UiIcon name="close" :size="17" />
              </button>
            </header>

            <div v-if="detailLoading" class="detail-loading" role="status">
              <span class="loading-mark" aria-hidden="true" />
              Loading report details…
            </div>
            <p v-else-if="detailError" class="inline-alert detail-alert" role="alert">
              {{ detailError }}
            </p>

            <div v-else-if="selectedReport" class="detail-content">
              <div class="detail-tags">
                <span class="detail-tag">{{ selectedReport.subjectType }}</span>
                <span class="detail-tag">{{ reportCategoryLabels[selectedReport.category] }}</span>
                <span
                  class="status-badge"
                  :class="`status-${selectedReport.status.toLowerCase().replace('_', '-')}`"
                  >{{ reportStatusLabels[selectedReport.status] }}</span
                >
              </div>

              <div class="report-parties">
                <div>
                  <p class="detail-label">Reported item</p>
                  <p class="detail-strong">{{ selectedSubjectTitle }}</p>
                  <p class="detail-subtle break-all">
                    {{ selectedReport.subjectType }} · {{ selectedReport.subjectId }}
                  </p>
                </div>
                <div>
                  <p class="detail-label">Submitted by</p>
                  <p class="detail-strong">
                    {{ selectedReport.reporter?.email ?? "Reporter unavailable" }}
                  </p>
                  <p class="detail-subtle">
                    {{ selectedReport.reporter?.role ?? "Unknown role" }} ·
                    {{ dateLabel(selectedReport.createdAt) }}
                  </p>
                </div>
              </div>

              <dl v-if="subjectFacts(selectedReport).length" class="facts-grid">
                <div v-for="[label, value] in subjectFacts(selectedReport)" :key="label">
                  <dt>{{ label }}</dt>
                  <dd>{{ value }}</dd>
                </div>
              </dl>

              <div class="explanation-block">
                <h3>Reporter’s explanation</h3>
                <p>{{ selectedReport.description }}</p>
              </div>

              <div v-if="selectedReport.resolutionNote" class="decision-note-card">
                <p class="detail-label">Decision note</p>
                <p class="decision-copy">{{ selectedReport.resolutionNote }}</p>
                <p v-if="selectedReport.reviewedBy" class="detail-subtle reviewer-line">
                  Reviewed by {{ selectedReport.reviewedBy.email }}<span v-if="selectedReport.reviewedAt">
                    · {{ dateLabel(selectedReport.reviewedAt) }}</span
                  >
                </p>
              </div>

              <p v-if="actionError" class="inline-alert" role="alert">{{ actionError }}</p>
              <p v-if="actionMessage" class="inline-success" role="status">{{ actionMessage }}</p>

              <div
                v-if="selectedReport.status === 'OPEN' || selectedReport.status === 'IN_REVIEW'"
                class="decision-controls"
              >
                <button
                  v-if="selectedReport.status === 'OPEN'"
                  class="start-review"
                  type="button"
                  :disabled="actionBusy"
                  @click="startReview"
                >
                  {{ actionBusy ? "Saving…" : "Start review" }}
                </button>
                <label class="decision-field" for="decision-note">
                  <span>Decision note</span>
                  <small>Required when resolving or dismissing (3–500 characters)</small>
                  <textarea
                    id="decision-note"
                    v-model="decisionNote"
                    minlength="3"
                    maxlength="500"
                    rows="3"
                    placeholder="Summarize what you reviewed and why you reached this decision."
                  />
                </label>
                <div class="decision-actions">
                  <button
                    class="resolve-button"
                    type="button"
                    :disabled="actionBusy || decisionNote.trim().length < 3"
                    @click="closeReport('resolve')"
                  >
                    {{ actionBusy ? "Saving…" : "Resolve report" }}
                  </button>
                  <button
                    class="dismiss-button"
                    type="button"
                    :disabled="actionBusy || decisionNote.trim().length < 3"
                    @click="closeReport('dismiss')"
                  >
                    Dismiss report
                  </button>
                </div>
                <p class="moderation-guidance">
                  Closing this report records the review outcome. Hide a job or
                  suspend an account separately only when the evidence warrants
                  enforcement.
                </p>
              </div>
            </div>
          </template>

          <div v-else class="detail-empty">
            <span class="empty-icon"><UiIcon name="chart" :size="20" /></span>
            <h2 id="report-detail-heading">Select a report to review</h2>
            <p>
              The full description and a safe summary of the reported item will
              appear here.
            </p>
          </div>
        </section>
      </div>
    </div>
  </AdminWorkspaceLayout>
</template>

<style scoped>
.reports-page { display: grid; gap: 20px; color: #19233c; }
.reports-intro { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: end; gap: 28px; }
.section-kicker, .panel-kicker { margin: 0 0 9px; color: #5643b9; font-size: 12px; font-weight: 600; letter-spacing: .09em; text-transform: uppercase; }
.reports-intro h2 { margin: 0 0 7px; color: #19233c; font-size: clamp(31px, 3.3vw, 44px); font-weight: 600; letter-spacing: -.05em; line-height: 1.05; text-wrap: balance; }
.reports-intro > div:first-child > p:last-child { max-width: 670px; margin: 10px 0 0; color: #657088; font-size: 14px; line-height: 1.65; }
.matching-count { min-width: 170px; padding: 15px 18px; border: 1px solid #e2e4e8; border-radius: 8px; display: grid; gap: 3px; background: #fff; box-shadow: 0 2px 7px rgb(25 35 60 / 2%); }
.matching-count span { color: #657088; font-size: 11px; font-weight: 600; }
.matching-count strong { color: #19233c; font-size: 28px; font-weight: 600; letter-spacing: -.04em; font-variant-numeric: tabular-nums; }
.matching-count small { color: #657088; font-size: 10px; }
.filter-bar { padding: 16px; border: 1px solid #e2e4e8; border-radius: 8px; display: grid; grid-template-columns: repeat(3, minmax(135px, 1fr)) auto; align-items: end; gap: 12px; background: #fbfbf9; }
.filter-field { min-width: 0; display: grid; gap: 7px; color: #40506b; font-size: 11px; font-weight: 600; }
.filter-field input, .filter-field select { width: 100%; min-width: 0; height: 41px; padding: 0 11px; border: 1px solid #d9dde3; border-radius: 6px; background: #fff; color: #19233c; font-size: 12px; font-weight: 400; }
.filter-field input::placeholder { color: #8a93a2; }
.filter-field input:focus, .filter-field select:focus, .decision-field textarea:focus { border-color: #6a56cf; outline: 0; box-shadow: 0 0 0 3px rgb(106 86 207 / 12%); }
.filter-submit { min-height: 41px; padding: 0 13px; border: 0; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; gap: 7px; background: #19233c; color: #fff; font-size: 12px; font-weight: 600; cursor: pointer; transition: background 180ms ease, transform 180ms ease; }
.filter-submit:hover:not(:disabled) { background: #2b3855; transform: translateY(-1px); }
.filter-submit:disabled { cursor: wait; opacity: .65; }
.inline-alert, .inline-success { min-width: 0; padding: 12px 14px; border: 1px solid #f0c9ce; border-radius: 6px; display: flex; align-items: center; justify-content: space-between; gap: 14px; background: #fff3f4; color: #963448; font-size: 12px; line-height: 1.55; }
.inline-alert button { padding: 4px 0; border: 0; background: transparent; color: inherit; text-decoration: underline; font-weight: 700; cursor: pointer; }
.inline-success { border-color: #cce8d6; background: #edf7f0; color: #276c48; }
.review-layout { display: grid; grid-template-columns: minmax(0, .94fr) minmax(0, 1.06fr); align-items: start; gap: 20px; }
.queue-panel, .detail-panel { min-width: 0; overflow: hidden; border: 1px solid #e2e4e8; border-radius: 8px; background: #fff; box-shadow: 0 8px 25px rgb(25 35 60 / 4%); }
.panel-heading, .detail-header { min-height: 75px; padding: 16px 19px; border-bottom: 1px solid #e8eaf0; display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.panel-heading h2, .detail-header h2 { margin: 5px 0 0; color: #19233c; font-size: 17px; font-weight: 600; letter-spacing: -.025em; }
.page-label { padding: 6px 8px; border-radius: 4px; background: #f3f4f7; color: #657088; font-size: 10px; font-weight: 600; white-space: nowrap; }
.queue-loading, .detail-loading { min-height: 190px; display: flex; align-items: center; justify-content: center; gap: 10px; color: #657088; font-size: 12px; }
.loading-mark { width: 15px; height: 15px; border: 2px solid #d9d5f4; border-top-color: #6a56cf; border-radius: 50%; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.queue-list { display: grid; }
.report-row { position: relative; width: 100%; min-width: 0; padding: 17px 18px 15px; border: 0; border-bottom: 1px solid #eceef1; display: block; background: #fff; color: inherit; text-align: left; cursor: pointer; transition: background 160ms ease; }
.report-row:last-child { border-bottom: 0; }
.report-row:hover, .report-row.selected { background: #f8f7fd; }
.report-row.selected::before { position: absolute; inset: 0 auto 0 0; width: 3px; background: #6a56cf; content: ""; }
.row-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.row-title-group { min-width: 0; }
.row-kicker { margin: 0; color: #657088; font-size: 10px; font-weight: 700; letter-spacing: .065em; text-transform: uppercase; }
.row-title-group h3 { margin: 6px 0 0; overflow-wrap: anywhere; color: #19233c; font-size: 14px; font-weight: 600; letter-spacing: -.01em; line-height: 1.4; }
.status-badge { width: max-content; flex: 0 0 auto; padding: 5px 7px; border: 1px solid transparent; border-radius: 4px; font-size: 10px; font-weight: 700; white-space: nowrap; }
.status-open { border-color: #f0dfb6; background: #fff8e8; color: #85620d; }
.status-in-review { border-color: #d7d1f4; background: #f2f0fc; color: #5948ae; }
.status-resolved { border-color: #cce8d6; background: #edf7f0; color: #276c48; }
.status-dismissed { border-color: #dce1e8; background: #f2f4f7; color: #586476; }
.report-summary { display: -webkit-box; margin: 10px 0 12px; overflow: hidden; color: #536078; font-size: 12px; line-height: 1.55; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.row-meta { display: flex; align-items: center; justify-content: space-between; gap: 8px; color: #7c8799; font-size: 10px; }
.row-meta span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.row-meta time { flex: 0 0 auto; }
.empty-state, .detail-empty { min-height: 300px; padding: 38px 24px; display: grid; align-content: center; justify-items: center; text-align: center; }
.empty-icon { width: 42px; height: 42px; border-radius: 10px; display: grid; place-items: center; background: #f0eefb; color: #5643b9; }
.empty-state h3, .detail-empty h2 { margin: 14px 0 0; color: #19233c; font-size: 15px; font-weight: 600; }
.empty-state p, .detail-empty p { max-width: 340px; margin: 7px 0 0; color: #657088; font-size: 12px; line-height: 1.6; }
.pagination { min-height: 58px; padding: 10px 15px; border-top: 1px solid #e8eaf0; display: flex; align-items: center; justify-content: space-between; }
.pagination button, .close-detail { min-height: 34px; padding: 0 10px; border: 1px solid #dfe2e8; border-radius: 6px; background: #fff; color: #40506b; font-size: 11px; font-weight: 600; cursor: pointer; transition: background 160ms ease, border-color 160ms ease; }
.pagination button:hover:not(:disabled), .close-detail:hover { border-color: #c9ced7; background: #f0eefb; }
.pagination button:disabled { cursor: default; opacity: .45; }
.pagination span { color: #40506b; font-size: 11px; font-weight: 600; font-variant-numeric: tabular-nums; }
.pagination i { margin: 0 5px; color: #99a1af; font-style: normal; }
.detail-panel { min-height: 420px; }
.detail-header { padding: 16px 20px; }
.detail-header h2 { max-width: 560px; overflow-wrap: anywhere; font-size: 16px; }
.close-detail { width: 34px; padding: 0; display: grid; place-items: center; }
.detail-content { padding: 18px 20px 22px; display: grid; gap: 18px; }
.detail-tags { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; }
.detail-tag { width: max-content; padding: 5px 7px; border: 1px solid #e2e4e8; border-radius: 4px; background: #f7f8fa; color: #586476; font-size: 10px; font-weight: 600; }
.report-parties { padding: 0 0 16px; border-bottom: 1px solid #e8eaf0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.report-parties > div { min-width: 0; }
.detail-label { margin: 0; color: #7b8493; font-size: 10px; font-weight: 700; letter-spacing: .065em; text-transform: uppercase; }
.detail-strong { margin: 6px 0 0; overflow-wrap: anywhere; color: #40506b; font-size: 12px; font-weight: 600; line-height: 1.45; }
.detail-subtle { margin: 5px 0 0; color: #7c8799; font-size: 10px; line-height: 1.5; }
.break-all { overflow-wrap: anywhere; }
.facts-grid { margin: 0; padding: 13px 14px; border-radius: 7px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 13px 18px; background: #f7f8fa; }
.facts-grid > div { min-width: 0; }
.facts-grid dt { color: #7c8799; font-size: 9px; font-weight: 700; letter-spacing: .065em; text-transform: uppercase; }
.facts-grid dd { margin: 4px 0 0; overflow-wrap: anywhere; color: #40506b; font-size: 11px; font-weight: 500; }
.explanation-block h3 { margin: 0; color: #657088; font-size: 10px; font-weight: 700; letter-spacing: .065em; text-transform: uppercase; }
.explanation-block p { margin: 8px 0 0; padding: 13px 14px; border: 1px solid #e2e4e8; border-radius: 7px; background: #fff; color: #40506b; font-size: 12px; line-height: 1.7; white-space: pre-wrap; overflow-wrap: anywhere; }
.decision-note-card { padding: 13px 14px; border: 1px solid #e2e4e8; border-radius: 7px; background: #f8f9fb; }
.decision-copy { margin: 7px 0 0; color: #40506b; font-size: 12px; line-height: 1.6; white-space: pre-wrap; }
.reviewer-line { margin-top: 9px; }
.detail-alert, .detail-content > .inline-success { margin: 16px 20px 0; }
.detail-content > .inline-alert, .detail-content > .inline-success { margin: 0; }
.decision-controls { padding-top: 16px; border-top: 1px solid #e8eaf0; display: grid; gap: 13px; }
.start-review, .resolve-button, .dismiss-button { min-height: 38px; padding: 0 13px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; transition: background 160ms ease, border-color 160ms ease, transform 160ms ease; }
.start-review { width: max-content; border: 1px solid #d7d1f4; background: #f2f0fc; color: #5948ae; }
.start-review:hover:not(:disabled) { background: #e9e5fa; }
.decision-field { display: grid; gap: 6px; color: #40506b; font-size: 12px; font-weight: 600; }
.decision-field small { color: #7c8799; font-size: 10px; font-weight: 400; }
.decision-field textarea { min-height: 84px; padding: 9px 11px; border: 1px solid #d9dde3; border-radius: 6px; resize: vertical; background: #fff; color: #19233c; font-size: 11px; font-weight: 400; line-height: 1.55; }
.decision-field textarea::placeholder { color: #929baa; }
.decision-actions { display: flex; flex-wrap: wrap; gap: 9px; }
.resolve-button { border: 1px solid #cfc7f2; background: #6a56cf; color: #fff; }
.resolve-button:hover:not(:disabled) { background: #5643b9; transform: translateY(-1px); }
.dismiss-button { border: 1px solid #d9dde3; background: #fff; color: #586476; }
.dismiss-button:hover:not(:disabled) { border-color: #c9ced7; background: #f7f8fa; }
.resolve-button:disabled, .dismiss-button:disabled, .start-review:disabled { cursor: not-allowed; opacity: .48; }
.moderation-guidance { margin: 0; color: #7c8799; font-size: 10px; line-height: 1.55; }

@media (max-width: 1160px) {
  .filter-bar { grid-template-columns: repeat(2, minmax(130px, 1fr)); }
  .filter-submit { grid-column: 1 / -1; justify-self: end; }
  .review-layout { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 560px) {
  .reports-page { gap: 14px; }
  .reports-intro { grid-template-columns: minmax(0, 1fr); gap: 14px; }
  .reports-intro h2 { font-size: clamp(27px, 7vw, 36px); }
  .matching-count { min-width: 0; padding: 12px 14px; grid-template-columns: 1fr auto; align-items: center; }
  .matching-count strong { grid-column: 2; grid-row: 1 / span 2; }
  .matching-count small { grid-column: 1; }
  .filter-bar { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); padding: 12px; gap: 10px; }
  .filter-submit { grid-column: 1 / -1; }
  .filter-submit { width: 100%; }
  .panel-heading, .detail-header { padding-inline: 14px; }
  .report-row { padding-inline: 14px; }
  .detail-content { padding: 15px 14px 18px; gap: 15px; }
  .report-parties { grid-template-columns: minmax(0, 1fr); gap: 12px; }
}
@media (prefers-reduced-motion: reduce) {
  .loading-mark { animation: none; }
}
</style>
