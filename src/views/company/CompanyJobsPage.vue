<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CompanyPageHeader from '@/components/company/CompanyPageHeader.vue'
import UiIcon from '@/components/company/UiIcon.vue'
import {
  companyJobs,
  companyJobsError,
  companyJobsLoading,
  createCompanyJob,
  loadCompanyJobs,
  updateCompanyJobStatus,
  type JobStatus,
  type JobType,
  type WorkplaceType,
} from '@/services/companyJobs'

const props = withDefaults(defineProps<{ search?: string }>(), { search: '' })
const route = useRoute()
const router = useRouter()
const selectedStatus = ref<'All' | JobStatus>('All')
const showComposer = ref(false)
const savedNotice = ref('')
const composerError = ref('')
const mutationError = ref('')
const saving = ref(false)
const busyJobId = ref('')
const form = reactive({ title: '', team: '', location: '', description: '', jobType: 'FULL_TIME' as JobType, workplaceType: 'ONSITE' as WorkplaceType })

watch(() => route.query.compose, value => { if (value === '1') showComposer.value = true }, { immediate: true })
onMounted(() => { void loadCompanyJobs().catch(() => undefined) })

const tabs = computed(() => [
  { label: 'All roles' as const, status: 'All' as const, count: companyJobs.value.length },
  { label: 'Published' as const, status: 'Published' as const, count: companyJobs.value.filter(job => job.status === 'Published').length },
  { label: 'Drafts' as const, status: 'Draft' as const, count: companyJobs.value.filter(job => job.status === 'Draft').length },
  { label: 'Closed' as const, status: 'Closed' as const, count: companyJobs.value.filter(job => job.status === 'Closed' || job.status === 'Archived').length },
])
const filteredJobs = computed(() => companyJobs.value.filter(job => {
  const statusMatches = selectedStatus.value === 'All'
    || job.status === selectedStatus.value
    || (selectedStatus.value === 'Closed' && job.status === 'Archived')
  const query = props.search.trim().toLocaleLowerCase()
  const textMatches = !query || `${job.title} ${job.team} ${job.location} ${job.status}`.toLocaleLowerCase().includes(query)
  return statusMatches && textMatches
}))
const activeJobCount = computed(() => companyJobs.value.filter(job => job.status === 'Published').length)

async function postJob() {
  if (saving.value) return
  composerError.value = ''
  savedNotice.value = ''
  saving.value = true
  try {
    await createCompanyJob({
      title: form.title.trim(),
      team: form.team.trim(),
      location: form.location.trim(),
      description: form.description.trim(),
      jobType: form.jobType,
      workplaceType: form.workplaceType,
    })
  } catch (cause) {
    composerError.value = cause instanceof Error ? cause.message : 'The draft could not be saved.'
    return
  } finally {
    saving.value = false
  }
  form.title = ''
  form.team = ''
  form.location = ''
  form.description = ''
  form.jobType = 'FULL_TIME'
  form.workplaceType = 'ONSITE'
  selectedStatus.value = 'Draft'
  savedNotice.value = 'Draft saved to your company workspace.'
  closeComposer()
}

function closeComposer() {
  showComposer.value = false
  if (route.query.compose) {
    const query = { ...route.query }
    delete query.compose
    void router.replace({ query })
  }
}

function nextStatus(status: JobStatus): JobStatus {
  if (status === 'Draft') return 'Published'
  if (status === 'Published') return 'Closed'
  return 'Published'
}

function actionLabel(status: JobStatus) {
  if (status === 'Draft') return 'Publish'
  if (status === 'Published') return 'Close role'
  if (status === 'Archived') return 'Archived'
  return 'Reopen'
}

async function changeStatus(id: string, status: JobStatus) {
  mutationError.value = ''
  busyJobId.value = id
  try {
    await updateCompanyJobStatus(id, status)
  } catch (cause) {
    mutationError.value = cause instanceof Error ? cause.message : 'The job status could not be changed.'
  } finally {
    busyJobId.value = ''
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value))
}
</script>

