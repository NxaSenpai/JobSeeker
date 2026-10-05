<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AdminWorkspaceLayout from '@/components/admin/AdminWorkspaceLayout.vue'
import UiIcon from '@/components/company/UiIcon.vue'
import {
  approveAdminJob,
  hideAdminJob,
  listAdminJobs,
  rejectAdminJob,
  restoreAdminJob,
  type AdminJob,
} from '@/services/adminOperations'

type ModerationFilter = AdminJob['moderationStatus']
type ReviewAction = 'reject' | 'hide' | ''

const search = ref('')
const appliedSearch = ref('')
const statusFilter = ref<ModerationFilter>('PENDING')
const listingStatus = ref<AdminJob['status'] | 'ALL'>('PUBLISHED')
const jobs = ref<AdminJob[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(true)
const loadError = ref('')
const actionError = ref('')
const actionMessage = ref('')
const busyId = ref('')
const expandedId = ref('')
const reviewAction = ref<ReviewAction>('')
const reviewReason = ref('')
let requestVersion = 0

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / 20)))

async function loadJobs() {
  const version = ++requestVersion
  loading.value = true
  loadError.value = ''
  actionError.value = ''
  try {
    const result = await listAdminJobs({
      search: appliedSearch.value,
      moderationStatus: statusFilter.value,
      status: listingStatus.value,
      page: page.value,
    })
    if (version !== requestVersion) return
    jobs.value = result.jobs
    total.value = result.total
    if (expandedId.value && !result.jobs.some((job) => job.id === expandedId.value)) expandedId.value = ''
  } catch (cause) {
    if (version === requestVersion) loadError.value = cause instanceof Error ? cause.message : 'Jobs could not be loaded.'
  } finally {
    if (version === requestVersion) loading.value = false
  }
}

function applySearch() {
  appliedSearch.value = search.value.trim()
  page.value = 1
  void loadJobs()
}

watch([statusFilter, listingStatus], () => {
  page.value = 1
  expandedId.value = ''
  void loadJobs()
})

onMounted(() => void loadJobs())

function openReview(job: AdminJob) {
  expandedId.value = expandedId.value === job.id ? '' : job.id
  reviewAction.value = ''
  reviewReason.value = ''
  actionError.value = ''
  actionMessage.value = ''
}

function startReasonAction(action: Exclude<ReviewAction, ''>) {
  reviewAction.value = action
  reviewReason.value = ''
  actionError.value = ''
}

async function mutate(job: AdminJob, action: 'approve' | 'reject' | 'hide' | 'restore') {
  const reason = reviewReason.value.trim()
  if ((action === 'reject' || action === 'hide') && reason.length < 3) {
    actionError.value = 'Add a review reason of at least 3 characters.'
    return
  }
  busyId.value = job.id
  actionError.value = ''
  actionMessage.value = ''
  try {
    if (action === 'approve') await approveAdminJob(job.id)
    else if (action === 'reject') await rejectAdminJob(job.id, reason)
    else if (action === 'hide') await hideAdminJob(job.id, reason)
    else await restoreAdminJob(job.id)

    const verbs = { approve: 'approved', reject: 'rejected', hide: 'hidden', restore: 'restored' }
    actionMessage.value = `“${job.title}” was ${verbs[action]}.`
    reviewAction.value = ''
    reviewReason.value = ''
    if (job.moderationStatus === 'PENDING' && action !== 'hide') {
      jobs.value = jobs.value.filter((item) => item.id !== job.id)
      total.value = Math.max(0, total.value - 1)
      expandedId.value = ''
    } else {
      const result = await listAdminJobs({ search: appliedSearch.value, moderationStatus: statusFilter.value, status: listingStatus.value, page: page.value })
      jobs.value = result.jobs
      total.value = result.total
      if (!result.jobs.some((item) => item.id === job.id)) expandedId.value = ''
    }
  } catch (cause) {
    actionError.value = cause instanceof Error ? cause.message : 'The moderation action could not be completed.'
  } finally {
    busyId.value = ''
  }
}

function dateLabel(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date)
}

function labelStatus(status: ModerationFilter) {
  return status.charAt(0) + status.slice(1).toLowerCase()
}

function changePage(nextPage: number) {
  page.value = nextPage
  void loadJobs()
}
</script>

