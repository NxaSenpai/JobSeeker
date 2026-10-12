<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CompanyPageHeader from '@/components/company/CompanyPageHeader.vue'
import UiIcon from '@/components/company/UiIcon.vue'
import {
  companyJobs,
  companyJobsError,
  companyJobsLoading,
  archiveCompanyJob,
  createCompanyJob,
  deleteCompanyJob,
  loadCompanyJobs,
  restoreCompanyJob,
  updateCompanyJobStatus,
  type JobStatus,
  type CompanyJob,
  type JobType,
  type WorkplaceType,
} from '@/services/companyJobs'

const props = withDefaults(defineProps<{ search?: string }>(), { search: '' })
const route = useRoute()
const router = useRouter()
const selectedStatus = ref<'All' | JobStatus>('All')
const selectedJob = ref<CompanyJob | null>(null)
const jobPendingDeletion = ref<CompanyJob | null>(null)
const deleteConfirmDialog = ref<HTMLDialogElement | null>(null)
const deleteDialogError = ref('')
const showComposer = ref(false)
const savedNotice = ref('')
const composerError = ref('')
const mutationError = ref('')
const saving = ref(false)
const busyJobId = ref('')
const form = reactive({
  title: '',
  team: '',
  location: '',
  country: '',
  city: '',
  address: '',
  category: '',
  industry: '',
  summary: '',
  description: '',
  jobType: 'FULL_TIME' as JobType,
  workplaceType: 'ONSITE' as WorkplaceType,
  salaryMin: '' as number | '',
  salaryMax: '' as number | '',
  currency: 'USD',
  salaryPeriod: 'YEAR' as 'HOUR' | 'MONTH' | 'YEAR',
  experienceLevel: '',
  minExperienceYears: '' as number | '',
  educationLevel: '',
  vacancies: 1,
  deadline: '',
  responsibilities: '',
  requirements: '',
  benefits: '',
  skills: [] as string[],
})
const skillInput = ref('')

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

function splitList(value: string) {
  return [...new Set(value.split(/\r?\n/).map(item => item.trim()).filter(Boolean))]
}

function addSkills() {
  const incoming: string[] = []
  for (const item of skillInput.value.split(',')) {
    const skill = item.trim()
    if (skill && !incoming.some(existing => existing.toLowerCase() === skill.toLowerCase())) incoming.push(skill)
  }
  if (incoming.some(skill => skill.length > 80)) {
    composerError.value = 'Each skill tag can be up to 80 characters.'
    return
  }
  const additions = incoming.filter(skill => !form.skills.some(existing => existing.toLowerCase() === skill.toLowerCase()))
  if (form.skills.length + additions.length > 40) {
    composerError.value = 'A job can have up to 40 skill tags. Remove a tag before adding more.'
    return
  }
  form.skills.push(...additions)
  skillInput.value = ''
  composerError.value = ''
}

function removeSkill(skill: string) {
  form.skills = form.skills.filter(item => item !== skill)
}

