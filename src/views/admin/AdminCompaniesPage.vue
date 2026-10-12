<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AdminProfileDialog from '@/components/admin/AdminProfileDialog.vue'
import AdminWorkspaceLayout from '@/components/admin/AdminWorkspaceLayout.vue'
import {
  approveAdminCompany,
  listAdminCompanies,
  rejectAdminCompany,
  suspendAdminCompany,
  unsuspendAdminCompany,
  type AdminCompanyQueueItem,
  type AdminCompanyStatus,
} from '@/services/adminCompanies'

const companies = ref<AdminCompanyQueueItem[]>([])
const failedLogoIds = ref<string[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const searchInput = ref('')
const appliedSearch = ref('')
const statusFilter = ref<AdminCompanyStatus | ''>('')
const selectedItem = ref<AdminCompanyQueueItem | null>(null)
const loading = ref(true)
const loadError = ref('')
const actionError = ref('')
const actionMessage = ref('')
const decisionReason = ref('')
const actionMode = ref<'reject' | 'suspend' | ''>('')
const actionBusy = ref<'' | 'approve' | 'reject' | 'suspend' | 'restore'>('')
let requestVersion = 0

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
const pageSummary = computed(() => {
  const start = total.value ? (page.value - 1) * pageSize + 1 : 0
  const end = Math.min(page.value * pageSize, total.value)
  return `${start}–${end} of ${total.value.toLocaleString()}`
})
const selectedCompany = computed(() => selectedItem.value?.company ?? null)
const selectedOwner = computed(() => selectedItem.value?.ownerContact ?? null)
const profileOpen = computed(() => selectedItem.value !== null)
const selectedStatus = computed(() => selectedItem.value ? companyStatus(selectedItem.value) : 'PENDING')
const pageSubtitle = computed(() => statusFilter.value
  ? `${total.value.toLocaleString()} ${statusLabel(statusFilter.value).toLowerCase()} compan${total.value === 1 ? 'y' : 'ies'}`
  : `${total.value.toLocaleString()} compan${total.value === 1 ? 'y' : 'ies'} across the platform`)
const companyInitials = computed(() => selectedCompany.value?.name
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0])
  .join('')
  .toUpperCase() || 'CO')
const approvalBlocker = computed(() => {
  if (!selectedOwner.value) return 'No owner account is attached to this company profile.'
  if (selectedOwner.value.suspendedAt) return 'The owner account is suspended. Resolve the account status before approving this company.'
  if (!selectedOwner.value.emailVerified) return 'The owner must verify their email address before this company can be approved.'
  return ''
})
const canApprove = computed(() => Boolean(selectedCompany.value && !selectedCompany.value.suspendedAt && !selectedCompany.value.isVerified && !approvalBlocker.value && !actionBusy.value))

function markLogoFailed(id: string) {
  if (!failedLogoIds.value.includes(id)) failedLogoIds.value.push(id)
}
const companyFacts = computed(() => {
  const company = selectedCompany.value
  if (!company) return []
  return [
    { label: 'Industry', value: company.industry || 'Not provided' },
    { label: 'Company size', value: company.companySize || 'Not provided' },
    { label: 'Founded', value: company.foundedYear ? String(company.foundedYear) : 'Not provided' },
    { label: 'Location', value: company.location || 'Not provided' },
    { label: 'Public contact', value: company.contactEmail || 'Not provided' },
    { label: 'Time zone', value: company.timezone || 'Not provided' },
    { label: 'Website', value: company.website || 'Not provided' },
    { label: 'Owner email', value: selectedOwner.value?.email || 'Not linked' },
  ]
})

