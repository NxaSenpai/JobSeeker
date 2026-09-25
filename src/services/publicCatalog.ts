import appStore from '@/assets/img/app-store.png'
import figma from '@/assets/img/figma.png'
import pinterest from '@/assets/img/pinterest.png'
import slack from '@/assets/img/slack.png'
import spotify from '@/assets/img/spotify.png'
import telegram from '@/assets/img/telegram.png'
import wordpress from '@/assets/img/wordpress.png'
import { ApiRequestError, apiRequest } from './api'
import type { Company, Job } from '@/data/catalog'

export type PublicCompanyRecord = {
  id: string
  slug: string
  name: string
  industry: string | null
  companySize: string | null
  foundedYear: number | null
  location: string | null
  website: string | null
  description: string | null
  logoUrl: string | null
  isVerified: boolean
  openJobs?: number
}

export type PublicJobRecord = {
  id: string
  title: string
  company: string
  companyProfile: PublicCompanyRecord | null
  location: string
  category: string | null
  industry: string | null
  jobType: string
  workplaceType: string
  summary: string
  description: string
  responsibilities: string[]
  requirements: string[]
  skills: string[]
  salaryMin: number | null
  salaryMax: number | null
  currency: string
  salaryPeriod: string
  postedAt: string | null
  isDemo: boolean
  deadline: string | null
}

export type PublicJobCategory = { name: string; count: number }

export type JobSearch = {
  page?: number
  limit?: number
  search?: string
  category?: string
  workplaceType?: string
  jobType?: string
  sort?: string
  signal?: AbortSignal
}

export type CompanySearch = {
  page?: number
  limit?: number
  search?: string
  industry?: string
  signal?: AbortSignal
}

const logoByCompany: Record<string, string> = {
  'app store': appStore,
  figma,
  pinterest,
  slack,
  spotify,
  telegram,
  wordpress,
}

const accentColors = ['#f1efff', '#e9f8ee', '#f8eff7', '#eef6fb', '#eef8ff', '#fff0f1']

function companyLogo(name: string, logoUrl?: string | null) {
  if (isSafeHttpsUrl(logoUrl)) return logoUrl
  return logoByCompany[name.trim().toLowerCase()] ?? ''
}

function isSafeHttpsUrl(value: string | null | undefined): value is string {
  if (!value) return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password
  } catch {
    return false
  }
}

function titleCaseEnum(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('-')
}

function labelJobType(value: string): Job['type'] | string {
  const labels: Record<string, string> = {
    FULL_TIME: 'Full-time',
    PART_TIME: 'Part-time',
    CONTRACT: 'Contract',
    INTERNSHIP: 'Internship',
    TEMPORARY: 'Temporary',
    FREELANCE: 'Freelance',
  }
  return labels[value.toUpperCase()] ?? titleCaseEnum(value)
}

function labelWorkplace(value: string): Job['workplace'] | string {
  const labels: Record<string, string> = {
    REMOTE: 'Remote',
    HYBRID: 'Hybrid',
    ONSITE: 'On-site',
    ON_SITE: 'On-site',
  }
  return labels[value.toUpperCase()] ?? titleCaseEnum(value)
}

function formatSalary(job: PublicJobRecord) {
  if (job.salaryMin === null && job.salaryMax === null) return 'Salary not listed'
  const currency = /^[A-Z]{3}$/.test(job.currency) ? job.currency : 'USD'
  const formatter = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  })
  const min = job.salaryMin === null ? null : formatter.format(job.salaryMin)
  const max = job.salaryMax === null ? null : formatter.format(job.salaryMax)
  const range = min && max ? `${min} – ${max}` : min ?? `Up to ${max}`
  const period = job.salaryPeriod ? ` / ${job.salaryPeriod.toLowerCase()}` : ''
  return `${range}${period}`
}

function relativePostedAt(value: string | null) {
  if (!value) return 'Recently posted'
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return 'Recently posted'
  const seconds = Math.round((timestamp - Date.now()) / 1000)
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['week', 60 * 60 * 24 * 7],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60],
  ]
  const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit)
  }
  return 'Just now'
}

export function mapPublicCompany(record: PublicCompanyRecord): Company {
  const domain = isSafeHttpsUrl(record.website) ? new URL(record.website).host : ''
  const initials = record.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()

  return {
    id: record.id,
    slug: record.slug,
    name: record.name,
    logo: companyLogo(record.name, record.logoUrl),
    industry: record.industry || 'Industry not listed',
    location: record.location || 'Location not listed',
    size: record.companySize || 'Team size not listed',
    openRoles: record.openJobs ?? 0,
    initials: initials || record.name.slice(0, 1).toUpperCase(),
    accent: accentColors[record.name.length % accentColors.length]!,
    about: record.description || 'This company has not added a public description yet.',
    website: domain,
    websiteUrl: isSafeHttpsUrl(record.website) ? record.website : '',
    founded: record.foundedYear ? String(record.foundedYear) : 'Not listed',
    benefits: [],
    isVerified: record.isVerified,
  }
}

