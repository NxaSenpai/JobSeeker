<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { apiRequest } from '@/services/api'
import { dateLabel, statusLabels, type ApplicationRecord } from '@/services/candidate'
import AccountPageFrame from '@/components/public/AccountPageFrame.vue'
import type { Job } from '@/data/catalog'
import { applicationDrafts, activityLoading, activityError, loadActivity, removeApplicationDraft } from '@/services/activity'
import { getPublicJobsByIds } from '@/services/publicCatalog'
const deleting = ref('')
const confirmation = ref('')
const error = ref('')
const applications = ref<ApplicationRecord[]>([])
const loading = ref(true)
const loadError = ref('')
const status = ref('')
const page = ref(1)
const total = ref(0)
let version = 0
const draftJobsById = ref(new Map<string, Job>())
const draftDetailsLoading = ref(false)
const draftDetailsError = ref('')
let draftRequestVersion = 0
let draftController: AbortController | undefined
async function loadApplications() {
  const request = ++version; loading.value = true; loadError.value = ''
  try {
    const result = await apiRequest<{ applications: ApplicationRecord[]; total: number }>(`/applications/me?page=${page.value}&limit=10${status.value ? `&status=${status.value}` : ''}`)
    if (request === version) { applications.value = result.applications; total.value = result.total }
  } catch (cause) { if (request === version) loadError.value = cause instanceof Error ? cause.message : 'Could not load applications.' }
  finally { if (request === version) loading.value = false }
}
watch(status, () => { page.value = 1; void loadApplications() })
watch(page, loadApplications, { immediate: true })
async function loadDraftJobs() {
  const request = ++draftRequestVersion
  draftController?.abort()
  const ids = applicationDrafts.value.map(draft => draft.jobId)
  draftJobsById.value = new Map()
  draftDetailsError.value = ''
  if (!ids.length) { draftDetailsLoading.value = false; return }

  const controller = new AbortController()
  draftController = controller
  draftDetailsLoading.value = true
  try {
    const result = await getPublicJobsByIds(ids, controller.signal)
    if (request === draftRequestVersion) draftJobsById.value = result.jobs
  } catch (cause) {
    if (request === draftRequestVersion && !controller.signal.aborted) {
      draftDetailsError.value = cause instanceof Error ? cause.message : 'Could not load draft job details.'
    }
  } finally {
    if (request === draftRequestVersion) draftDetailsLoading.value = false
  }
}
watch(applicationDrafts, () => { void loadDraftJobs() }, { immediate: true })
function jobFor(id: string) { return draftJobsById.value.get(id) }
function date(value: string) { return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) }
async function remove(id: string) {
  deleting.value = id; error.value = ''
  try { await removeApplicationDraft(id); confirmation.value = '' }
  catch (cause) { error.value = cause instanceof Error ? cause.message : 'Unable to delete this draft.' }
  finally { deleting.value = '' }
}
onBeforeUnmount(() => { version++; draftRequestVersion++; draftController?.abort() })
</script>
<template>
  <AccountPageFrame title="Your applications" description="Keep track of each opportunity, review what you sent, and pick up your saved drafts.">
    <section class="mb-12" aria-labelledby="submitted-heading">
      <div class="mb-6 flex flex-wrap items-center justify-between gap-4"><h2 id="submitted-heading" class="text-2xl font-semibold">Submitted applications <span class="text-[#7a7394]">({{ total }})</span></h2><label class="account-field">Filter by status<select v-model="status"><option value="">All statuses</option><option v-for="(label, value) in statusLabels" :key="value" :value="value">{{ label }}</option></select></label></div>
      <p v-if="loading" role="status" class="account-muted">Loading your applications…</p>
      <p v-else-if="loadError" role="alert" class="account-feedback account-error">{{ loadError }} <button class="underline" @click="loadApplications">Try again</button></p>
      <div v-else-if="applications.length" class="grid gap-4"><article v-for="application in applications" :key="application.id" class="account-panel flex flex-wrap items-center justify-between gap-5"><div><span class="application-status">{{ statusLabels[application.status] }}</span><h3 class="mt-3 text-xl font-semibold">{{ application.job.title }}</h3><p class="account-muted">{{ application.job.company }} · {{ application.job.location }}</p><p class="account-muted mt-2">Applied {{ dateLabel(application.createdAt) }} · Updated {{ dateLabel(application.updatedAt) }}</p><span v-if="application.job.isDemo" class="text-xs text-[#7a7394]">Sample listing</span></div><router-link :to="`/applications/${application.id}`" class="account-secondary">View application</router-link></article></div>
      <div v-else class="account-empty"><h3 class="text-xl font-semibold">{{ status ? 'No applications with this status' : 'Your next chapter starts with an application' }}</h3><p>Choose a role, introduce yourself, and attach your CV.</p><router-link to="/jobs" class="account-primary">Find a role</router-link></div>
      <nav v-if="total > 10" class="mt-5 flex items-center gap-4" aria-label="Application pages"><button class="account-secondary" :disabled="page === 1 || loading" @click="page--">Previous</button><span class="account-muted">Page {{ page }} of {{ Math.ceil(total / 10) }}</span><button class="account-secondary" :disabled="page * 10 >= total || loading" @click="page++">Next</button></nav>
    </section>
    <h2 class="mb-2 text-2xl font-semibold">Application drafts</h2><p class="account-muted mb-6">Private work in progress. Drafts have not been submitted.</p>
    <p v-if="activityLoading" role="status" class="account-muted">Loading your drafts…</p>
    <div v-else-if="activityError" role="alert" class="account-feedback account-error">{{ activityError }} <button type="button" class="underline" @click="loadActivity">Try again</button></div>
    <p v-else-if="draftDetailsLoading" role="status" class="account-muted">Loading job details for your drafts…</p>
    <div v-else-if="draftDetailsError" role="alert" class="account-feedback account-error">{{ draftDetailsError }} <button type="button" class="underline" @click="loadDraftJobs">Try again</button></div>
    <div v-else-if="applicationDrafts.length" class="grid gap-5">
      <p v-if="error" role="alert" class="account-feedback account-error">{{ error }}</p>
      <article v-for="draft in applicationDrafts" :key="draft.jobId" class="account-panel flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
        <div><span class="text-xs font-medium uppercase tracking-wider text-[#7561d9]">Draft · Not submitted</span><h2 class="mt-2">{{ jobFor(draft.jobId)?.title ?? 'Listing unavailable' }}</h2><p class="account-muted mt-1">{{ jobFor(draft.jobId)?.company ?? 'This listing is no longer available.' }}</p><p class="account-muted mt-3">Last saved {{ date(draft.updatedAt) }}</p></div>
        <div class="flex flex-wrap items-center gap-3">
          <template v-if="confirmation === draft.jobId"><span class="text-sm">Delete this draft?</span><button type="button" class="account-secondary" :disabled="!!deleting" @click="remove(draft.jobId)">{{ deleting ? 'Deleting…' : 'Yes, delete' }}</button><button type="button" class="account-secondary" :disabled="!!deleting" @click="confirmation = ''">Cancel</button></template>
          <template v-else><router-link v-if="jobFor(draft.jobId)" :to="`/jobs/${encodeURIComponent(draft.jobId)}/apply`" class="account-primary">Continue draft</router-link><button type="button" class="account-secondary" @click="confirmation = draft.jobId">Delete</button></template>
        </div>
      </article>
    </div>
    <div v-else class="account-empty"><h2>A little preparation goes a long way</h2><p>Open a job you’re interested in and prepare a draft. Your saved work will appear here.</p><router-link to="/jobs" class="account-primary">Find a role</router-link></div>
  </AccountPageFrame>
</template>
