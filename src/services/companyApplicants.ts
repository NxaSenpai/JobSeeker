import { apiBlob, apiRequest } from './api'

export type ApplicantStatus =
  | 'APPLIED'
  | 'UNDER_REVIEW'
  | 'SHORTLISTED'
  | 'INTERVIEW'
  | 'OFFERED'
  | 'HIRED'
  | 'REJECTED'
  | 'WITHDRAWN'

export const applicantStatuses: ApplicantStatus[] = [
  'APPLIED',
  'UNDER_REVIEW',
  'SHORTLISTED',
  'INTERVIEW',
  'OFFERED',
  'HIRED',
  'REJECTED',
  'WITHDRAWN',
]

const statusLabels: Record<ApplicantStatus, string> = {
  APPLIED: 'New',
  UNDER_REVIEW: 'Under review',
  SHORTLISTED: 'Shortlisted',
  INTERVIEW: 'Interview',
  OFFERED: 'Offer sent',
  HIRED: 'Hired',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
}

const employerTransitions: Record<ApplicantStatus, ApplicantStatus[]> = {
  APPLIED: ['UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'OFFERED', 'HIRED', 'REJECTED'],
  UNDER_REVIEW: ['SHORTLISTED', 'INTERVIEW', 'OFFERED', 'HIRED', 'REJECTED'],
  SHORTLISTED: ['UNDER_REVIEW', 'INTERVIEW', 'OFFERED', 'HIRED', 'REJECTED'],
  INTERVIEW: ['UNDER_REVIEW', 'SHORTLISTED', 'OFFERED', 'HIRED', 'REJECTED'],
  OFFERED: ['HIRED', 'REJECTED'],
  HIRED: [],
  REJECTED: [],
  WITHDRAWN: [],
}

export type CompanyApplicantListItem = {
  id: string
  job: {
    id: string
    title: string
    company: string
    location: string
  }
  candidate: {
    firstName: string
    lastName: string
    headline: string
    location: string
    skills: string[]
  }
  status: ApplicantStatus
  appliedAt: string
  updatedAt: string
}

export type ApplicantEducation = {
  school?: string
  degree?: string
  fieldOfStudy?: string
  startDate?: string
  endDate?: string
  description?: string
}

export type ApplicantExperience = {
  company?: string
  position?: string
  employmentType?: string
  startDate?: string
  endDate?: string
  current?: boolean
  description?: string
}

export type ApplicantLanguage = {
  name?: string
  proficiency?: string
}

export type CompanyApplicantDetails = {
  id: string
  job: CompanyApplicantListItem['job']
  candidate: CompanyApplicantListItem['candidate'] & {
    bio?: string | null
    websiteUrl?: string | null
    linkedinUrl?: string | null
    githubUrl?: string | null
    education?: ApplicantEducation[]
    experience?: ApplicantExperience[]
    languages?: ApplicantLanguage[]
  }
  contact: {
    email: string | null
    phone: string | null
  }
  description: string
  coverLetter: string
  portfolioUrl: string | null
  resume: {
    id: string
    fileName: string
    mimeType: string
    fileSize: number
    downloadUrl: string
  }
  status: ApplicantStatus
  history: Array<{
    status: ApplicantStatus
    at: string
    changedBy?: string
  }>
  appliedAt: string
  updatedAt: string
}

export type CompanyApplicantQuery = {
  page?: number
  limit?: number
  status?: ApplicantStatus
  search?: string
}

export type CompanyApplicantListResponse = {
  applications: CompanyApplicantListItem[]
  total: number
  page: number
  limit: number
}

export type CompanyApplicantDashboardSummary = {
  recent: CompanyApplicantListItem[]
  total: number
  counts: Pick<Record<ApplicantStatus, number>, 'APPLIED' | 'UNDER_REVIEW' | 'INTERVIEW' | 'SHORTLISTED'>
}

function normalizeApplicantDetails(application: CompanyApplicantDetails): CompanyApplicantDetails {
  const candidate = application.candidate ?? {}
  return {
    ...application,
    candidate: {
      ...candidate,
      firstName: candidate.firstName ?? '',
      lastName: candidate.lastName ?? '',
      headline: candidate.headline ?? '',
      location: candidate.location ?? '',
      skills: Array.isArray(candidate.skills) ? candidate.skills : [],
      education: Array.isArray(candidate.education) ? candidate.education : [],
      experience: Array.isArray(candidate.experience) ? candidate.experience : [],
      languages: Array.isArray(candidate.languages) ? candidate.languages : [],
    },
  }
}

export function applicantStatusLabel(status: ApplicantStatus) {
  return statusLabels[status]
}

export function applicantStatusClass(status: ApplicantStatus) {
  return `status-${statusLabels[status].toLowerCase().replaceAll(' ', '-')}`
}

export function allowedApplicantStatusChanges(status: ApplicantStatus) {
  return employerTransitions[status]
}

export function applicantName(applicant: Pick<CompanyApplicantListItem, 'candidate'>) {
  return [applicant.candidate.firstName, applicant.candidate.lastName]
    .filter((part) => Boolean(part?.trim()))
    .join(' ')
    .trim() || 'Candidate'
}

export function applicantInitials(applicant: Pick<CompanyApplicantListItem, 'candidate' | 'id'>) {
  const name = applicantName(applicant)
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
  return initials.toUpperCase() || applicant.id.slice(0, 2).toUpperCase()
}

export function applicantAvatarColor(id: string) {
  const colors = ['coral', 'blue', 'purple', 'orange'] as const
  let hash = 0
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  return colors[hash % colors.length]
}

export async function fetchCompanyApplicants(
  query: CompanyApplicantQuery = {},
): Promise<CompanyApplicantListResponse> {
  const params = new URLSearchParams({
    page: String(query.page ?? 1),
    limit: String(query.limit ?? 20),
  })
  if (query.status) params.set('status', query.status)
  if (query.search?.trim()) params.set('search', query.search.trim())
  return apiRequest<CompanyApplicantListResponse>(`/company/applications?${params}`)
}

export async function fetchCompanyApplicant(id: string) {
  const result = await apiRequest<{ application: CompanyApplicantDetails }>(
    `/company/applications/${encodeURIComponent(id)}`,
  )
  return normalizeApplicantDetails(result.application)
}

export async function saveCompanyApplicantStatus(
  id: string,
  status: ApplicantStatus,
) {
  const result = await apiRequest<{ application: CompanyApplicantDetails }>(
    `/company/applications/${encodeURIComponent(id)}/status`,
    { method: 'PATCH', body: JSON.stringify({ status }) },
  )
  return normalizeApplicantDetails(result.application)
}

export function downloadCompanyApplicantResume(id: string) {
  // The API's downloadUrl includes `/api/v1`, while apiBlob expects an endpoint
  // relative to the configured API base. Build the known same-origin route from
  // the application ID instead of fetching a server-provided arbitrary URL.
  return apiBlob(`/company/applications/${encodeURIComponent(id)}/resume`)
}

export async function fetchCompanyApplicantDashboardSummary(): Promise<CompanyApplicantDashboardSummary> {
  const countedStatuses = ['APPLIED', 'UNDER_REVIEW', 'INTERVIEW', 'SHORTLISTED'] as const
  const [allApplicants, recentResult, ...statusResults] = await Promise.all([
    fetchCompanyApplicants({ page: 1, limit: 1 }),
    fetchCompanyApplicants({ page: 1, limit: 100 }),
    ...countedStatuses.map((status) =>
      fetchCompanyApplicants({ page: 1, limit: 1, status }),
    ),
  ])

  return {
    recent: recentResult.applications,
    total: allApplicants.total,
    counts: {
      APPLIED: statusResults[0]?.total ?? 0,
      UNDER_REVIEW: statusResults[1]?.total ?? 0,
      INTERVIEW: statusResults[2]?.total ?? 0,
      SHORTLISTED: statusResults[3]?.total ?? 0,
    },
  }
}
