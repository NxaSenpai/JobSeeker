import { ref, watch } from 'vue'
import { apiRequest } from './api'
import { currentUser } from './auth'

export type ApplicationDraft = { jobId: string; coverLetter: string; resumeUrl: string; updatedAt: string }
export const savedJobIds = ref<string[]>([])
export const applicationDrafts = ref<ApplicationDraft[]>([])
export const activityLoading = ref(false)
export const activityError = ref('')
const savingJobs = ref<string[]>([])
export function isSavingJob(id: string) { return savingJobs.value.includes(id) }
let generation = 0

export async function loadActivity() {
  const version = ++generation
  if (currentUser.value?.role !== 'USER') return
  activityLoading.value = true
  activityError.value = ''
  try {
    const [saved, drafts] = await Promise.all([
      apiRequest<{ jobs: { jobId: string }[] }>('/account/saved-jobs'),
      apiRequest<{ drafts: ApplicationDraft[] }>('/account/application-drafts'),
    ])
    if (version !== generation) return
    savedJobIds.value = saved.jobs.map((item) => item.jobId)
    applicationDrafts.value = drafts.drafts
  } catch (error) {
    if (version === generation) activityError.value = error instanceof Error ? error.message : 'Could not load your activity.'
  } finally { if (version === generation) activityLoading.value = false }
}

watch(() => currentUser.value?.id, () => {
  generation++
  savedJobIds.value = []
  applicationDrafts.value = []
  activityError.value = ''
  activityLoading.value = false
  savingJobs.value = []
  if (currentUser.value?.role === 'USER') void loadActivity()
}, { immediate: true })

export async function toggleSavedJob(jobId: string) {
  if (isSavingJob(jobId)) return
  const userId = currentUser.value?.id
  const wasSaved = savedJobIds.value.includes(jobId)
  savingJobs.value = [...savingJobs.value, jobId]
  try {
    await apiRequest(`/account/saved-jobs/${encodeURIComponent(jobId)}`, { method: wasSaved ? 'DELETE' : 'PUT' })
    if (currentUser.value?.id === userId) savedJobIds.value = wasSaved ? savedJobIds.value.filter((id) => id !== jobId) : [jobId, ...savedJobIds.value]
  } finally { savingJobs.value = savingJobs.value.filter((id) => id !== jobId) }
}

export async function saveApplicationDraft(jobId: string, data: Pick<ApplicationDraft, 'coverLetter' | 'resumeUrl'>) {
  const userId = currentUser.value?.id
  const { draft } = await apiRequest<{ draft: ApplicationDraft }>(`/account/application-drafts/${encodeURIComponent(jobId)}`, { method: 'PUT', body: JSON.stringify(data) })
  if (currentUser.value?.id === userId) applicationDrafts.value = [draft, ...applicationDrafts.value.filter((item) => item.jobId !== jobId)]
}

export async function removeApplicationDraft(jobId: string) {
  const userId = currentUser.value?.id
  await apiRequest(`/account/application-drafts/${encodeURIComponent(jobId)}`, { method: 'DELETE' })
  if (currentUser.value?.id === userId) applicationDrafts.value = applicationDrafts.value.filter((item) => item.jobId !== jobId)
}
