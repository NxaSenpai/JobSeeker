import { apiRequest, apiUrl } from './api'

export type AdminCompany = {
  id: string
  slug: string
  name: string
  industry: string | null
  companySize: string | null
  foundedYear: number | null
  location: string | null
  website: string | null
  description: string | null
  contactEmail: string | null
  timezone: string | null
  socialLinks: Record<string, string>
  logoUrl: string | null
  bannerUrl: string | null
  isVerified: boolean
  moderationNote: string | null
  suspendedAt: string | null
  suspensionReason: string | null
  createdAt: string
  updatedAt: string
}

export type AdminCompanyQueueItem = {
  company: AdminCompany
  ownerContact: {
    email: string
    contactName: string | null
    emailVerified: boolean
    suspendedAt: string | null
  } | null
}

export type AdminCompanyListResponse = {
  companies: AdminCompanyQueueItem[]
  total: number
  page: number
  limit: number
}

export type AdminCompanyStatus = 'PENDING' | 'VERIFIED' | 'SUSPENDED'

export type AdminCompanyQuery = {
  page?: number
  limit?: number
  search?: string
  status?: AdminCompanyStatus | ''
}

export async function listAdminCompanies(query: AdminCompanyQuery = {}) {
  const params = new URLSearchParams({
    page: String(query.page ?? 1),
    limit: String(query.limit ?? 20),
  })
  if (query.search?.trim()) params.set('search', query.search.trim())
  if (query.status) params.set('status', query.status)
  const result = await apiRequest<AdminCompanyListResponse>(`/admin/companies?${params.toString()}`)
  return {
    ...result,
    companies: result.companies.map(item => ({
      ...item,
      company: {
        ...item.company,
        logoUrl: isManagedLogoUrl(item.company.logoUrl)
          ? apiUrl(item.company.logoUrl)
          : item.company.logoUrl,
      },
    })),
  }
}

function isManagedLogoUrl(value: string | null): value is string {
  return Boolean(value && /^\/companies\/[\da-f-]{36}\/logo\?v=[\da-f-]{36}\.jpg$/i.test(value))
}

export function approveAdminCompany(id: string) {
  return apiRequest<{ company: AdminCompany }>(
    `/admin/companies/${encodeURIComponent(id)}/approve`,
    { method: 'PATCH' },
  )
}

export function rejectAdminCompany(id: string, reason: string) {
  return apiRequest<{ company: AdminCompany }>(
    `/admin/companies/${encodeURIComponent(id)}/reject`,
    { method: 'PATCH', body: JSON.stringify({ reason }) },
  )
}

export function suspendAdminCompany(id: string, reason: string) {
  return apiRequest<{ company: AdminCompany }>(
    `/admin/companies/${encodeURIComponent(id)}/suspend`,
    { method: 'PATCH', body: JSON.stringify({ reason }) },
  )
}

export function unsuspendAdminCompany(id: string) {
  return apiRequest<{ company: AdminCompany }>(
    `/admin/companies/${encodeURIComponent(id)}/unsuspend`,
    { method: 'PATCH' },
  )
}