async function postJob() {
  if (saving.value) return
  composerError.value = ''
  savedNotice.value = ''
  if (form.salaryMin !== '' && form.salaryMax !== '' && form.salaryMax < form.salaryMin) {
    composerError.value = 'Maximum salary must be greater than or equal to minimum salary.'
    return
  }
  const responsibilities = splitList(form.responsibilities)
  const requirements = splitList(form.requirements)
  const benefits = splitList(form.benefits)
  const lists = [
    { label: 'Responsibilities', items: responsibilities, maximumLength: 1000 },
    { label: 'Requirements', items: requirements, maximumLength: 1000 },
    { label: 'Benefits', items: benefits, maximumLength: 500 },
  ]
  const invalidList = lists.find(({ items, maximumLength }) => items.length > 30 || items.some(item => item.length > maximumLength))
  if (invalidList) {
    composerError.value = `${invalidList.label} can contain up to 30 lines, with no line over ${invalidList.maximumLength} characters.`
    return
  }
  saving.value = true
  try {
    await createCompanyJob({
      title: form.title.trim(),
      team: form.team.trim() || undefined,
      location: form.location.trim(),
      country: form.country.trim() || undefined,
      city: form.city.trim() || undefined,
      address: form.address.trim() || undefined,
      category: form.category.trim() || undefined,
      industry: form.industry.trim() || undefined,
      summary: form.summary.trim() || undefined,
      description: form.description.trim(),
      jobType: form.jobType,
      workplaceType: form.workplaceType,
      responsibilities,
      requirements,
      benefits,
      skills: [...form.skills],
      salaryMin: form.salaryMin === '' ? null : Number(form.salaryMin),
      salaryMax: form.salaryMax === '' ? null : Number(form.salaryMax),
      currency: form.currency,
      salaryPeriod: form.salaryPeriod,
      experienceLevel: form.experienceLevel || undefined,
      minExperienceYears: form.minExperienceYears === '' ? null : Number(form.minExperienceYears),
      educationLevel: form.educationLevel || undefined,
      vacancies: Number(form.vacancies),
      deadline: form.deadline ? `${form.deadline}T23:59:59.000Z` : null,
    })
  } catch (cause) {
    composerError.value = cause instanceof Error ? cause.message : 'The draft could not be saved.'
    return
  } finally {
    saving.value = false
  }
  Object.assign(form, {
    title: '', team: '', location: '', country: '', city: '', address: '',
    category: '', industry: '', summary: '', description: '',
    jobType: 'FULL_TIME', workplaceType: 'ONSITE', salaryMin: '', salaryMax: '',
    currency: 'USD', salaryPeriod: 'YEAR', experienceLevel: '',
    minExperienceYears: '', educationLevel: '', vacancies: 1, deadline: '',
    responsibilities: '', requirements: '', benefits: '', skills: [],
  })
  skillInput.value = ''
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

function viewJob(job: CompanyJob) {
  selectedJob.value = job
}

function deletionDetail(job: CompanyJob) {
  const linkedApplications = job.applicants > 0
    ? ` and ${job.applicants} linked application${job.applicants === 1 ? '' : 's'} with their interview, message, and note history`
    : ''
  return `${linkedApplications}`
}

function requestDelete(job: CompanyJob) {
  if (busyJobId.value) return
  deleteDialogError.value = ''
  jobPendingDeletion.value = job
  void nextTick(() => {
    if (deleteConfirmDialog.value && !deleteConfirmDialog.value.open) {
      deleteConfirmDialog.value.showModal()
    }
  })
}

function cancelDelete() {
  if (busyJobId.value) return
  if (deleteConfirmDialog.value?.open) deleteConfirmDialog.value.close()
  jobPendingDeletion.value = null
  deleteDialogError.value = ''
}

async function confirmDelete() {
  const job = jobPendingDeletion.value
  if (!job || busyJobId.value) return
  mutationError.value = ''
  savedNotice.value = ''
  deleteDialogError.value = ''
  busyJobId.value = job.id
  try {
    const removedApplications = await deleteCompanyJob(job.id)
    savedNotice.value = removedApplications
      ? `“${job.title}” and ${removedApplications} application${removedApplications === 1 ? '' : 's'} were deleted.`
      : `“${job.title}” was deleted.`
    if (selectedJob.value?.id === job.id) selectedJob.value = null
    if (deleteConfirmDialog.value?.open) deleteConfirmDialog.value.close()
    jobPendingDeletion.value = null
  } catch (cause) {
    deleteDialogError.value = cause instanceof Error ? cause.message : 'The job could not be deleted.'
  } finally {
    busyJobId.value = ''
  }
}

async function archiveJob(job: CompanyJob) {
  if (busyJobId.value) return
  mutationError.value = ''
  savedNotice.value = ''
  busyJobId.value = job.id
  try {
    await archiveCompanyJob(job.id)
    savedNotice.value = `“${job.title}” was archived. Its application history is preserved.`
  } catch (cause) {
    mutationError.value = cause instanceof Error ? cause.message : 'The job could not be archived.'
  } finally {
    busyJobId.value = ''
  }
}

async function restoreJob(job: CompanyJob) {
  if (busyJobId.value) return
  mutationError.value = ''
  savedNotice.value = ''
  busyJobId.value = job.id
  try {
    await restoreCompanyJob(job.id)
    savedNotice.value = `“${job.title}” was restored as closed. Reopen it when you’re ready to publish it again.`
  } catch (cause) {
    mutationError.value = cause instanceof Error ? cause.message : 'The job could not be restored.'
  } finally {
    busyJobId.value = ''
  }
}

function formatSalary(job: CompanyJob) {
  if (job.salaryMin === null && job.salaryMax === null) return 'Salary not listed'
  const currency = /^[A-Z]{3}$/.test(job.currency) ? job.currency : 'USD'
  const formatter = new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 })
  const minimum = job.salaryMin === null ? null : formatter.format(job.salaryMin)
  const maximum = job.salaryMax === null ? null : formatter.format(job.salaryMax)
  const range = minimum && maximum ? `${minimum} – ${maximum}` : minimum ?? `Up to ${maximum}`
  return `${range} / ${job.salaryPeriod.toLowerCase()}`
}

function formatDeadline(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Not set' : new Intl.DateTimeFormat('en', { year: 'numeric', month: 'short', day: 'numeric' }).format(date)
}

