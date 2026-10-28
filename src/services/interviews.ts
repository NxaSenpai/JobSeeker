import { apiRequest } from './api'

export type InterviewType = 'ONSITE' | 'ONLINE' | 'PHONE'
export type InterviewStatus = 'SCHEDULED' | 'CANCELLED'
export type InterviewApplicationStatus = 'APPLIED' | 'UNDER_REVIEW' | 'SHORTLISTED' | 'INTERVIEW' | 'OFFERED' | 'HIRED' | 'REJECTED' | 'WITHDRAWN'

export type InterviewRecord = {
  id: string
  applicationId: string
  job: { id: string; title: string; company: string }
  applicationStatus: InterviewApplicationStatus
  scheduledAt: string
  type: InterviewType
  location: string | null
  meetingUrl: string | null
  notes: string
  status: InterviewStatus
  cancelledAt: string | null
  createdAt: string
  updatedAt: string
}

export async function fetchCandidateInterviews(page = 1, limit = 20, applicationId?: string) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (applicationId) params.set('applicationId', applicationId)
  return apiRequest<{ interviews: InterviewRecord[]; total: number; page: number; limit: number }>(
    `/interviews/me?${params}`,
  )
}

export async function scheduleCompanyInterview(
  applicationId: string,
  details: {
    scheduledAt: string
    type: InterviewType
    location: string | null
    meetingUrl: string | null
    notes: string
  },
) {
  return apiRequest<{ interview: InterviewRecord }>(
    `/company/applications/${encodeURIComponent(applicationId)}/interviews`,
    { method: 'POST', body: JSON.stringify(details) },
  )
}
