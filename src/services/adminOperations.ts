import { apiRequest } from './api'

export type AdminUserRole = 'USER' | 'COMPANY' | 'ADMIN'

export type AdminUser = {
  id: string
  email: string
  role: AdminUserRole
  firstName: string | null
  lastName: string | null
  companyName: string | null
  contactName: string | null
  emailVerified: boolean
  suspendedAt: string | null
  suspensionReason: string | null
  createdAt: string
  updatedAt: string
}

export type AdminUserList = {
  users: AdminUser[]
  total: number
  page: number
  limit: number
}

export type AdminJob = {
  id: string
  title: string
  company: string
  location: string
  category: string | null
  industry: string | null
  jobType: string
  workplaceType: string
  summary: string
  description: string
  responsibilities: string[]
  requirements: string[]
  benefits: string[]
  skills: string[]
  moderationStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'HIDDEN'
  moderationNote: string | null
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED'
  createdAt: string
  updatedAt: string
  companyProfile: { id: string; name: string; isVerified: boolean } | null
}

export type AdminJobList = {
  jobs: AdminJob[]
  total: number
  page: number
  limit: number
}

export function listAdminUsers(query: {
  search?: string
  role?: AdminUserRole | ''
  suspended?: boolean | null
  page?: number
}) {
  const params = new URLSearchParams({ page: String(query.page ?? 1), limit: '20' })
  if (query.search?.trim()) params.set('search', query.search.trim())
  if (query.role) params.set('role', query.role)
  if (query.suspended !== null && query.suspended !== undefined) {
    params.set('suspended', String(query.suspended))
  }
  return apiRequest<AdminUserList>(`/admin/users?${params.toString()}`)
}

export function getAdminUser(id: string) {
  return apiRequest<{ user: AdminUser }>(`/admin/users/${encodeURIComponent(id)}`)
}

export function suspendAdminUser(id: string, reason: string) {
  return apiRequest<{ user: AdminUser }>(`/admin/users/${encodeURIComponent(id)}/suspend`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  })
}

export function unsuspendAdminUser(id: string) {
  return apiRequest<{ user: AdminUser }>(`/admin/users/${encodeURIComponent(id)}/unsuspend`, {
    method: 'PATCH',
  })
}

export function listAdminJobs(query: {
  search?: string
  moderationStatus?: AdminJob['moderationStatus'] | 'ALL'
  status?: AdminJob['status'] | 'ALL'
  page?: number
}) {
  const params = new URLSearchParams({
    page: String(query.page ?? 1),
    limit: '20',
    moderationStatus: query.moderationStatus ?? 'PENDING',
    status: query.status ?? 'PUBLISHED',
  })
  if (query.search?.trim()) params.set('search', query.search.trim())
  return apiRequest<AdminJobList>(`/admin/jobs?${params.toString()}`)
}

export function approveAdminJob(id: string) {
  return apiRequest<{ job: AdminJob }>(`/admin/jobs/${encodeURIComponent(id)}/approve`, { method: 'PATCH' })
}

export function rejectAdminJob(id: string, reason: string) {
  return apiRequest<{ job: AdminJob }>(`/admin/jobs/${encodeURIComponent(id)}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  })
}

export function hideAdminJob(id: string, reason: string) {
  return apiRequest<{ job: AdminJob }>(`/admin/jobs/${encodeURIComponent(id)}/hide`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  })
}

export function restoreAdminJob(id: string) {
  return apiRequest<{ job: AdminJob }>(`/admin/jobs/${encodeURIComponent(id)}/restore`, { method: 'PATCH' })
}
