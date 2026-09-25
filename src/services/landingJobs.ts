import { ref } from 'vue'
import type { Job } from '@/data/catalog'
import { ApiRequestError } from './api'
import { listFeaturedPublicJobs, listPublicJobs } from './publicCatalog'

export const featuredLandingJobs = ref<Job[]>([])
export const latestLandingJobs = ref<Job[]>([])
export const landingJobsLoading = ref(false)
export const landingJobsError = ref('')

let requestVersion = 0
let activeController: AbortController | undefined
let pendingRequest: Promise<void> | null = null

export function loadLandingJobs(force = false) {
  if (pendingRequest && !force) return pendingRequest

  activeController?.abort()
  const controller = new AbortController()
  activeController = controller
  const version = ++requestVersion
  landingJobsLoading.value = true
  landingJobsError.value = ''

  let request: Promise<void>
  request = Promise.all([
    listFeaturedPublicJobs(controller.signal),
    listPublicJobs({ page: 1, limit: 12, sort: 'newest', signal: controller.signal }),
  ]).then(([featured, recent]) => {
    if (version !== requestVersion) return
    const visibleFeatured = featured.slice(0, 4)
    const featuredIds = new Set(visibleFeatured.map((job) => job.id))
    featuredLandingJobs.value = visibleFeatured
    latestLandingJobs.value = recent.jobs.filter((job) => !featuredIds.has(job.id)).slice(0, 4)
  }).catch((cause: unknown) => {
    if (version !== requestVersion || controller.signal.aborted) return
    landingJobsError.value = cause instanceof ApiRequestError
      ? cause.message
      : 'We could not load job listings right now. Check your connection and try again.'
    featuredLandingJobs.value = []
    latestLandingJobs.value = []
  }).finally(() => {
    if (version === requestVersion) landingJobsLoading.value = false
    if (pendingRequest === request) pendingRequest = null
  })

  pendingRequest = request
  return request
}