export function mapPublicJob(record: PublicJobRecord): Job {
  return {
    id: record.id,
    title: record.title,
    company: record.companyProfile?.name || record.company,
    logo: companyLogo(record.companyProfile?.name || record.company, record.companyProfile?.logoUrl),
    location: record.location,
    workplace: labelWorkplace(record.workplaceType) as Job['workplace'],
    type: labelJobType(record.jobType) as Job['type'],
    salary: formatSalary(record),
    salaryValue: record.salaryMax,
    category: record.category || record.industry || 'Other',
    posted: relativePostedAt(record.postedAt),
    summary: record.summary || 'View this listing for the full role details.',
    skills: Array.isArray(record.skills) ? record.skills : [],
    description: record.description || 'The employer has not added a detailed description yet.',
    responsibilities: Array.isArray(record.responsibilities) ? record.responsibilities : [],
    requirements: Array.isArray(record.requirements) ? record.requirements : [],
    companyProfile: record.companyProfile ? mapPublicCompany(record.companyProfile) : null,
    isDemo: record.isDemo,
    deadline: record.deadline,
  }
}

export async function listPublicJobs(search: JobSearch = {}) {
  const params = new URLSearchParams()
  const { signal, ...filters } = search
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  const suffix = params.size ? `?${params.toString()}` : ''
  const result = await apiRequest<{
    jobs: PublicJobRecord[]
    total: number
    page: number
    limit: number
  }>(`/jobs${suffix}`, { signal })
  return { ...result, jobs: result.jobs.map(mapPublicJob) }
}

export async function getPublicJob(id: string, signal?: AbortSignal) {
  const record = await apiRequest<PublicJobRecord>(`/jobs/${encodeURIComponent(id)}`, { signal })
  return mapPublicJob(record)
}

export async function listFeaturedPublicJobs(signal?: AbortSignal) {
  const result = await apiRequest<{ jobs: PublicJobRecord[] }>('/jobs/featured', { signal })
  return result.jobs.map(mapPublicJob)
}

export async function listPublicJobCategories(signal?: AbortSignal) {
  return apiRequest<{ categories: PublicJobCategory[] }>('/jobs/categories', { signal })
}

export async function getPublicJobsByIds(ids: string[], signal?: AbortSignal) {
  const jobs = new Map<string, Job>()
  const unavailableIds = new Set<string>()
  const uniqueIds = [...new Set(ids)]

  // Keep account pages responsive without issuing an unbounded burst of detail requests.
  for (let offset = 0; offset < uniqueIds.length; offset += 6) {
    const batch = uniqueIds.slice(offset, offset + 6)
    const results = await Promise.all(batch.map(async (id) => {
      try {
        return { id, job: await getPublicJob(id, signal) }
      } catch (cause) {
        if (cause instanceof ApiRequestError && cause.status === 404) return { id, job: null }
        throw cause
      }
    }))

    for (const result of results) {
      if (result.job) jobs.set(result.id, result.job)
      else unavailableIds.add(result.id)
    }
  }

  return { jobs, unavailableIds }
}

export async function getSimilarPublicJobs(id: string, signal?: AbortSignal) {
  const result = await apiRequest<{ jobs: PublicJobRecord[] }>(
    `/jobs/${encodeURIComponent(id)}/similar`,
    { signal },
  )
  return result.jobs.map(mapPublicJob)
}

export async function listPublicCompanies(search: CompanySearch = {}) {
  const params = new URLSearchParams()
  const { signal, ...filters } = search
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  const suffix = params.size ? `?${params.toString()}` : ''
  const result = await apiRequest<{
    companies: PublicCompanyRecord[]
    total: number
    page: number
    limit: number
  }>(`/companies${suffix}`, { signal })
  return { ...result, companies: result.companies.map(mapPublicCompany) }
}

export async function getPublicCompany(identifier: string, signal?: AbortSignal) {
  const result = await apiRequest<{ company: PublicCompanyRecord }>(
    `/companies/${encodeURIComponent(identifier)}`,
    { signal },
  )
  return mapPublicCompany(result.company)
}

export async function listCompanyJobs(identifier: string, page = 1, limit = 20, signal?: AbortSignal) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  const result = await apiRequest<{
    company: PublicCompanyRecord
    jobs: PublicJobRecord[]
    total: number
    page: number
    limit: number
  }>(`/companies/${encodeURIComponent(identifier)}/jobs?${params.toString()}`, { signal })
  return {
    ...result,
    company: mapPublicCompany({ ...result.company, openJobs: result.total }),
    jobs: result.jobs.map(mapPublicJob),
  }
}
