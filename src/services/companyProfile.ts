import { apiRequest } from './api'

export type CompanyProfileRecord = {
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
  contactName?: string | null
  timezone: string | null
  socialLinks: Record<string, string>
  logoUrl: string | null
  bannerUrl: string | null
  isVerified: boolean
  moderationNote: string | null
  openJobs?: number
  createdAt: string
  updatedAt: string
}

export type CompanyProfileInput = {
  contactName?: string
  name?: string
  industry?: string
  companySize?: string
  foundedYear?: number | null
  location?: string
  website?: string
  description?: string
  contactEmail?: string
  timezone?: string
}

export async function loadCompanyProfile() {
  return apiRequest<{ company: CompanyProfileRecord }>('/company/profile')
}

export async function updateCompanyProfile(input: CompanyProfileInput) {
  return apiRequest<{ company: CompanyProfileRecord }>('/company/profile', {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export async function uploadCompanyLogo(file: File) {
  const body = new FormData()
  body.append('file', file)
  return apiRequest<{ company: CompanyProfileRecord }>('/company/profile/logo', {
    method: 'POST',
    body,
  })
}

export async function removeCompanyLogo() {
  return apiRequest<{ removed: boolean }>('/company/profile/logo', {
    method: 'DELETE',
  })
}
