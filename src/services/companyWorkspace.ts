import { ref } from 'vue'

export type JobStatus = 'Published' | 'Draft' | 'Closed'

export type CompanyJob = {
  id: string
  title: string
  team: string
  location: string
  arrangement: string
  applicants: number
  views: number
  status: JobStatus
  postedAt: string
}

const jobsKey = 'jobseeker.company.workspace.jobs'

function daysAgo(days: number) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString()
}

function readStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const saved = window.localStorage.getItem(key)
    return saved ? JSON.parse(saved) as T : fallback
  } catch {
    return fallback
  }
}

function saveStored<T>(key: string, value: T) {
  try { window.localStorage.setItem(key, JSON.stringify(value)) } catch { /* Storage can be unavailable in private browsing. */ }
}

const initialJobs: CompanyJob[] = [
  { id: 'senior-product-designer', title: 'Senior Product Designer', team: 'Product & Design', location: 'Phnom Penh', arrangement: 'Hybrid', applicants: 48, views: 1284, status: 'Published', postedAt: daysAgo(3) },
  { id: 'frontend-developer', title: 'Frontend Developer', team: 'Engineering', location: 'Remote', arrangement: 'Full-time', applicants: 36, views: 946, status: 'Published', postedAt: daysAgo(5) },
  { id: 'marketing-specialist', title: 'Marketing Specialist', team: 'Growth', location: 'Phnom Penh', arrangement: 'Hybrid', applicants: 22, views: 734, status: 'Published', postedAt: daysAgo(8) },
  { id: 'product-manager', title: 'Product Manager', team: 'Product', location: 'Phnom Penh', arrangement: 'Full-time', applicants: 18, views: 512, status: 'Published', postedAt: daysAgo(10) },
  { id: 'backend-engineer', title: 'Backend Engineer', team: 'Engineering', location: 'Remote', arrangement: 'Full-time', applicants: 27, views: 1180, status: 'Published', postedAt: daysAgo(12) },
  { id: 'qa-automation-engineer', title: 'QA Automation Engineer', team: 'Engineering', location: 'Phnom Penh', arrangement: 'Hybrid', applicants: 20, views: 884, status: 'Published', postedAt: daysAgo(14) },
  { id: 'data-analyst', title: 'Data Analyst', team: 'Data', location: 'Phnom Penh', arrangement: 'Full-time', applicants: 17, views: 650, status: 'Published', postedAt: daysAgo(16) },
  { id: 'customer-success-lead', title: 'Customer Success Lead', team: 'Customer Experience', location: 'Remote', arrangement: 'Full-time', applicants: 15, views: 447, status: 'Published', postedAt: daysAgo(18) },
  { id: 'ux-researcher', title: 'UX Researcher', team: 'Product & Design', location: 'Phnom Penh', arrangement: 'Hybrid', applicants: 14, views: 392, status: 'Published', postedAt: daysAgo(20) },
  { id: 'devops-engineer', title: 'DevOps Engineer', team: 'Engineering', location: 'Remote', arrangement: 'Full-time', applicants: 13, views: 318, status: 'Published', postedAt: daysAgo(22) },
  { id: 'content-strategist', title: 'Content Strategist', team: 'Growth', location: 'Phnom Penh', arrangement: 'Contract', applicants: 11, views: 271, status: 'Published', postedAt: daysAgo(24) },
  { id: 'people-operations-coordinator', title: 'People Operations Coordinator', team: 'People', location: 'Phnom Penh', arrangement: 'Full-time', applicants: 5, views: 156, status: 'Published', postedAt: daysAgo(27) },
  { id: 'growth-marketing-manager', title: 'Growth Marketing Manager', team: 'Growth', location: 'Phnom Penh', arrangement: 'Hybrid', applicants: 0, views: 87, status: 'Draft', postedAt: daysAgo(1) },
  { id: 'corporate-recruiter', title: 'Corporate Recruiter', team: 'People', location: 'Phnom Penh', arrangement: 'Full-time', applicants: 0, views: 403, status: 'Closed', postedAt: daysAgo(35) },
]

export const companyJobs = ref(readStored(jobsKey, initialJobs))

export function createCompanyJob(input: Pick<CompanyJob, 'title' | 'team' | 'location' | 'arrangement'>) {
  const job: CompanyJob = { ...input, id: `job-${Date.now()}`, applicants: 0, views: 0, status: 'Draft', postedAt: new Date().toISOString() }
  companyJobs.value = [job, ...companyJobs.value]
  saveStored(jobsKey, companyJobs.value)
  return job
}

export function updateCompanyJobStatus(id: string, status: JobStatus) {
  companyJobs.value = companyJobs.value.map(job => job.id === id ? { ...job, status } : job)
  saveStored(jobsKey, companyJobs.value)
}

export function relativeApplicationDate(value: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000))
  if (minutes < 60) return `${minutes || 1} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value))
}

export function upcomingInterviewDate(daysAhead: number) {
  const date = new Date()
  date.setDate(date.getDate() + daysAhead)
  return date.toISOString()
}

export const upcomingInterviews = [
  { date: upcomingInterviewDate(2), name: 'Ava Williams', role: 'Product Designer', time: '10:00 AM', applicantId: 'ava-williams', color: 'coral' },
  { date: upcomingInterviewDate(4), name: 'Daniel Kim', role: 'Product Manager', time: '02:30 PM', applicantId: 'daniel-kim', color: 'orange' },
  { date: upcomingInterviewDate(7), name: 'Maria Garcia', role: 'Frontend Developer', time: '11:00 AM', applicantId: 'maria-garcia', color: 'purple' },
]