async function loadCompanies() {
  const request = ++requestVersion
  loading.value = true
  loadError.value = ''
  try {
    const result = await listAdminCompanies({
      page: page.value,
      limit: pageSize,
      search: appliedSearch.value,
      status: statusFilter.value,
    })
    if (request !== requestVersion) return
    companies.value = result.companies
    total.value = result.total
    if (selectedItem.value) {
      const updated = result.companies.find(({ company }) => company.id === selectedItem.value?.company.id)
      if (updated) selectedItem.value = updated
      else closeProfile()
    }
  } catch (cause) {
    if (request === requestVersion) loadError.value = cause instanceof Error ? cause.message : 'Companies could not be loaded.'
  } finally {
    if (request === requestVersion) loading.value = false
  }
}

watch([page, statusFilter], () => { void loadCompanies() }, { immediate: true })
watch(statusFilter, () => { page.value = 1 })

function applySearch() {
  appliedSearch.value = searchInput.value.trim()
  if (page.value !== 1) page.value = 1
  else void loadCompanies()
}

function clearFilters() {
  const statusChanged = statusFilter.value !== ''
  searchInput.value = ''
  appliedSearch.value = ''
  statusFilter.value = ''
  page.value = 1
  actionMessage.value = ''
  if (!statusChanged) void loadCompanies()
}

function openProfile(item: AdminCompanyQueueItem) {
  selectedItem.value = item
  actionError.value = ''
  actionMessage.value = ''
  decisionReason.value = ''
  actionMode.value = ''
}

function closeProfile() {
  selectedItem.value = null
  actionError.value = ''
  decisionReason.value = ''
  actionMode.value = ''
}

async function approveSelected() {
  const company = selectedCompany.value
  if (!company || !canApprove.value) return
  actionBusy.value = 'approve'
  actionError.value = ''
  actionMessage.value = ''
  try {
    await approveAdminCompany(company.id)
    actionMessage.value = `${company.name} is verified. Its profile can appear publicly and its owner can publish jobs.`
    await loadCompanies()
  } catch (cause) {
    actionError.value = cause instanceof Error ? cause.message : 'The company could not be approved.'
  } finally {
    actionBusy.value = ''
  }
}

async function saveRejection() {
  const company = selectedCompany.value
  const reason = decisionReason.value.trim()
  if (!company || actionBusy.value) return
  if (reason.length < 3 || reason.length > 500) {
    actionError.value = 'Add a decision note between 3 and 500 characters.'
    return
  }
  actionBusy.value = 'reject'
  actionError.value = ''
  actionMessage.value = ''
  try {
    await rejectAdminCompany(company.id, reason)
    actionMessage.value = `${company.name} was returned for changes. The review note is saved to its profile.`
    decisionReason.value = ''
    actionMode.value = ''
    await loadCompanies()
  } catch (cause) {
    actionError.value = cause instanceof Error ? cause.message : 'The decision could not be saved.'
  } finally {
    actionBusy.value = ''
  }
}

async function suspendSelected() {
  const company = selectedCompany.value
  const reason = decisionReason.value.trim()
  if (!company || actionBusy.value) return
  if (reason.length < 3 || reason.length > 500) {
    actionError.value = 'Enter a suspension reason between 3 and 500 characters.'
    return
  }
  actionBusy.value = 'suspend'
  actionError.value = ''
  actionMessage.value = ''
  try {
    await suspendAdminCompany(company.id, reason)
    actionMessage.value = `${company.name} has been suspended.`
    decisionReason.value = ''
    actionMode.value = ''
    await loadCompanies()
  } catch (cause) {
    actionError.value = cause instanceof Error ? cause.message : 'The company could not be suspended.'
  } finally {
    actionBusy.value = ''
  }
}

async function restoreCompany() {
  const company = selectedCompany.value
  if (!company || actionBusy.value) return
  actionBusy.value = 'restore'
  actionError.value = ''
  actionMessage.value = ''
  try {
    await unsuspendAdminCompany(company.id)
    actionMessage.value = `${company.name} has been restored.`
    await loadCompanies()
  } catch (cause) {
    actionError.value = cause instanceof Error ? cause.message : 'The company could not be restored.'
  } finally {
    actionBusy.value = ''
  }
}