<template>
  <div class="company-page jobs-page">
    <CompanyPageHeader eyebrow="Workspace / Jobs" title="Jobs" description="Keep your open roles current and your hiring work in one place.">
      <template #actions>
        <button class="company-primary" type="button" @click="showComposer = true"><UiIcon name="plus" :size="17" /> Post a job</button>
      </template>
    </CompanyPageHeader>

    <p v-if="savedNotice" class="saved-notice" role="status">{{ savedNotice }}</p>
    <p v-if="mutationError" class="job-error" role="alert">{{ mutationError }}</p>
    <p v-if="companyJobsError && companyJobs.length" class="job-error refresh-error" role="alert">
      Could not refresh roles; showing the last server response. {{ companyJobsError }}
      <button type="button" @click="loadCompanyJobs(true).catch(() => undefined)">Try again</button>
    </p>
    <section class="jobs-overview" aria-label="Job posting summary">
      <div><strong>{{ activeJobCount }}</strong><span>published roles</span></div>
      <p>Roles and applicant totals sync with your company account. View counts are not tracked yet; publishing requires company approval.</p>
    </section>

    <section class="jobs-workspace" aria-label="Job postings">
      <div class="jobs-toolbar">
        <div class="jobs-tabs" role="group" aria-label="Filter jobs by status">
          <button v-for="tab in tabs" :key="tab.label" type="button" :aria-pressed="selectedStatus === tab.status" :class="{ active: selectedStatus === tab.status }" @click="selectedStatus = tab.status">
            {{ tab.label }} <span>{{ tab.count }}</span>
          </button>
        </div>
        <span class="result-count">{{ filteredJobs.length }} roles</span>
      </div>

      <div v-if="companyJobsLoading && !companyJobs.length" class="jobs-empty" role="status"><strong>Loading your roles…</strong><span>Getting the latest postings from your company account.</span></div>
      <div v-else-if="companyJobsError && !companyJobs.length" class="jobs-empty" role="alert"><strong>Your roles could not be loaded.</strong><span>{{ companyJobsError }}</span><button type="button" @click="loadCompanyJobs(true).catch(() => undefined)">Try again</button></div>
      <div v-else-if="filteredJobs.length" class="jobs-table-scroll">
        <table class="jobs-table">
          <thead><tr><th scope="col">Role</th><th scope="col">Location</th><th scope="col">Applicants</th><th scope="col" title="Job views are not tracked yet">Views</th><th scope="col">Status</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead>
          <tbody>
            <tr v-for="job in filteredJobs" :key="job.id">
              <td><div class="role-cell"><strong>{{ job.title }}</strong><span>{{ job.team }} · {{ job.status === 'Published' ? 'Posted' : 'Created' }} {{ formatDate(job.postedAt) }}</span></div></td>
              <td><div class="location-cell"><strong>{{ job.location }}</strong><span>{{ job.arrangement }}</span></div></td>
              <td class="number-cell">{{ job.applicants }}</td>
              <td class="number-cell" :aria-label="'Not tracked'">—</td>
              <td><span class="job-status" :class="`job-status-${job.status.toLowerCase()}`">{{ job.status }}</span></td>
              <td><button v-if="job.status !== 'Archived'" class="row-action" type="button" :disabled="busyJobId === job.id" :aria-label="`${actionLabel(job.status)}: ${job.title}`" @click="changeStatus(job.id, nextStatus(job.status))">{{ busyJobId === job.id ? 'Saving…' : actionLabel(job.status) }}</button><span v-else class="muted-action">—</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="jobs-empty"><strong>{{ companyJobsError ? 'Could not refresh your roles.' : 'No roles match this view.' }}</strong><span>{{ companyJobsError || 'Try another status or clear the search field.' }}</span><button v-if="companyJobsError" type="button" @click="loadCompanyJobs(true).catch(() => undefined)">Try again</button><button v-else type="button" @click="selectedStatus = 'All'">Show all roles</button></div>
    </section>

    <div v-if="showComposer" class="composer-backdrop" @click.self="closeComposer">
      <section class="job-composer" role="dialog" aria-modal="true" aria-labelledby="job-composer-title" @keydown.esc.prevent="closeComposer">
        <div class="composer-heading"><div><p>New listing</p><h3 id="job-composer-title">Create a job draft</h3></div><button class="close-composer" type="button" aria-label="Close form" @click="closeComposer"><UiIcon name="close" :size="18" /></button></div>
        <p class="composer-copy">Add the role description now so you can publish it once your company is approved.</p>
        <form class="job-form" @submit.prevent="postJob">
          <label>Job title<input v-model="form.title" required minlength="3" maxlength="80" placeholder="e.g. Product Designer" /></label>
          <label>Team<input v-model="form.team" maxlength="60" placeholder="e.g. Product & Design" /></label>
          <div class="form-row"><label>Location<input v-model="form.location" required minlength="2" maxlength="80" placeholder="City or region" /></label><label>Employment type<select v-model="form.jobType"><option value="FULL_TIME">Full-time</option><option value="PART_TIME">Part-time</option><option value="INTERNSHIP">Internship</option><option value="CONTRACT">Contract</option><option value="TEMPORARY">Temporary</option><option value="FREELANCE">Freelance</option></select></label></div>
          <label>Workplace<select v-model="form.workplaceType"><option value="ONSITE">On-site</option><option value="HYBRID">Hybrid</option><option value="REMOTE">Remote</option></select></label>
          <label>Job description<textarea v-model="form.description" required maxlength="20000" rows="5" placeholder="Describe the role, its responsibilities, and what success looks like." /></label>
          <p v-if="composerError" class="job-error composer-error" role="alert">{{ composerError }}</p>
          <div class="composer-actions"><button class="company-secondary" type="button" @click="closeComposer">Cancel</button><button class="company-primary" type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save draft' }}</button></div>
        </form>
      </section>
    </div>
  </div>
