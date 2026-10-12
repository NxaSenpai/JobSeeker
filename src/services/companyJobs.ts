import { ref } from 'vue'
import { getAuthSession } from './auth'
import { apiRequest } from './api'

export type JobStatus = 'Published' | 'Draft' | 'Closed' | 'Archived'
export type JobType = 'FULL_TIME' | 'PART_TIME' | 'INTERNSHIP' | 'CONTRACT' | 'TEMPORARY' | 'FREELANCE'
export type WorkplaceType = 'REMOTE' | 'ONSITE' | 'HYBRID'

export type CompanyJob = {
  id: string
  title: string
  team: string
  location: string
  jobType: JobType
  workplaceType: WorkplaceType
  arrangement: string
  applicants: number
  views: null
  status: JobStatus
  postedAt: string
  createdAt: string
  description: string
  summary: string
  category: string | null
  industry: string | null
  country: string | null
  city: string | null
  address: string | null
  responsibilities: string[]
  requirements: string[]
  benefits: string[]
  skills: string[]
  salaryMin: number | null
  salaryMax: number | null
  currency: string
  salaryPeriod: 'HOUR' | 'MONTH' | 'YEAR'
  experienceLevel: string | null
  minExperienceYears: number | null
  educationLevel: string | null
  vacancies: number
  deadline: string | null
}

export type CreateCompanyJobInput = {
  title: string
  team?: string
  location: string
  country?: string
  city?: string
  address?: string
  category?: string
  industry?: string
  summary?: string
  description: string
  jobType: JobType
  workplaceType: WorkplaceType
  responsibilities?: string[]
  requirements?: string[]
  benefits?: string[]
  skills?: string[]
  salaryMin?: number | null
  salaryMax?: number | null
  currency?: string
  salaryPeriod?: 'HOUR' | 'MONTH' | 'YEAR'
  experienceLevel?: string
  minExperienceYears?: number | null
  educationLevel?: string
  vacancies?: number
  deadline?: string | null
}

type ApiCompanyJob = {
  id: string
  title: string
  team?: string | null
  location: string
  jobType: JobType
  workplaceType: WorkplaceType
  status: 'PUBLISHED' | 'DRAFT' | 'CLOSED' | 'ARCHIVED'
  applicantCount?: number | string
  postedAt?: string
  createdAt: string
  description?: string
  summary?: string | null
  category?: string | null
  industry?: string | null
  country?: string | null
  city?: string | null
  address?: string | null
  responsibilities?: string[] | null
  requirements?: string[] | null
  benefits?: string[] | null
  skills?: string[] | null
  salaryMin?: number | null
  salaryMax?: number | null
  currency?: string
  salaryPeriod?: 'HOUR' | 'MONTH' | 'YEAR'
  experienceLevel?: string | null
  minExperienceYears?: number | null
  educationLevel?: string | null
  vacancies?: number
  deadline?: string | null
}

type CompanyJobsResponse = {
  jobs: ApiCompanyJob[]
  total: number
  page: number
  limit: number
}

const pageSize = 100
export const companyJobs = ref<CompanyJob[]>([])
export const companyJobsLoading = ref(false)
export const companyJobsError = ref('')

let activeOwnerId: string | null | undefined
let loadedOwnerId: string | null | undefined
let inFlight: { ownerId: string | null; promise: Promise<CompanyJob[]> } | null = null

function currentOwnerId() {
  return getAuthSession()?.user.id ?? null
}

function normalizeJob(job: ApiCompanyJob): CompanyJob {
  const status: Record<ApiCompanyJob['status'], JobStatus> = {
    PUBLISHED: 'Published',
    DRAFT: 'Draft',
    CLOSED: 'Closed',
    ARCHIVED: 'Archived',
  }
  const jobTypeLabels: Record<JobType, string> = {
    FULL_TIME: 'Full-time',
    PART_TIME: 'Part-time',
    INTERNSHIP: 'Internship',
    CONTRACT: 'Contract',
    TEMPORARY: 'Temporary',
    FREELANCE: 'Freelance',
  }
  const workplaceLabels: Record<WorkplaceType, string> = {
    REMOTE: 'Remote',
    ONSITE: 'On-site',
    HYBRID: 'Hybrid',
  }

  return {
    id: job.id,
    title: job.title,
    team: job.team?.trim() || 'Company team',
    location: job.location,
    jobType: job.jobType,
    workplaceType: job.workplaceType,
    arrangement: `${jobTypeLabels[job.jobType] ?? 'Full-time'} · ${workplaceLabels[job.workplaceType] ?? 'On-site'}`,
    applicants: Math.max(0, Number(job.applicantCount ?? 0) || 0),
    // The current backend has no view-count column or tracking endpoint.
    views: null,
    status: status[job.status],
    postedAt: job.postedAt ?? job.createdAt,
    createdAt: job.createdAt,
    description: job.description ?? '',
    summary: job.summary ?? '',
    category: job.category ?? null,
    industry: job.industry ?? null,
    country: job.country ?? null,
    city: job.city ?? null,
    address: job.address ?? null,
    responsibilities: Array.isArray(job.responsibilities) ? job.responsibilities : [],
    requirements: Array.isArray(job.requirements) ? job.requirements : [],
    benefits: Array.isArray(job.benefits) ? job.benefits : [],
    skills: Array.isArray(job.skills) ? job.skills : [],
    salaryMin: job.salaryMin ?? null,
    salaryMax: job.salaryMax ?? null,
    currency: job.currency ?? 'USD',
    salaryPeriod: job.salaryPeriod ?? 'YEAR',
    experienceLevel: job.experienceLevel ?? null,
    minExperienceYears: job.minExperienceYears ?? null,
    educationLevel: job.educationLevel ?? null,
    vacancies: job.vacancies ?? 1,
    deadline: job.deadline ?? null,
  }
}