function ownerLabel(item: AdminCompanyQueueItem) {
  return item.ownerContact?.contactName?.trim() || item.ownerContact?.email || 'Owner not linked'
}

function statusLabel(status: AdminCompanyStatus) {
  return status === 'PENDING' ? 'Pending review' : status === 'VERIFIED' ? 'Verified' : 'Suspended'
}

function companyStatus(item: AdminCompanyQueueItem) {
  return item.company.suspendedAt ? 'SUSPENDED' : item.company.isVerified ? 'VERIFIED' : 'PENDING'
}

function dateLabel(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'
  return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(date)
}
</script>

<template>
  <AdminWorkspaceLayout
    v-model:search="searchInput"
    title="Companies"
    search-label="Search companies"
    search-placeholder="Search companies"
    @search="applySearch"
  >
    <section class="companies-page" aria-labelledby="companies-heading">
      <header class="page-heading">
        <div>
          <p class="eyebrow">Platform accounts</p>
          <h2 id="companies-heading">Companies</h2>
          <p>Browse company profiles, check verification status, and manage account access.</p>
        </div>
        <div class="record-total" aria-live="polite"><strong>{{ total.toLocaleString() }}</strong><span>{{ statusFilter ? statusLabel(statusFilter).toLowerCase() : 'total companies' }}</span></div>
      </header>

      <p v-if="actionMessage && !profileOpen" class="notice success" role="status">{{ actionMessage }}</p>
      <div class="toolbar" aria-label="Company filters">
        <label class="filter-field">Verification status
          <select v-model="statusFilter" aria-label="Filter companies by verification status">
            <option value="">All companies</option><option value="PENDING">Pending review</option><option value="VERIFIED">Verified</option><option value="SUSPENDED">Suspended</option>
          </select>
        </label>
      </div>

      <p v-if="actionError && !profileOpen" class="notice error" role="alert">{{ actionError }}</p>
      <div v-if="loading" class="state-panel" role="status">Loading companies…</div>
      <div v-else-if="loadError" class="state-panel error-state" role="alert">
        <strong>Companies are unavailable</strong><span>{{ loadError }}</span><button type="button" @click="loadCompanies">Try again</button>
      </div>
      <div v-else-if="!companies.length" class="state-panel empty-state">
        <strong>{{ appliedSearch || statusFilter ? 'No matching companies' : 'No companies yet' }}</strong>
        <span>{{ appliedSearch || statusFilter ? 'Adjust the filters or search terms and try again.' : 'Company accounts will appear here when they register.' }}</span>
      </div>
      <section v-else class="company-list-panel" aria-label="Company directory">
        <header class="list-heading"><div><span>Company</span><span>Owner</span><span>Status</span><span>Joined</span></div><small>{{ pageSummary }}</small></header>
        <div class="company-list">
          <article v-for="item in companies" :key="item.company.id" class="company-row">
            <div class="company-identity">
              <span class="company-mark" aria-hidden="true">
                <img v-if="item.company.logoUrl && !failedLogoIds.includes(item.company.id)" :src="item.company.logoUrl" alt="" @error="markLogoFailed(item.company.id)" />
                <span v-else>{{ item.company.name.trim().slice(0, 1).toUpperCase() || 'C' }}</span>
              </span>
              <div class="company-copy">
                <button class="company-name" type="button" @click="openProfile(item)">{{ item.company.name }}</button>
                <small>{{ item.company.industry || 'Industry not provided' }}<span> · </span>{{ item.company.location || 'Location not provided' }}</small>
              </div>
            </div>
            <span class="owner-cell">{{ ownerLabel(item) }}</span>
            <span class="status-pill" :class="companyStatus(item).toLowerCase()"><i />{{ statusLabel(companyStatus(item)) }}</span>
            <time class="joined-cell" :datetime="item.company.createdAt">{{ dateLabel(item.company.createdAt) }}</time>
            <button class="profile-button" type="button" :aria-label="`Open ${item.company.name} profile`" @click="openProfile(item)">View profile</button>
          </article>
        </div>
        <nav v-if="pageCount > 1" class="pagination" aria-label="Company pages">
          <button type="button" :disabled="page === 1 || loading" @click="page--">Previous</button>
          <span>Page {{ page }} of {{ pageCount }}</span>
          <button type="button" :disabled="page >= pageCount || loading" @click="page++">Next</button>
        </nav>
      </section>
    </section>

    <AdminProfileDialog
      :open="profileOpen"
      eyebrow="Company profile"
      :title="selectedCompany?.name ?? 'Company profile'"
      :subtitle="[selectedCompany?.industry, selectedCompany?.location].filter(Boolean).join(' · ') || 'Company account details'"
      @close="closeProfile"
    >
      <template v-if="selectedCompany">
        <div class="company-profile-identity">
          <span class="company-profile-mark" aria-hidden="true">
            <img v-if="selectedCompany.logoUrl && !failedLogoIds.includes(selectedCompany.id)" :src="selectedCompany.logoUrl" alt="" @error="markLogoFailed(selectedCompany.id)" />
            <span v-else>{{ companyInitials }}</span>
          </span>
          <div class="company-profile-state">
            <span class="status-pill" :class="selectedStatus.toLowerCase()"><i />{{ statusLabel(selectedStatus) }}</span>
            <small>Submitted {{ dateLabel(selectedCompany.createdAt) }}</small>
          </div>
        </div>

        <section class="owner-card" aria-labelledby="owner-heading">
          <span class="detail-kicker">Account owner</span>
          <h3 id="owner-heading">{{ selectedOwner?.contactName || 'Owner account' }}</h3>
          <p>{{ selectedOwner?.email || 'No owner email available' }}</p>
          <span class="owner-state" :class="selectedOwner?.emailVerified && !selectedOwner.suspendedAt ? 'ready' : 'blocked'">
            {{ !selectedOwner ? 'Owner account not linked' : selectedOwner.suspendedAt ? 'Owner account suspended' : selectedOwner.emailVerified ? 'Email verified' : 'Email not verified' }}
          </span>
        </section>

        <section class="profile-section" aria-labelledby="company-facts-title">
          <div class="profile-section-heading"><div><span class="detail-kicker">Company details</span><h3 id="company-facts-title">Profile information</h3></div><small>Updated {{ dateLabel(selectedCompany.updatedAt) }}</small></div>
          <dl class="company-facts">
            <div v-for="fact in companyFacts" :key="fact.label"><dt>{{ fact.label }}</dt><dd>{{ fact.value }}</dd></div>
          </dl>
        </section>

        <section class="profile-section description-section" aria-labelledby="company-about-title">
          <span class="detail-kicker">Introduction</span><h3 id="company-about-title">About the company</h3>
          <p>{{ selectedCompany.description || 'No company description has been added.' }}</p>
        </section>

        <section v-if="selectedCompany.moderationNote" class="moderation-note">
          <span class="detail-kicker">Previous review note</span><p>{{ selectedCompany.moderationNote }}</p>
        </section>
        <section v-if="selectedCompany.suspensionReason" class="moderation-note suspended-note">
          <span class="detail-kicker">Suspension reason</span><p>{{ selectedCompany.suspensionReason }}</p>
        </section>

        <section class="company-actions" aria-labelledby="company-actions-title">
          <div class="profile-section-heading"><div><span class="detail-kicker">Admin actions</span><h3 id="company-actions-title">Manage company account</h3></div></div>
          <p v-if="actionError" class="profile-alert" role="alert">{{ actionError }}</p>
          <p v-if="actionMessage" class="profile-success" role="status">{{ actionMessage }}</p>

          <template v-if="selectedCompany.suspendedAt">
            <p class="action-explainer">This account is suspended. Restore it to let its owner sign in and continue using company features.</p>
            <button class="quiet-button" type="button" :disabled="actionBusy !== ''" @click="restoreCompany">{{ actionBusy === 'restore' ? 'Restoring…' : 'Restore company access' }}</button>
          </template>
          <template v-else-if="!selectedCompany.isVerified">
            <p v-if="approvalBlocker" class="eligibility-note blocked" role="status">{{ approvalBlocker }}</p>
            <p v-else class="eligibility-note ready" role="status">The owner is verified and active. You can approve this company profile.</p>
            <button class="approve-button" type="button" :disabled="!canApprove" @click="approveSelected">{{ actionBusy === 'approve' ? 'Approving…' : 'Verify and approve' }}</button>
            <button v-if="actionMode !== 'reject'" class="text-action reject-link" type="button" @click="actionMode = 'reject'; decisionReason = ''; actionError = ''">Request changes or reject</button>
            <form v-else class="decision-form" @submit.prevent="saveRejection">
              <label for="company-rejection-reason">Review note <small>Required · 3–500 characters</small></label>
              <textarea id="company-rejection-reason" v-model="decisionReason" minlength="3" maxlength="500" required placeholder="Explain what needs to change or why the company cannot be verified." />
              <div class="form-actions"><button class="text-action" type="button" @click="actionMode = ''; decisionReason = ''">Cancel</button><button class="danger-button" type="submit" :disabled="actionBusy !== '' || decisionReason.trim().length < 3">{{ actionBusy === 'reject' ? 'Saving…' : 'Save review note' }}</button></div>
            </form>
          </template>
          <template v-else>
            <p class="action-explainer">This company is verified and visible to job seekers. Suspending it blocks company account access.</p>
            <button v-if="actionMode !== 'suspend'" class="danger-button" type="button" @click="actionMode = 'suspend'; decisionReason = ''; actionError = ''">Suspend company</button>
            <form v-else class="decision-form" @submit.prevent="suspendSelected">
              <label for="company-suspension-reason">Reason for suspension <small>Required · 3–500 characters</small></label>
              <textarea id="company-suspension-reason" v-model="decisionReason" minlength="3" maxlength="500" required placeholder="Describe the policy issue." />
              <div class="form-actions"><button class="text-action" type="button" @click="actionMode = ''; decisionReason = ''">Cancel</button><button class="danger-button" type="submit" :disabled="actionBusy !== '' || decisionReason.trim().length < 3">{{ actionBusy === 'suspend' ? 'Saving…' : 'Confirm suspension' }}</button></div>
            </form>
          </template>
        </section>
      </template>
    </AdminProfileDialog>
  </AdminWorkspaceLayout>