</template>

<style scoped>
.company-page { color: var(--ink); }
.company-primary, .company-secondary { min-height: 42px; padding: 0 15px; border: 1px solid transparent; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 160ms ease, border-color 160ms ease, transform 160ms ease; }
.company-primary { background: var(--accent); color: #fff; box-shadow: 0 7px 18px rgb(123 102 255 / 18%); }
.company-primary:hover { background: #6f5cf9; transform: translateY(-1px); }
.company-secondary { border-color: var(--line); background: #fff; color: var(--ink-soft); }
.company-secondary:hover { border-color: var(--line-strong); background: var(--accent-soft); }
.saved-notice { margin: -12px 0 18px; color: #267554; font-size: 14px; }
.job-error { margin: -12px 0 18px; color: #a03f53; font-size: 13px; }
.composer-error { margin: 0; }
.jobs-overview { min-height: 88px; margin-bottom: 25px; padding: 18px 22px; border: 1px solid var(--line); border-radius: 10px; display: flex; align-items: center; gap: 24px; background: #fff; }
.jobs-overview > div { min-width: 138px; display: grid; grid-template-columns: auto 1fr; align-items: baseline; gap: 9px; }
.jobs-overview strong { color: var(--ink); font-size: 29px; font-weight: 600; font-variant-numeric: tabular-nums; letter-spacing: -.04em; }
.jobs-overview span { color: var(--muted); font-size: 13px; }
.jobs-overview p { margin: 0; padding-left: 24px; border-left: 1px solid var(--line); color: var(--muted); font-size: 14px; line-height: 1.6; }
.jobs-workspace { border: 1px solid var(--line); border-radius: 11px; overflow: hidden; background: #fff; box-shadow: 0 8px 24px rgb(11 43 130 / 4%); }
.jobs-toolbar { min-height: 61px; padding: 0 22px; border-bottom: 1px solid var(--line); display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.jobs-tabs { min-width: 0; align-self: stretch; display: flex; align-items: stretch; gap: 25px; overflow-x: auto; overflow-y: hidden; scrollbar-width: none; -ms-overflow-style: none; overscroll-behavior-x: contain; }
.jobs-tabs::-webkit-scrollbar { display: none; width: 0; height: 0; }
.jobs-tabs button { position: relative; padding: 0; border: 0; display: inline-flex; align-items: center; gap: 7px; background: transparent; color: #7581a4; font-size: 13px; white-space: nowrap; cursor: pointer; }
.jobs-tabs button.active { color: var(--ink); font-weight: 600; }
.jobs-tabs button.active::after { position: absolute; right: 0; bottom: -1px; left: 0; height: 2px; background: var(--accent); content: ''; }
.jobs-tabs button span { min-width: 20px; padding: 2px 5px; border-radius: 4px; background: #f3f1ff; color: #6654d8; text-align: center; font-size: 11px; font-variant-numeric: tabular-nums; }
.result-count { color: var(--muted); font-size: 13px; white-space: nowrap; }
.jobs-table-scroll { overflow-x: auto; }
.jobs-table { width: 100%; border-collapse: collapse; text-align: left; }
.jobs-table th { height: 43px; padding: 0 18px; background: #fcfbff; color: #7783a5; font-size: 12px; font-weight: 600; white-space: nowrap; }
.jobs-table td { height: 69px; padding: 9px 18px; border-top: 1px solid #efedfa; color: var(--ink-soft); font-size: 13px; white-space: nowrap; }
.role-cell, .location-cell { display: grid; gap: 4px; }
.role-cell strong, .location-cell strong { color: var(--ink); font-size: 14px; font-weight: 600; }
.role-cell span, .location-cell span { color: var(--muted); font-size: 12px; }
.number-cell { font-variant-numeric: tabular-nums; }
.job-status { display: inline-flex; padding: 5px 8px; border-radius: 5px; font-size: 11px; font-weight: 600; }
.job-status-published { background: #eaf7f0; color: #26734d; }
.job-status-draft { background: #fff5df; color: #86631f; }
.job-status-closed { background: #f1f2f7; color: #59617a; }
.job-status-archived { background: #f2f0ee; color: #756d63; }
.row-action { padding: 6px 0 6px 8px; border: 0; background: transparent; color: #6654d8; font-size: 12px; font-weight: 600; cursor: pointer; }
.row-action:disabled { color: #9298a8; cursor: wait; }
.muted-action { padding-left: 8px; color: var(--muted); }
.row-action:hover { color: #4936bd; text-decoration: underline; }
.jobs-empty { min-height: 210px; display: grid; place-content: center; justify-items: center; gap: 8px; text-align: center; }
.jobs-empty strong { font-size: 16px; }
.jobs-empty span { color: var(--muted); font-size: 14px; }
.jobs-empty button { margin-top: 5px; border: 0; background: none; color: #6654d8; font-size: 14px; font-weight: 600; cursor: pointer; }
.composer-backdrop { position: fixed; inset: 0; z-index: 80; padding: 20px; display: grid; place-items: center; background: rgb(11 26 72 / 42%); backdrop-filter: blur(3px); }
.job-composer { width: min(100%, 560px); max-height: calc(100dvh - 40px); overflow-y: auto; overscroll-behavior: contain; padding: 27px; border: 1px solid var(--line); border-radius: 14px; background: #fff; box-shadow: 0 24px 70px rgb(11 43 130 / 20%); }
.composer-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
.composer-heading p { margin: 0 0 5px; color: #6654d8; font-size: 13px; font-weight: 600; }
.composer-heading h3 { margin: 0; color: var(--ink); font-size: 24px; letter-spacing: -.03em; }
.close-composer { width: 32px; height: 32px; border: 1px solid var(--line); border-radius: 7px; display: grid; place-items: center; background: #fff; color: var(--ink-soft); cursor: pointer; }
.close-composer:hover { background: var(--accent-soft); color: var(--accent-dark); }
.composer-copy { margin: 12px 0 21px; color: var(--muted); font-size: 14px; line-height: 1.6; }
.job-form { display: grid; gap: 15px; }
.job-form label { display: grid; gap: 7px; color: #52669e; font-size: 13px; font-weight: 600; }
.job-form input, .job-form select, .job-form textarea { width: 100%; min-height: 42px; padding: 0 12px; border: 1px solid #dcd7f1; border-radius: 7px; background: #fff; color: var(--ink); font-size: 14px; outline: 0; }
.job-form textarea { min-height: 120px; padding-top: 10px; resize: vertical; line-height: 1.5; }
.job-form input:focus, .job-form select:focus, .job-form textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgb(123 102 255 / 12%); }
.job-form input::placeholder { color: #9aa4c2; font-weight: 400; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.composer-actions { margin-top: 8px; display: flex; justify-content: flex-end; gap: 9px; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
@media (max-width: 760px) {
  .jobs-overview { align-items: flex-start; flex-direction: column; gap: 11px; }
  .jobs-overview p { padding: 0; border: 0; }
  .jobs-table-scroll { overflow: visible; }
  .jobs-table { display: block; min-width: 0; }
  .jobs-table thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; }
  .jobs-table tbody { display: grid; }
  .jobs-table tr { padding: 8px 16px 12px; border-top: 1px solid var(--line); display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 0 16px; }
  .jobs-table td { min-width: 0; height: auto; padding: 9px 0; border: 0; display: grid; align-content: start; gap: 5px; white-space: normal; }
  .jobs-table td:first-child { grid-column: 1 / -1; padding-bottom: 5px; }
  .jobs-table td:nth-child(2) { grid-column: 1 / -1; }
  .jobs-table td:nth-child(3)::before, .jobs-table td:nth-child(4)::before, .jobs-table td:nth-child(5)::before { color: var(--muted); font-size: 12px; font-weight: 600; }
  .jobs-table td:nth-child(2)::before { color: var(--muted); font-size: 12px; font-weight: 600; content: 'Location'; }
  .jobs-table td:nth-child(3)::before { content: 'Applicants'; }
  .jobs-table td:nth-child(4)::before { content: 'Views'; }
  .jobs-table td:nth-child(5)::before { content: 'Status'; }
  .jobs-table td:nth-child(6) { grid-column: 2; justify-self: end; align-self: center; align-content: center; padding-top: 0; }
}
@media (max-width: 540px) { .jobs-toolbar { align-items: flex-start; flex-direction: column; padding: 13px 16px 0; } .jobs-tabs { width: 100%; min-height: 39px; gap: 19px; } .result-count { align-self: flex-end; margin: 0 0 10px; } .job-composer { padding: 22px 18px; } .form-row { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition-duration: .01ms !important; } }
</style>