<template>
  <AdminWorkspaceLayout
    v-model:search="search"
    title="Job moderation"
    search-label="Search jobs"
    search-placeholder="Search title or company"
    @search="applySearch"
  >
    <section class="jobs-page" aria-labelledby="jobs-heading">
      <div class="page-heading">
        <div>
          <p class="eyebrow">Content moderation</p>
          <h2 id="jobs-heading">Job posts</h2>
          <p>Review published listings, record reasons for decisions, and restore listings after review.</p>
        </div>
        <div class="record-total"><strong>{{ total.toLocaleString() }}</strong><span>{{ statusFilter.toLowerCase() }} posts</span></div>
      </div>

      <div class="toolbar">
        <label for="moderation-status">Review</label>
        <select id="moderation-status" v-model="statusFilter">
          <option value="ALL">All review states</option>
          <option value="PENDING">Pending review</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="HIDDEN">Hidden</option>
        </select>
        <label class="listing-filter" for="listing-status">Listing</label>
        <select id="listing-status" v-model="listingStatus">
          <option value="ALL">All listing states</option>
          <option value="PUBLISHED">Published</option>
          <option value="DRAFT">Draft</option>
          <option value="CLOSED">Closed</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <span class="queue-note"><i /> Decisions are recorded in the admin audit log.</span>
      </div>

      <p v-if="actionMessage" class="notice success" role="status">{{ actionMessage }}</p>
      <p v-if="actionError" class="notice error" role="alert">{{ actionError }}</p>
      <div v-if="loading" class="state-panel" role="status">Loading job posts…</div>
      <div v-else-if="loadError" class="state-panel error-state" role="alert">
        <strong>Job posts are unavailable</strong><span>{{ loadError }}</span><button type="button" @click="loadJobs">Try again</button>
      </div>
      <div v-else-if="!jobs.length" class="state-panel empty-state">
        <strong>No {{ statusFilter.toLowerCase() }} posts found</strong><span>Try another review status or change your search.</span>
      </div>
      <div v-else class="job-list" aria-label="Job moderation queue">
        <article v-for="job in jobs" :key="job.id" class="job-row" :class="{ expanded: expandedId === job.id }">
          <div class="job-main">
            <span class="job-mark"><UiIcon name="briefcase" :size="18" /></span>
            <div class="job-title"><strong>{{ job.title }}</strong><span>{{ job.company }}</span></div>
            <span class="job-location">{{ job.location }}</span>
            <span class="status-pill" :class="`status-${job.moderationStatus.toLowerCase()}`">{{ labelStatus(job.moderationStatus) }}</span>
            <button class="details-button" type="button" :aria-expanded="expandedId === job.id" @click="openReview(job)">
              {{ expandedId === job.id ? 'Close review' : 'Review post' }}<UiIcon name="chevron" :size="14" />
            </button>
          </div>
          <section v-if="expandedId === job.id" class="job-details" :aria-label="`${job.title} details`">
            <div class="job-meta"><span>{{ job.category || 'Uncategorized' }}</span><span>{{ job.industry || 'Industry not set' }}</span><span>{{ job.jobType.replaceAll('_', ' ').toLowerCase() }}</span><span>Updated {{ dateLabel(job.updatedAt) }}</span></div>
            <p v-if="job.companyProfile" class="company-status">
              <UiIcon name="building" :size="15" /> Company profile: {{ job.companyProfile.name }} · {{ job.companyProfile.isVerified ? 'Verified' : 'Unverified' }}
            </p>
            <p class="summary">{{ job.summary || 'No summary was provided.' }}</p>
            <p class="description">{{ job.description || 'No full description was provided.' }}</p>
            <div v-if="job.responsibilities.length || job.requirements.length || job.benefits.length || job.skills.length" class="job-content-grid">
              <section v-if="job.responsibilities.length"><h4>Responsibilities</h4><ul><li v-for="item in job.responsibilities" :key="item">{{ item }}</li></ul></section>
              <section v-if="job.requirements.length"><h4>Requirements</h4><ul><li v-for="item in job.requirements" :key="item">{{ item }}</li></ul></section>
              <section v-if="job.benefits.length"><h4>Benefits</h4><ul><li v-for="item in job.benefits" :key="item">{{ item }}</li></ul></section>
              <section v-if="job.skills.length"><h4>Skills</h4><ul><li v-for="item in job.skills" :key="item">{{ item }}</li></ul></section>
            </div>
            <p v-if="job.moderationNote" class="existing-reason"><strong>Previous decision reason:</strong> {{ job.moderationNote }}</p>
            <div v-if="job.moderationStatus === 'PENDING' || job.moderationStatus === 'APPROVED'" class="moderation-actions">
              <button v-if="job.moderationStatus === 'PENDING'" class="approve-button" type="button" :disabled="busyId === job.id" @click="mutate(job, 'approve')">Approve listing</button>
              <button v-if="job.moderationStatus === 'PENDING'" class="quiet-button" type="button" :disabled="busyId === job.id" @click="startReasonAction('reject')">Reject with reason</button>
              <button class="danger-button" type="button" :disabled="busyId === job.id" @click="startReasonAction('hide')">Hide listing</button>
            </div>
            <div v-else class="moderation-actions">
              <button class="approve-button" type="button" :disabled="busyId === job.id" @click="mutate(job, 'restore')">Restore listing</button>
            </div>
            <form v-if="reviewAction" class="reason-form" @submit.prevent="mutate(job, reviewAction)">
              <label :for="`job-reason-${job.id}`">{{ reviewAction === 'hide' ? 'Reason for hiding' : 'Reason for rejection' }}</label>
              <textarea :id="`job-reason-${job.id}`" v-model="reviewReason" minlength="3" maxlength="500" required :placeholder="reviewAction === 'hide' ? 'Explain why this listing is being hidden' : 'Explain what the employer needs to change'" />
              <div><button class="quiet-button" type="button" @click="reviewAction = ''">Cancel</button><button class="danger-button" type="submit" :disabled="busyId === job.id">{{ busyId === job.id ? 'Saving…' : `Confirm ${reviewAction}` }}</button></div>
            </form>
          </section>
        </article>
      </div>

      <nav v-if="pageCount > 1" class="pagination" aria-label="Job pages">
        <button type="button" :disabled="page <= 1" @click="changePage(page - 1)">Previous</button>
        <span>Page {{ page }} of {{ pageCount }}</span>
        <button type="button" :disabled="page >= pageCount" @click="changePage(page + 1)">Next</button>
      </nav>
    </section>
  </AdminWorkspaceLayout>