</template>

<style scoped>
.companies-page { max-width: 1240px; margin: 5px auto 0; color: #19233c; }
.page-heading { margin-bottom: 20px; display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; }
.eyebrow { margin: 0 0 8px; color: #6555bf; font-size: 12px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; }
.page-heading h2 { margin: 0; color: #19233c; font-size: clamp(29px, 3vw, 38px); font-weight: 600; letter-spacing: -.045em; }
.page-heading p:not(.eyebrow) { max-width: 62ch; margin: 7px 0 0; color: #657088; font-size: 13px; line-height: 1.5; }
.record-total { min-width: 105px; padding: 5px 0 2px 15px; border-left: 1px solid #dfe2e7; display: grid; gap: 2px; text-align: right; }
.record-total strong { color: #26334b; font-size: 23px; font-variant-numeric: tabular-nums; }
.record-total span { color: #7a8391; font-size: 11px; }
.toolbar { min-height: 62px; margin-bottom: 13px; padding: 10px 13px; border: 1px solid #e2e4e8; border-radius: 7px; display: flex; align-items: center; gap: 13px; background: #fff; }
.filter-field { display: flex; align-items: center; gap: 9px; color: #788293; font-size: 11px; font-weight: 500; }
.filter-field select { min-width: 160px; height: 35px; padding: 0 25px 0 9px; border: 1px solid #e0e3e8; border-radius: 5px; background: #fff; color: #35425a; font-size: 12px; }
.filter-count { margin-left: auto; color: #808998; font-size: 11px; }
.clear-filters { border: 0; background: transparent; color: #5e4eb1; font-size: 11px; font-weight: 600; cursor: pointer; }
.notice { margin: 0 0 12px; padding: 10px 12px; border-radius: 5px; font-size: 12px; line-height: 1.5; }
.notice.success { background: #eff7f2; color: #347250; }
.notice.error, .error-state { background: #fff6f6; color: #994650; }
.state-panel { min-height: 150px; padding: 24px; border: 1px solid #e2e4e8; border-radius: 8px; display: grid; align-content: center; justify-items: center; gap: 8px; background: #fff; color: #707b8c; font-size: 13px; text-align: center; }
.state-panel strong { color: #35425a; font-size: 14px; }
.state-panel span { max-width: 48ch; font-size: 12px; line-height: 1.5; }
.state-panel button { margin-top: 3px; border: 0; background: transparent; color: #5d4db2; font-size: 12px; font-weight: 600; cursor: pointer; }
.company-list-panel { overflow: hidden; border: 1px solid #e2e4e8; border-radius: 8px; background: #fff; box-shadow: 0 8px 25px rgb(25 35 60 / 4%); }
.list-heading { min-height: 43px; padding: 0 17px; border-bottom: 1px solid #e8eaf0; display: flex; align-items: center; justify-content: space-between; gap: 14px; background: #fbfbf9; }
.list-heading > div { flex: 1; display: grid; grid-template-columns: minmax(220px, 1.5fr) minmax(135px, .8fr) minmax(115px, .7fr) minmax(100px, .6fr) auto; gap: 16px; color: #7b8493; font-size: 9px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
.list-heading small { color: #7b8493; font-size: 10px; white-space: nowrap; }
.company-list { display: grid; }
.company-row { min-height: 76px; padding: 12px 17px; border-bottom: 1px solid #eceef1; display: grid; grid-template-columns: minmax(220px, 1.5fr) minmax(135px, .8fr) minmax(115px, .7fr) minmax(100px, .6fr) auto; align-items: center; gap: 16px; }
.company-row:last-child { border-bottom: 0; }
.company-row:hover { background: #fdfcff; }
.company-identity { min-width: 0; display: flex; align-items: center; gap: 11px; }
.company-mark, .company-profile-mark { width: 39px; height: 39px; flex: 0 0 auto; border: 1px solid #ded9f3; border-radius: 10px; display: grid; place-items: center; overflow: hidden; background: #f0eefb; color: #5643b9; font-size: 13px; font-weight: 700; }
.company-mark img, .company-profile-mark img { width: 100%; height: 100%; object-fit: cover; }
.company-copy { min-width: 0; display: grid; gap: 4px; }
.company-name { width: fit-content; max-width: 100%; overflow: hidden; padding: 0; border: 0; background: transparent; color: #27344b; font-size: 12px; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; text-align: left; cursor: pointer; }
.company-name:hover { color: #5d4db2; text-decoration: underline; text-underline-offset: 3px; }
.company-name:focus-visible { outline: 2px solid #8879da; outline-offset: 3px; border-radius: 2px; }
.company-copy small { overflow: hidden; color: #7a8391; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.owner-cell, .joined-cell { overflow: hidden; color: #576379; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.status-pill { width: max-content; max-width: 100%; padding: 5px 7px; border: 1px solid transparent; border-radius: 5px; display: inline-flex; align-items: center; gap: 6px; font-size: 9px; font-weight: 700; white-space: nowrap; }
.status-pill i { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.status-pill.pending { border-color: #f0dfb6; background: #fff8e8; color: #85620d; }
.status-pill.verified { border-color: #cce8d6; background: #edf7f0; color: #276c48; }
.status-pill.suspended { border-color: #f0c9ce; background: #fff3f4; color: #963448; }
.profile-button { min-height: 31px; padding: 0 9px; border: 1px solid #e1dcef; border-radius: 5px; background: #fff; color: #5d4db2; font-size: 10px; font-weight: 600; white-space: nowrap; cursor: pointer; }
.profile-button:hover { border-color: #d0c9ef; background: #f5f3fc; }
.pagination { min-height: 52px; padding: 9px 14px; border-top: 1px solid #e8eaf0; display: flex; align-items: center; justify-content: center; gap: 15px; color: #778194; font-size: 11px; }
.pagination button { min-height: 32px; padding: 0 9px; border: 1px solid #dde0e6; border-radius: 5px; background: #fff; color: #4b5870; font-size: 11px; cursor: pointer; }
.pagination button:disabled { opacity: .45; cursor: not-allowed; }
.company-profile-identity { margin-bottom: 18px; display: flex; align-items: center; gap: 13px; }
.company-profile-mark { width: 56px; height: 56px; border-radius: 14px; font-size: 17px; }
.company-profile-state { display: grid; justify-items: start; gap: 6px; }
.company-profile-state small { color: #7a8391; font-size: 10px; }
.owner-card { margin-bottom: 19px; padding: 14px 15px; border: 1px solid #e4e1f1; border-radius: 7px; background: #faf9ff; }
.detail-kicker { color: #7b8493; font-size: 9px; font-weight: 700; letter-spacing: .065em; text-transform: uppercase; }
.owner-card h3 { margin: 4px 0 0; color: #26334b; font-size: 13px; font-weight: 650; }
.owner-card p { margin: 5px 0 8px; color: #576379; font-size: 11px; overflow-wrap: anywhere; }
.owner-state { padding: 4px 7px; border: 1px solid transparent; border-radius: 4px; font-size: 9px; font-weight: 650; }
.owner-state.ready { border-color: #cce8d6; background: #edf7f0; color: #276c48; }
.owner-state.blocked { border-color: #f0dfb6; background: #fff8e8; color: #85620d; }
.profile-section { margin-top: 18px; }
.profile-section-heading { margin-bottom: 10px; display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; }
.profile-section-heading h3, .description-section h3 { margin: 4px 0 0; color: #26334b; font-size: 14px; font-weight: 650; letter-spacing: -.02em; }
.profile-section-heading > small { color: #7b8493; font-size: 9px; white-space: nowrap; }
.company-facts { margin: 0; padding: 13px; border: 1px solid #e8eaf0; border-radius: 7px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 13px 18px; background: #fbfbf9; }
.company-facts > div { min-width: 0; }
.company-facts dt { color: #7c8799; font-size: 8px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
.company-facts dd { margin: 4px 0 0; overflow-wrap: anywhere; color: #40506b; font-size: 10px; line-height: 1.45; }
.description-section > p { margin: 8px 0 0; padding: 11px 12px; border-left: 2px solid #d7d1f4; background: #fbfbf9; color: #40506b; font-size: 11px; line-height: 1.7; white-space: pre-wrap; overflow-wrap: anywhere; }
.moderation-note { margin-top: 14px; padding: 11px 12px; border: 1px solid #f0dfb6; border-radius: 6px; background: #fffaf0; }
.moderation-note p { margin: 6px 0 0; color: #695624; font-size: 10px; line-height: 1.6; white-space: pre-wrap; }
.suspended-note { border-color: #f0c9ce; background: #fff6f6; }
.suspended-note .detail-kicker, .suspended-note p { color: #963448; }
.company-actions { margin-top: 20px; padding-top: 17px; border-top: 1px solid #e8eaf0; display: grid; justify-items: start; gap: 10px; }
.company-actions .profile-section-heading { width: 100%; margin-bottom: 0; }
.action-explainer { margin: 0; color: #657088; font-size: 10px; line-height: 1.55; }
.eligibility-note { margin: 0; padding: 9px 10px; border: 1px solid transparent; border-radius: 6px; font-size: 10px; line-height: 1.55; }
.eligibility-note.ready { border-color: #cce8d6; background: #edf7f0; color: #276c48; }
.eligibility-note.blocked { border-color: #f0dfb6; background: #fff8e8; color: #765d1b; }
.approve-button, .quiet-button, .danger-button, .text-action { min-height: 34px; padding: 0 11px; border: 1px solid #d8dce3; border-radius: 5px; background: #fff; color: #3f4b61; font-size: 10px; font-weight: 650; cursor: pointer; }
.approve-button { border-color: #5d49c4; background: #6a56cf; color: #fff; }
.approve-button:hover:not(:disabled) { background: #5643b9; }
.danger-button { border-color: #ead1d3; color: #9a454e; }
.danger-button:hover:not(:disabled) { background: #fff6f6; }
.quiet-button:hover:not(:disabled), .text-action:hover { background: #f5f4fb; }
.text-action { min-height: auto; padding: 6px 2px; border: 0; color: #5e4eb1; }
.reject-link { justify-self: start; }
.decision-form { width: 100%; margin-top: 4px; display: grid; gap: 7px; }
.decision-form label { display: flex; justify-content: space-between; gap: 10px; color: #40506b; font-size: 10px; font-weight: 650; }
.decision-form label small { color: #7c8799; font-size: 9px; font-weight: 400; }
.decision-form textarea { min-height: 76px; padding: 9px 10px; border: 1px solid #d9dde3; border-radius: 6px; resize: vertical; color: #19233c; font: inherit; font-size: 10px; line-height: 1.5; }
.decision-form textarea:focus { border-color: #6a56cf; outline: 0; box-shadow: 0 0 0 3px rgb(106 86 207 / 12%); }
.form-actions { display: flex; align-items: center; justify-content: flex-end; gap: 8px; }
.profile-alert, .profile-success { width: 100%; margin: 0; padding: 9px 10px; border-radius: 5px; font-size: 10px; line-height: 1.5; }
.profile-alert { background: #fff3f4; color: #963448; }
.profile-success { background: #edf7f0; color: #276c48; }
button:disabled { opacity: .5; cursor: not-allowed; }
@media (max-width: 900px) {
  .list-heading > div { grid-template-columns: minmax(190px, 1fr) minmax(105px, .75fr) minmax(110px, auto) auto; }
  .list-heading > div > span:nth-child(4) { display: none; }
  .company-row { grid-template-columns: minmax(190px, 1fr) minmax(105px, .75fr) minmax(110px, auto) auto; }
  .joined-cell { display: none; }
}
@media (max-width: 680px) {
  .page-heading { align-items: flex-start; }
  .toolbar { align-items: stretch; flex-wrap: wrap; }
  .filter-field { flex: 1 1 100%; justify-content: space-between; }
  .filter-field select { width: 65%; }
  .filter-count { margin-left: 0; }
  .list-heading { display: none; }
  .company-row { position: relative; grid-template-columns: minmax(0, 1fr) auto; gap: 9px 12px; padding: 13px; }
  .company-identity { grid-column: 1 / -1; }
  .owner-cell { grid-column: 1; padding-left: 50px; }
  .status-pill { grid-column: 2; grid-row: 2; }
  .profile-button { grid-column: 1 / -1; justify-self: end; }
  .profile-section-heading { align-items: flex-start; flex-direction: column; gap: 5px; }
}
@media (max-width: 560px) {
  .page-heading { gap: 12px; }
  .record-total { min-width: 75px; padding-left: 10px; }
  .company-facts { grid-template-columns: 1fr; }
  .decision-form label { align-items: flex-start; flex-direction: column; gap: 3px; }
}
</style>
