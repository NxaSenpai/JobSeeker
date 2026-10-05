import { apiRequest } from './api'

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

export type AdminCompanyQuery = {
  page?: number
  limit?: number
  search?: string
}

export function listAdminCompanies(query: AdminCompanyQuery = {}) {
  const params = new URLSearchParams({
    page: String(query.page ?? 1),
    limit: String(query.limit ?? 20),
    status: 'PENDING',
  })
  if (query.search?.trim()) params.set('search', query.search.trim())
  return apiRequest<AdminCompanyListResponse>(`/admin/companies?${params.toString()}`)
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