</template>

<style scoped>
.jobs-page { max-width: 1180px; margin: 5px auto 0; }
.page-heading { margin-bottom: 20px; display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; }
.eyebrow { margin: 0 0 8px; color: #6555bf; font-size: 12px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; }
.page-heading h2 { margin: 0; color: #19233c; font-size: clamp(29px, 3vw, 38px); font-weight: 600; letter-spacing: -.045em; }
.page-heading p:not(.eyebrow) { max-width: 63ch; margin: 7px 0 0; color: #657088; font-size: 13px; line-height: 1.5; }
.record-total { padding: 5px 0 2px 15px; border-left: 1px solid #dfe2e7; display: grid; gap: 2px; text-align: right; }
.record-total strong { color: #26334b; font-size: 23px; font-variant-numeric: tabular-nums; }
.record-total span { color: #7a8391; font-size: 11px; }
.toolbar { min-height: 59px; margin-bottom: 13px; padding: 10px 14px; border: 1px solid #e2e4e8; border-radius: 7px; display: flex; align-items: center; gap: 10px; background: #fff; }
.toolbar > label { color: #657088; font-size: 11px; font-weight: 500; }
.toolbar select { min-width: 150px; height: 34px; padding: 0 27px 0 9px; border: 1px solid #dfe2e7; border-radius: 5px; background: #fff; color: #35425a; font-size: 12px; }
.queue-note { margin-left: auto; display: inline-flex; align-items: center; gap: 7px; color: #768092; font-size: 10px; }
.queue-note i { width: 6px; height: 6px; border-radius: 50%; background: #5b9872; }
.job-list { border: 1px solid #e2e4e8; border-radius: 8px; overflow: hidden; background: #fff; }
.job-row + .job-row { border-top: 1px solid #e8eaee; }
.job-main { min-height: 74px; padding: 12px 16px; display: grid; grid-template-columns: 33px minmax(170px, 1fr) minmax(120px, .65fr) 91px auto; align-items: center; gap: 12px; }
.job-mark { width: 31px; height: 31px; border-radius: 7px; display: grid; place-items: center; background: #f2f1ed; color: #667183; }
.job-title { min-width: 0; display: grid; gap: 4px; }
.job-title strong, .job-title span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.job-title strong { color: #28354c; font-size: 13px; font-weight: 600; }
.job-title span, .job-location { color: #7a8391; font-size: 11px; }
.job-location { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.status-pill { width: fit-content; padding: 4px 6px; border-radius: 3px; background: #f5f3e9; color: #8a7440; font-size: 10px; font-weight: 600; }
.status-approved { background: #edf5ef; color: #377351; }
.status-rejected { background: #f8eeee; color: #9b4a50; }
.status-hidden { background: #eef0f4; color: #596478; }
.details-button { justify-self: end; padding: 7px 8px; border: 0; display: inline-flex; align-items: center; gap: 4px; background: transparent; color: #5d4db2; font-size: 11px; font-weight: 600; cursor: pointer; white-space: nowrap; }
.details-button :deep(.ui-icon) { transform: rotate(90deg); transition: transform 160ms ease; }
.expanded .details-button :deep(.ui-icon) { transform: rotate(-90deg); }
.job-details { padding: 17px 22px 19px 61px; border-top: 1px solid #eeeff2; background: #fbfbfa; }
.job-meta { display: flex; flex-wrap: wrap; gap: 7px; }
.job-meta span { padding: 4px 6px; background: #f0f1f3; color: #697487; font-size: 10px; }
.company-status { margin: 13px 0 0; display: flex; align-items: center; gap: 7px; color: #5f6c80; font-size: 11px; }
.summary { margin: 15px 0 0; color: #334158; font-size: 14px; font-weight: 600; line-height: 1.5; }
.description { max-width: 86ch; margin: 7px 0 0; color: #687487; font-size: 12px; line-height: 1.65; white-space: pre-wrap; }
.job-content-grid { margin-top: 15px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 13px 22px; }
.job-content-grid section { min-width: 0; }
.job-content-grid h4 { margin: 0 0 6px; color: #455168; font-size: 11px; font-weight: 600; }
.job-content-grid ul { margin: 0; padding-left: 17px; color: #6c7788; font-size: 11px; line-height: 1.55; }
.existing-reason { margin: 14px 0 0; padding: 9px 10px; background: #f3f1ea; color: #6e6242; font-size: 11px; line-height: 1.5; }
.moderation-actions { margin-top: 16px; display: flex; flex-wrap: wrap; gap: 7px; }
.approve-button, .quiet-button, .danger-button { min-height: 34px; padding: 0 11px; border: 1px solid #d8dce3; border-radius: 5px; background: #fff; color: #46536a; font-size: 11px; font-weight: 600; cursor: pointer; }
.approve-button { border-color: #d5e7dc; background: #f4faf6; color: #347250; }
.approve-button:hover:not(:disabled) { background: #eaf5ed; }
.quiet-button:hover:not(:disabled) { background: #f5f4fb; }
.danger-button { border-color: #ead1d3; color: #9a454e; }
.danger-button:hover:not(:disabled) { background: #fff6f6; }
button:disabled { opacity: .55; cursor: not-allowed; }
.reason-form { max-width: 620px; margin-top: 16px; display: grid; gap: 7px; }
.reason-form label { color: #586579; font-size: 11px; font-weight: 600; }
.reason-form textarea { min-height: 76px; padding: 9px 10px; border: 1px solid #d9dde4; border-radius: 5px; resize: vertical; color: #29364d; font-size: 12px; line-height: 1.5; }
.reason-form > div { display: flex; justify-content: flex-end; gap: 8px; }
.notice { margin: 0 0 12px; padding: 10px 12px; border-radius: 5px; font-size: 12px; }
.notice.success { background: #eff7f2; color: #347250; }
.notice.error, .error-state { background: #fff6f6; color: #994650; }
.state-panel { min-height: 138px; padding: 24px; border: 1px solid #e2e4e8; border-radius: 8px; display: grid; align-content: center; justify-items: center; gap: 8px; background: #fff; color: #707b8c; font-size: 13px; text-align: center; }
.state-panel strong { color: #35425a; font-size: 14px; }
.state-panel span { max-width: 48ch; font-size: 12px; line-height: 1.5; }
.state-panel button { margin-top: 3px; border: 0; background: transparent; color: #5d4db2; font-size: 12px; font-weight: 600; cursor: pointer; }
.pagination { margin-top: 15px; display: flex; align-items: center; justify-content: center; gap: 16px; color: #778194; font-size: 11px; }
.pagination button { min-height: 32px; padding: 0 9px; border: 1px solid #dde0e6; border-radius: 5px; background: #fff; color: #4b5870; font-size: 11px; cursor: pointer; }
.pagination button:disabled { opacity: .45; cursor: not-allowed; }
@media (max-width: 760px) {
  .job-main { grid-template-columns: 31px minmax(0, 1fr) auto; gap: 9px; }
  .job-location { grid-column: 2; grid-row: 2; }
  .status-pill { grid-column: 2; grid-row: 3; }
  .details-button { grid-column: 3; grid-row: 1 / span 3; }
  .job-details { padding: 16px; }
}
@media (max-width: 560px) {
  .page-heading { align-items: flex-start; }
  .record-total { padding-left: 10px; }
  .toolbar { align-items: flex-start; flex-wrap: wrap; }
  .queue-note { margin: 3px 0 0; flex-basis: 100%; }
  .moderation-actions > button { flex: 1 1 auto; }
}
</style>