function upsertJob(job: CompanyJob) {
  const index = companyJobs.value.findIndex((existing) => existing.id === job.id)
  if (index === -1) {
    companyJobs.value = [job, ...companyJobs.value]
    return
  }
  companyJobs.value = companyJobs.value.map((existing) => existing.id === job.id ? job : existing)
}

export async function loadCompanyJobs(force = false): Promise<CompanyJob[]> {
  const ownerId = currentOwnerId()
  if (activeOwnerId !== ownerId) {
    activeOwnerId = ownerId
    loadedOwnerId = undefined
    companyJobs.value = []
    companyJobsError.value = ''
  }
  if (!force && loadedOwnerId === ownerId) return companyJobs.value
  if (inFlight?.ownerId === ownerId) return inFlight.promise

  companyJobsLoading.value = true
  companyJobsError.value = ''
  let promise!: Promise<CompanyJob[]>
  promise = (async () => {
    try {
      const result: ApiCompanyJob[] = []
      let page = 1
      let total = 0
      do {
        const response = await apiRequest<CompanyJobsResponse>(`/company/jobs?page=${page}&limit=${pageSize}`)
        if (!Array.isArray(response.jobs)) throw new Error('The company jobs response was incomplete.')
        result.push(...response.jobs)
        total = response.total
        if (response.jobs.length === 0 && result.length < total) {
          throw new Error('The company jobs response contained an incomplete page.')
        }
        page += 1
      } while (result.length < total)

      const normalized = result.map(normalizeJob)
      if (currentOwnerId() !== ownerId) return []
      companyJobs.value = normalized
      loadedOwnerId = ownerId
      return normalized
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Unable to load company jobs.'
      if (currentOwnerId() === ownerId) companyJobsError.value = message
      throw cause
    } finally {
      if (inFlight?.promise === promise) {
        inFlight = null
        companyJobsLoading.value = false
      }
    }
  })()
  inFlight = { ownerId, promise }
  return promise
}

export async function createCompanyJob(input: CreateCompanyJobInput): Promise<CompanyJob> {
  const result = await apiRequest<{ job: ApiCompanyJob }>('/company/jobs', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  const job = normalizeJob(result.job)
  upsertJob(job)
  return job
}

export async function updateCompanyJobStatus(id: string, status: JobStatus): Promise<CompanyJob> {
  const action = status === 'Draft' ? 'unpublish' : status === 'Closed' ? 'close' : 'publish'
  const result = await apiRequest<{ job: ApiCompanyJob }>(`/company/jobs/${encodeURIComponent(id)}/${action}`, {
    method: 'PATCH',
  })
  const job = normalizeJob(result.job)
  upsertJob(job)
  return job
}

export async function archiveCompanyJob(id: string): Promise<CompanyJob> {
  const result = await apiRequest<{ job: ApiCompanyJob }>(`/company/jobs/${encodeURIComponent(id)}/archive`, {
    method: 'PATCH',
  })
  const job = normalizeJob(result.job)
  upsertJob(job)
  return job
}

export async function restoreCompanyJob(id: string): Promise<CompanyJob> {
  const result = await apiRequest<{ job: ApiCompanyJob }>(`/company/jobs/${encodeURIComponent(id)}/restore`, {
    method: 'PATCH',
  })
  const job = normalizeJob(result.job)
  upsertJob(job)
  return job
}

export async function deleteCompanyJob(id: string): Promise<number> {
  const result = await apiRequest<{ deleted: boolean; id: string; removedApplications: number }>(`/company/jobs/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  companyJobs.value = companyJobs.value.filter(job => job.id !== id)
  return result.removedApplications ?? 0
}