function formatExperienceLevel(value: string) {
  return value.toLowerCase().split('_').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
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
              <td><div class="role-cell"><button class="role-view-button" type="button" @click="viewJob(job)">{{ job.title }}</button><span>{{ job.team }} · {{ job.status === 'Published' ? 'Posted' : 'Created' }} {{ formatDate(job.postedAt) }}</span><div class="role-cell-actions"><button class="row-action job-row-action job-row-action-view" type="button" @click="viewJob(job)"><UiIcon name="eye" :size="14" />View details</button><button class="row-action job-row-action job-row-action-delete" type="button" :disabled="busyJobId !== ''" @click="requestDelete(job)"><UiIcon name="trash" :size="14" />Delete</button><button v-if="job.applicants > 0 && job.status !== 'Archived'" class="row-action" type="button" :disabled="busyJobId !== ''" @click="archiveJob(job)">{{ busyJobId === job.id ? 'Saving…' : 'Archive instead' }}</button></div></div></td>
              <td><div class="location-cell"><strong>{{ job.location }}</strong><span>{{ job.arrangement }}</span></div></td>
              <td class="number-cell">{{ job.applicants }}</td>
              <td class="number-cell" :aria-label="'Not tracked'">—</td>
              <td><span class="job-status" :class="`job-status-${job.status.toLowerCase()}`">{{ job.status }}</span></td>
              <td class="actions-cell"><button v-if="job.status === 'Archived'" class="status-action status-action-restore" type="button" :disabled="busyJobId !== ''" :aria-label="`Restore archived job: ${job.title}`" @click="restoreJob(job)"><span>{{ busyJobId === job.id ? 'Restoring…' : 'Restore' }}</span></button><button v-else class="status-action" :class="`status-action-${job.status.toLowerCase()}`" type="button" :disabled="busyJobId !== ''" :aria-label="`${actionLabel(job.status)}: ${job.title}`" @click="changeStatus(job.id, nextStatus(job.status))"><span>{{ busyJobId === job.id ? 'Saving…' : actionLabel(job.status) }}</span></button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="jobs-empty"><strong>{{ companyJobsError ? 'Could not refresh your roles.' : 'No roles match this view.' }}</strong><span>{{ companyJobsError || 'Try another status or clear the search field.' }}</span><button v-if="companyJobsError" type="button" @click="loadCompanyJobs(true).catch(() => undefined)">Try again</button><button v-else type="button" @click="selectedStatus = 'All'">Show all roles</button></div>
    </section>

    <div v-if="selectedJob" class="job-view-backdrop" @click.self="selectedJob = null">
      <section class="job-view-dialog" role="dialog" aria-modal="true" aria-labelledby="job-view-title" @keydown.esc.prevent="selectedJob = null">
        <header class="job-view-header">
          <div><p>Job preview</p><h3 id="job-view-title">{{ selectedJob.title }}</h3><span>{{ selectedJob.team }} · {{ selectedJob.location }}</span></div>
          <button class="close-composer" type="button" aria-label="Close job preview" @click="selectedJob = null"><UiIcon name="close" :size="18" /></button>
        </header>
        <p v-if="selectedJob.summary" class="job-view-summary">{{ selectedJob.summary }}</p>
        <div class="job-view-layout">
          <main class="job-view-main">
            <section class="job-view-section"><h4>Job description</h4><p>{{ selectedJob.description || 'No job description has been added.' }}</p></section>
            <section v-if="selectedJob.skills.length" class="job-view-section"><h4>Skills and tags</h4><div class="job-view-tags"><span v-for="skill in selectedJob.skills" :key="skill">{{ skill }}</span></div></section>
            <section v-if="selectedJob.responsibilities.length" class="job-view-section"><h4>What you'll do</h4><ul><li v-for="item in selectedJob.responsibilities" :key="item">{{ item }}</li></ul></section>
            <section v-if="selectedJob.requirements.length" class="job-view-section"><h4>What you'll bring</h4><ul><li v-for="item in selectedJob.requirements" :key="item">{{ item }}</li></ul></section>
            <section v-if="selectedJob.benefits.length" class="job-view-section"><h4>Benefits</h4><ul><li v-for="item in selectedJob.benefits" :key="item">{{ item }}</li></ul></section>
          </main>
          <aside class="job-view-facts">
            <h4>Role details</h4>
            <dl>
              <div><dt>Salary</dt><dd>{{ formatSalary(selectedJob) }}</dd></div>
              <div><dt>Employment</dt><dd>{{ selectedJob.arrangement }}</dd></div>
              <div v-if="selectedJob.category"><dt>Category</dt><dd>{{ selectedJob.category }}</dd></div>
              <div v-if="selectedJob.industry"><dt>Industry</dt><dd>{{ selectedJob.industry }}</dd></div>
              <div v-if="selectedJob.experienceLevel"><dt>Experience level</dt><dd>{{ formatExperienceLevel(selectedJob.experienceLevel) }}</dd></div>
              <div v-if="selectedJob.minExperienceYears !== null"><dt>Minimum experience</dt><dd>{{ selectedJob.minExperienceYears }}+ years</dd></div>
              <div v-if="selectedJob.educationLevel"><dt>Education</dt><dd>{{ selectedJob.educationLevel }}</dd></div>
              <div><dt>Openings</dt><dd>{{ selectedJob.vacancies }}</dd></div>
              <div v-if="selectedJob.city || selectedJob.country"><dt>City / country</dt><dd>{{ [selectedJob.city, selectedJob.country].filter(Boolean).join(', ') }}</dd></div>
              <div v-if="selectedJob.address"><dt>Address</dt><dd>{{ selectedJob.address }}</dd></div>
              <div v-if="selectedJob.deadline"><dt>Apply by</dt><dd>{{ formatDeadline(selectedJob.deadline) }}</dd></div>
              <div><dt>Status</dt><dd>{{ selectedJob.status }}</dd></div>
            </dl>
          </aside>
        </div>
      </section>
    </div>

    <Teleport to="body">
      <dialog v-if="jobPendingDeletion" ref="deleteConfirmDialog" class="delete-confirm-dialog" aria-labelledby="delete-confirm-title" aria-describedby="delete-confirm-description" @cancel.prevent="cancelDelete">
          <div class="delete-confirm-icon" aria-hidden="true">!</div>
          <p class="delete-confirm-eyebrow">Permanent deletion</p>
          <h3 id="delete-confirm-title">Delete this job?</h3>
          <p id="delete-confirm-description" class="delete-confirm-copy">“{{ jobPendingDeletion.title }}” will be permanently removed from your company dashboard.</p>
          <p class="delete-confirm-detail">{{ deletionDetail(jobPendingDeletion) }}</p>
          <p v-if="deleteDialogError" class="delete-confirm-error" role="alert">{{ deleteDialogError }}</p>
          <div class="delete-confirm-actions">
            <button class="delete-confirm-cancel" type="button" autofocus :disabled="busyJobId !== ''" @click="cancelDelete">No, keep job</button>
            <button class="delete-confirm-submit" type="button" :disabled="busyJobId !== ''" @click="confirmDelete">{{ busyJobId ? 'Deleting…' : 'Yes, delete' }}</button>
          </div>
      </dialog>
    </Teleport>

    <div v-if="showComposer" class="composer-backdrop" @click.self="closeComposer">
      <section class="job-composer" role="dialog" aria-modal="true" aria-labelledby="job-composer-title" @keydown.esc.prevent="closeComposer">
        <div class="composer-heading"><div><p>New listing</p><h3 id="job-composer-title">Create a job draft</h3></div><button class="close-composer" type="button" aria-label="Close form" @click="closeComposer"><UiIcon name="close" :size="18" /></button></div>
        <p class="composer-copy">Add the role description now so you can publish it once your company is approved.</p>
        <form class="job-form" @submit.prevent="postJob">
          <section class="composer-section">
            <h4>Role details</h4>
            <label>Job title<input v-model="form.title" required minlength="3" maxlength="200" placeholder="e.g. Product Designer" /></label>
            <div class="form-row"><label>Team<input v-model="form.team" maxlength="120" placeholder="e.g. Product & Design" /></label><label>Category<input v-model="form.category" maxlength="120" placeholder="e.g. Design" /></label></div>
            <div class="form-row"><label>Industry<input v-model="form.industry" maxlength="120" placeholder="e.g. Software" /></label><label>Employment type<select v-model="form.jobType"><option value="FULL_TIME">Full-time</option><option value="PART_TIME">Part-time</option><option value="INTERNSHIP">Internship</option><option value="CONTRACT">Contract</option><option value="TEMPORARY">Temporary</option><option value="FREELANCE">Freelance</option></select></label></div>
            <div class="form-row"><label>Workplace<select v-model="form.workplaceType"><option value="ONSITE">On-site</option><option value="HYBRID">Hybrid</option><option value="REMOTE">Remote</option></select></label><label>Number of openings<input v-model.number="form.vacancies" type="number" min="1" max="10000" required /></label></div>
            <div class="form-row"><label>City<input v-model="form.city" maxlength="100" placeholder="e.g. Phnom Penh" /></label><label>Country<input v-model="form.country" maxlength="100" placeholder="e.g. Cambodia" /></label></div>
            <label>Location<input v-model="form.location" required minlength="2" maxlength="200" placeholder="City, region, or Remote" /></label>
            <label>Street address <span class="optional-label">(optional)</span><input v-model="form.address" maxlength="240" placeholder="Office address or area" /></label>
            <label>Short summary<textarea v-model="form.summary" maxlength="500" rows="2" placeholder="A concise introduction shown on job cards." /></label>
          </section>

          <section class="composer-section">
            <h4>Compensation</h4>
            <div class="form-triple-row"><label>Minimum salary<input v-model.number="form.salaryMin" type="number" min="0" step="0.01" placeholder="e.g. 50000" /></label><label>Maximum salary<input v-model.number="form.salaryMax" type="number" min="0" step="0.01" placeholder="e.g. 70000" /></label><label>Currency<input v-model="form.currency" required maxlength="3" minlength="3" pattern="[A-Za-z]{3}" placeholder="USD" /></label></div>
            <label>Pay period<select v-model="form.salaryPeriod"><option value="HOUR">Per hour</option><option value="MONTH">Per month</option><option value="YEAR">Per year</option></select></label>
          </section>

          <section class="composer-section">
            <h4>Experience and education</h4>
            <div class="form-row"><label>Experience level<select v-model="form.experienceLevel"><option value="">Not specified</option><option value="ENTRY_LEVEL">Entry level</option><option value="JUNIOR">Junior</option><option value="MID_LEVEL">Mid level</option><option value="SENIOR">Senior</option><option value="LEAD">Lead</option><option value="EXECUTIVE">Executive</option></select></label><label>Minimum years of experience<input v-model.number="form.minExperienceYears" type="number" min="0" max="80" placeholder="e.g. 3" /></label></div>
            <label>Education level<input v-model="form.educationLevel" maxlength="100" placeholder="e.g. Bachelor's degree or equivalent experience" /></label>
            <label>Application deadline<input v-model="form.deadline" type="date" /></label>
          </section>

          <section class="composer-section">
            <h4>Job description</h4>
            <label>Role overview<textarea v-model="form.description" required maxlength="20000" rows="5" placeholder="Describe the role, its responsibilities, and what success looks like." /></label>
            <label>What you'll do <span class="optional-label">(one per line)</span><textarea v-model="form.responsibilities" maxlength="10000" rows="4" placeholder="Lead the product design process&#10;Collaborate with engineering and research" /></label>
            <label>What you'll bring <span class="optional-label">(one per line)</span><textarea v-model="form.requirements" maxlength="10000" rows="4" placeholder="3+ years of relevant experience&#10;Strong communication skills" /></label>
            <label>Benefits <span class="optional-label">(one per line)</span><textarea v-model="form.benefits" maxlength="5000" rows="3" placeholder="Health coverage&#10;Flexible working" /></label>
          </section>

          <section class="composer-section">
            <h4>Skills and tags</h4>
            <label>Skill tags <span class="optional-label">{{ form.skills.length }}/40 tags · up to 80 characters each</span></label>
            <div class="tag-input-row"><input v-model="skillInput" maxlength="400" placeholder="Type skills separated by commas" @keydown.enter.prevent="addSkills" /><button class="company-secondary" type="button" @click="addSkills">Add</button></div>
            <div v-if="form.skills.length" class="skill-tags" aria-label="Added skill tags"><span v-for="skill in form.skills" :key="skill" class="skill-tag">{{ skill }}<button type="button" :aria-label="`Remove ${skill}`" @click="removeSkill(skill)">×</button></span></div>
          </section>
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
.role-view-button { width: fit-content; max-width: 100%; padding: 0; border: 0; background: transparent; color: var(--ink); font-size: 14px; font-weight: 600; text-align: left; cursor: pointer; }
.role-view-button:hover { color: var(--accent-dark); text-decoration: underline; }
.role-cell span, .location-cell span { color: var(--muted); font-size: 12px; }
.role-cell-actions { margin-top: 5px; display: flex; flex-wrap: wrap; align-items: center; gap: 7px; white-space: normal; }
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
.row-action-danger { color: #a03f53; }
.row-action-danger:hover { color: #7d2439; }
.job-row-action { min-height: 31px; padding: 0 9px; border: 1px solid var(--line); border-radius: 7px; display: inline-flex; align-items: center; gap: 6px; background: var(--surface-raised); font-size: 11px; line-height: 1; text-decoration: none; transition: border-color 150ms ease, background-color 150ms ease, color 150ms ease, transform 150ms ease; }
.job-row-action:hover { text-decoration: none; transform: translateY(-1px); }
.job-row-action-view { border-color: #ddd7fa; background: #f7f5ff; color: #5947bf; }
.job-row-action-view:hover { border-color: #c7bcf6; background: #efebff; color: #4633a9; }
.job-row-action-delete { border-color: #f0d3d8; background: #fff8f8; color: #a03f53; }
.job-row-action-delete:hover { border-color: #e9aeb8; background: #fff0f2; color: #842d40; }
.job-row-action:disabled { opacity: .6; cursor: wait; transform: none; }
:global(.company-shell.theme-dark .job-row-action-view) { border-color: var(--line-strong); background: var(--accent-soft); color: var(--accent-dark); }
:global(.company-shell.theme-dark .job-row-action-view:hover) { border-color: var(--accent-dark); background: #373050; color: #d7ceff; }
:global(.company-shell.theme-dark .job-row-action-delete) { border-color: #613b48; background: #30212a; color: #ffabb8; }
:global(.company-shell.theme-dark .job-row-action-delete:hover) { border-color: #9b5262; background: #432630; color: #ffd2d8; }
.status-action { min-height: 33px; padding: 0 11px; border: 1px solid transparent; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; gap: 7px; font-size: 11px; font-weight: 650; line-height: 1; white-space: nowrap; cursor: pointer; transition: border-color 150ms ease, background-color 150ms ease, color 150ms ease, transform 150ms ease; }
.status-action::before { width: 6px; height: 6px; border-radius: 50%; background: currentColor; content: ''; }
.status-action:hover:not(:disabled) { transform: translateY(-1px); }
.status-action:focus-visible { outline: 3px solid rgb(106 86 207 / 28%); outline-offset: 2px; }
.status-action:disabled { opacity: .58; cursor: wait; transform: none; }
.status-action-draft { border-color: #d8d0fa; background: #f5f2ff; color: #5845bd; }
.status-action-draft:hover:not(:disabled) { border-color: #bfb2f3; background: #eeeaff; }
.status-action-published { border-color: #efd9b7; background: #fff8ec; color: #8a6120; }
.status-action-published:hover:not(:disabled) { border-color: #e6c58f; background: #fff1d9; }
.status-action-closed { border-color: #cbe6d4; background: #f0f8f2; color: #28714b; }
.status-action-closed:hover:not(:disabled) { border-color: #aad6ba; background: #e5f4e9; }
.status-action-restore { border-color: #d8d4e5; background: #f0eef7; color: #514775; }
.status-action-restore:hover:not(:disabled) { border-color: #b9afd9; background: #e7e2f4; }
:global(.company-shell.theme-dark .status-action-draft) { border-color: #554a7a; background: #302b46; color: #c5b9ff; }
:global(.company-shell.theme-dark .status-action-draft:hover:not(:disabled)) { border-color: #7666ae; background: #393250; }
:global(.company-shell.theme-dark .status-action-published) { border-color: #69543a; background: #332b20; color: #f0c982; }
:global(.company-shell.theme-dark .status-action-published:hover:not(:disabled)) { border-color: #8b7049; background: #3b3123; }
:global(.company-shell.theme-dark .status-action-closed) { border-color: #365d49; background: #203329; color: #9bd2ae; }
:global(.company-shell.theme-dark .status-action-closed:hover:not(:disabled)) { border-color: #48795c; background: #273b30; }
:global(.company-shell.theme-dark .status-action-restore) { border-color: #514b68; background: #292638; color: #d0c8ec; }
:global(.company-shell.theme-dark .status-action-restore:hover:not(:disabled)) { border-color: #776c9b; background: #353149; }
.actions-cell { white-space: normal !important; }
.jobs-empty { min-height: 210px; display: grid; place-content: center; justify-items: center; gap: 8px; text-align: center; }
.jobs-empty strong { font-size: 16px; }
.jobs-empty span { color: var(--muted); font-size: 14px; }
.jobs-empty button { margin-top: 5px; border: 0; background: none; color: #6654d8; font-size: 14px; font-weight: 600; cursor: pointer; }
.job-view-backdrop { position: fixed; inset: 0; z-index: 85; padding: 20px; display: grid; place-items: center; background: rgb(11 26 72 / 42%); backdrop-filter: blur(3px); }
.job-view-dialog { width: min(100%, 960px); max-height: calc(100dvh - 40px); overflow-y: auto; scrollbar-width: none; -ms-overflow-style: none; overscroll-behavior: contain; padding: 28px; border: 1px solid var(--line); border-radius: 15px; background: var(--surface-raised); color: var(--ink); box-shadow: 0 24px 70px rgb(11 43 130 / 20%); }
.job-view-dialog::-webkit-scrollbar { display: none; }
.delete-confirm-dialog { width: min(430px, calc(100vw - 40px)); max-width: 430px; max-height: calc(100dvh - 40px); margin: auto; padding: 27px; border: 1px solid #e2e4e8; border-radius: 15px; background: #fff; color: #19233c; box-shadow: 0 24px 70px rgb(11 26 72 / 28%); }
:global(.delete-confirm-dialog::backdrop) { background: rgb(11 26 72 / 54%); backdrop-filter: blur(4px); }
:global(body:has(.company-shell.theme-dark) .delete-confirm-dialog) { border-color: #2c3545; background: #1c2533; color: #edf1f7; }
:global(body:has(.company-shell.theme-dark) .delete-confirm-dialog::backdrop) { background: rgb(0 0 0 / 65%); }
.delete-confirm-icon { width: 39px; height: 39px; margin-bottom: 16px; border: 1px solid #f0cbd1; border-radius: 11px; display: grid; place-items: center; background: #fff3f4; color: #a03f53; font-size: 21px; font-weight: 700; }
:global(body:has(.company-shell.theme-dark) .delete-confirm-icon) { border-color: #613b48; background: #30212a; color: #ffabb8; }
.delete-confirm-eyebrow { margin: 0 0 6px; color: #a03f53; font-size: 11px; font-weight: 700; letter-spacing: .09em; text-transform: uppercase; }
.delete-confirm-dialog h3 { margin: 0; color: #19233c; font-size: 21px; letter-spacing: -.025em; }
:global(body:has(.company-shell.theme-dark) .delete-confirm-dialog h3) { color: #edf1f7; }
.delete-confirm-copy { margin: 11px 0 0; color: #40506b; font-size: 14px; line-height: 1.55; overflow-wrap: anywhere; }
:global(body:has(.company-shell.theme-dark) .delete-confirm-copy) { color: #b4bfd1; }
.delete-confirm-detail { margin: 10px 0 0; color: #657088; font-size: 12px; line-height: 1.55; }
:global(body:has(.company-shell.theme-dark) .delete-confirm-detail) { color: #aab6ca; }
.delete-confirm-error { margin: 13px 0 0; padding: 9px 11px; border: 1px solid #f0cbd1; border-radius: 7px; background: #fff5f6; color: #9b3348; font-size: 12px; line-height: 1.5; }
:global(body:has(.company-shell.theme-dark) .delete-confirm-error) { border-color: #613b48; background: #30212a; color: #ffabb8; }
.delete-confirm-actions { margin-top: 23px; display: flex; justify-content: flex-end; gap: 9px; }
.delete-confirm-actions button { min-height: 38px; padding: 0 14px; border: 1px solid #e2e4e8; border-radius: 7px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; transition: background-color 150ms ease, border-color 150ms ease, transform 150ms ease; }
.delete-confirm-actions button:hover:not(:disabled) { transform: translateY(-1px); }
.delete-confirm-actions button:disabled { opacity: .65; cursor: wait; }
.delete-confirm-cancel { border-color: #e2e4e8 !important; background: #fbfbf9; color: #40506b; }
.delete-confirm-cancel:hover:not(:disabled) { border-color: #c9ced7 !important; background: #fff; }
:global(body:has(.company-shell.theme-dark) .delete-confirm-cancel) { border-color: #455268 !important; background: #171e2a; color: #b4bfd1; }
:global(body:has(.company-shell.theme-dark) .delete-confirm-cancel:hover:not(:disabled)) { background: #1c2533; }
.delete-confirm-submit { border-color: #a63d52 !important; background: #a63d52; color: #fff; }
.delete-confirm-submit:hover:not(:disabled) { border-color: #842d40 !important; background: #842d40; }
.job-view-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; }
.job-view-header p { margin: 0 0 5px; color: var(--accent-dark); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .08em; }
.job-view-header h3 { margin: 0; color: var(--ink); font-size: clamp(22px, 3vw, 30px); letter-spacing: -.03em; }
.job-view-header span { display: block; margin-top: 6px; color: var(--muted); font-size: 13px; }
.job-view-summary { margin: 19px 0 0; padding: 15px 17px; border-radius: 9px; background: var(--accent-soft); color: var(--ink-soft); font-size: 14px; line-height: 1.65; }
.job-view-layout { margin-top: 24px; display: grid; grid-template-columns: minmax(0, 1fr) 270px; gap: 26px; align-items: start; }
.job-view-main { display: grid; gap: 22px; min-width: 0; }
.job-view-section + .job-view-section { padding-top: 19px; border-top: 1px solid var(--line); }
.job-view-section h4, .job-view-facts h4 { margin: 0 0 10px; color: var(--ink); font-size: 15px; font-weight: 650; }
.job-view-section p, .job-view-section li { color: var(--ink-soft); font-size: 14px; line-height: 1.7; white-space: pre-line; }
.job-view-section p { margin: 0; }
.job-view-section ul { margin: 0; padding-left: 20px; display: grid; gap: 7px; }
.job-view-tags { display: flex; flex-wrap: wrap; gap: 8px; }
.job-view-tags span { padding: 5px 10px; border: 1px solid var(--line); border-radius: 999px; background: var(--accent-soft); color: var(--accent-dark); font-size: 12px; }
.job-view-facts { padding: 17px; border: 1px solid var(--line); border-radius: 10px; background: var(--surface); }
.job-view-facts dl { margin: 0; display: grid; gap: 13px; }
.job-view-facts dl > div { display: grid; gap: 4px; }
.job-view-facts dt { color: var(--muted); font-size: 11px; }
.job-view-facts dd { margin: 0; color: var(--ink-soft); font-size: 13px; font-weight: 550; overflow-wrap: anywhere; }
.composer-backdrop { position: fixed; inset: 0; z-index: 80; padding: 20px; display: grid; place-items: center; background: rgb(11 26 72 / 42%); backdrop-filter: blur(3px); }
.job-composer { width: min(100%, 760px); max-height: calc(100dvh - 40px); overflow-y: auto; scrollbar-width: none; -ms-overflow-style: none; overscroll-behavior: contain; padding: 27px; border: 1px solid var(--line); border-radius: 14px; background: #fff; box-shadow: 0 24px 70px rgb(11 43 130 / 20%); }
.job-composer::-webkit-scrollbar { display: none; }
.composer-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
.composer-heading p { margin: 0 0 5px; color: #6654d8; font-size: 13px; font-weight: 600; }
.composer-heading h3 { margin: 0; color: var(--ink); font-size: 24px; letter-spacing: -.03em; }
.close-composer { width: 32px; height: 32px; border: 1px solid var(--line); border-radius: 7px; display: grid; place-items: center; background: #fff; color: var(--ink-soft); cursor: pointer; }
.close-composer:hover { background: var(--accent-soft); color: var(--accent-dark); }
.composer-copy { margin: 12px 0 21px; color: var(--muted); font-size: 14px; line-height: 1.6; }
.job-form { display: grid; gap: 15px; }
.composer-section { display: grid; gap: 14px; padding-top: 18px; border-top: 1px solid var(--line); }
.composer-section h4 { margin: 0; color: var(--ink); font-size: 15px; font-weight: 650; letter-spacing: -.01em; }
.job-form label { display: grid; gap: 7px; color: #52669e; font-size: 13px; font-weight: 600; }
.optional-label { color: var(--muted); font-size: 12px; font-weight: 400; }
.job-form input, .job-form select, .job-form textarea { width: 100%; min-height: 42px; padding: 0 12px; border: 1px solid #dcd7f1; border-radius: 7px; background: #fff; color: var(--ink); font-size: 14px; outline: 0; }
.job-form textarea { min-height: 120px; padding-top: 10px; resize: vertical; line-height: 1.5; }
.job-form input:focus, .job-form select:focus, .job-form textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgb(123 102 255 / 12%); }
.job-form input::placeholder { color: #9aa4c2; font-weight: 400; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-triple-row { display: grid; grid-template-columns: 1fr 1fr .7fr; gap: 12px; }
.tag-input-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 9px; align-items: center; }
.tag-input-row .company-secondary { min-height: 42px; }
.skill-tags { display: flex; flex-wrap: wrap; gap: 8px; }
.skill-tag { min-height: 30px; padding: 4px 6px 4px 10px; border: 1px solid var(--line); border-radius: 999px; display: inline-flex; align-items: center; gap: 6px; background: var(--accent-soft); color: var(--accent-dark); font-size: 12px; }
.skill-tag button { width: 20px; height: 20px; border: 0; border-radius: 50%; background: transparent; color: inherit; font-size: 16px; line-height: 1; cursor: pointer; }
.skill-tag button:hover { background: rgb(110 91 220 / 12%); }
.composer-actions { margin-top: 8px; display: flex; justify-content: flex-end; gap: 9px; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
@media (max-width: 760px) {
  .job-view-layout { grid-template-columns: 1fr; }
  .job-view-facts { grid-row: 1; }
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
  .jobs-table td:nth-child(6) { grid-column: 1 / -1; justify-self: stretch; align-self: center; align-content: center; padding-top: 2px; }
}
@media (max-width: 540px) { .jobs-toolbar { align-items: flex-start; flex-direction: column; padding: 13px 16px 0; } .jobs-tabs { width: 100%; min-height: 39px; gap: 19px; } .result-count { align-self: flex-end; margin: 0 0 10px; } .job-composer, .job-view-dialog { padding: 22px 18px; } .delete-confirm-dialog { padding: 23px 20px; } .form-row, .form-triple-row { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition-duration: .01ms !important; } }
</style>
