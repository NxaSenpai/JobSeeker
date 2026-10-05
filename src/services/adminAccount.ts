import { apiRequest } from './api'

export type AdminProfile = {
  id: string
  email: string
  role: 'ADMIN'
  emailVerified: boolean
  firstName: string | null
  lastName: string | null
  createdAt: string
  updatedAt: string
}

export function getAdminProfile() {
  return apiRequest<{ profile: AdminProfile }>('/admin/profile')
}
