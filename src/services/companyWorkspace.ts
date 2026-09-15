import { ref } from 'vue'

export type JobStatus = 'Published' | 'Draft' | 'Closed'
export type ApplicantStatus = 'New' | 'Under review' | 'Interview' | 'Shortlisted' | 'Hired' | 'Rejected'

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

export type CompanyApplicant = {
  id: string
  name: string
  initials: string
  role: string
  jobId: string
  appliedAt: string
  status: ApplicantStatus
  location: string
  experience: string
  source: string
  summary: string
  skills: string[]
  color: 'coral' | 'blue' | 'purple' | 'orange'
}

const jobsKey = 'jobseeker.company.workspace.jobs'
const applicantsKey = 'jobseeker.company.workspace.applicants'

function daysAgo(days: number) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString()
}

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
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

const initialApplicants: CompanyApplicant[] = [
  { id: 'ava-williams', name: 'Ava Williams', initials: 'AW', role: 'Senior Product Designer', jobId: 'senior-product-designer', appliedAt: hoursAgo(1), status: 'Shortlisted', location: 'Phnom Penh', experience: '6 years in product design', source: 'Company website', summary: 'Ava has led product design for two early-stage teams, with a strong focus on research-led workflows and accessible interfaces.', skills: ['Product design', 'Figma', 'User research'], color: 'coral' },
  { id: 'james-miller', name: 'James Miller', initials: 'JM', role: 'Frontend Developer', jobId: 'frontend-developer', appliedAt: hoursAgo(3), status: 'Under review', location: 'Remote · Singapore', experience: '5 years in frontend engineering', source: 'JobSeeker search', summary: 'James builds customer-facing applications with Vue and TypeScript and has experience improving performance in production.', skills: ['Vue', 'TypeScript', 'Accessibility'], color: 'blue' },
  { id: 'sophia-lee', name: 'Sophia Lee', initials: 'SL', role: 'Marketing Specialist', jobId: 'marketing-specialist', appliedAt: hoursAgo(7), status: 'New', location: 'Phnom Penh', experience: '4 years in growth marketing', source: 'Referral', summary: 'Sophia has managed lifecycle campaigns for regional consumer products and works comfortably across content and analytics.', skills: ['Lifecycle marketing', 'Analytics', 'Content'], color: 'purple' },
  { id: 'daniel-kim', name: 'Daniel Kim', initials: 'DK', role: 'Product Manager', jobId: 'product-manager', appliedAt: hoursAgo(20), status: 'Interview', location: 'Phnom Penh', experience: '7 years in product management', source: 'Company website', summary: 'Daniel has taken B2B tools from discovery through launch and has worked closely with engineering and customer teams.', skills: ['Product strategy', 'Roadmapping', 'Research'], color: 'orange' },
  { id: 'maria-garcia', name: 'Maria Garcia', initials: 'MG', role: 'Frontend Developer', jobId: 'frontend-developer', appliedAt: hoursAgo(29), status: 'New', location: 'Remote · Kuala Lumpur', experience: '3 years in web development', source: 'JobSeeker search', summary: 'Maria is a frontend engineer focused on Vue applications, component systems, and reliable browser testing.', skills: ['Vue', 'CSS', 'Playwright'], color: 'purple' },
  { id: 'ravi-patel', name: 'Ravi Patel', initials: 'RP', role: 'Backend Engineer', jobId: 'backend-engineer', appliedAt: hoursAgo(42), status: 'Under review', location: 'Remote · Bangkok', experience: '8 years in backend engineering', source: 'Referral', summary: 'Ravi has designed APIs and data services for high-volume products and mentors junior engineers.', skills: ['Node.js', 'PostgreSQL', 'API design'], color: 'blue' },
  { id: 'nita-soth', name: 'Nita Soth', initials: 'NS', role: 'Senior Product Designer', jobId: 'senior-product-designer', appliedAt: hoursAgo(51), status: 'Shortlisted', location: 'Phnom Penh', experience: '5 years in product design', source: 'JobSeeker search', summary: 'Nita has worked across research, interaction design, and design systems for mobile and web products.', skills: ['Interaction design', 'Prototyping', 'Design systems'], color: 'coral' },
  { id: 'david-chen', name: 'David Chen', initials: 'DC', role: 'Data Analyst', jobId: 'data-analyst', appliedAt: hoursAgo(73), status: 'New', location: 'Remote · Ho Chi Minh City', experience: '4 years in analytics', source: 'Company website', summary: 'David turns product and commercial data into clear reporting for teams making day-to-day decisions.', skills: ['SQL', 'Looker', 'Experimentation'], color: 'orange' },
  { id: 'pich-sokha', name: 'Pich Sokha', initials: 'PS', role: 'QA Automation Engineer', jobId: 'qa-automation-engineer', appliedAt: hoursAgo(92), status: 'Interview', location: 'Phnom Penh', experience: '6 years in quality engineering', source: 'Referral', summary: 'Sokha has built browser and API test suites for cross-functional product teams.', skills: ['Playwright', 'API testing', 'CI'], color: 'blue' },
  { id: 'lina-martin', name: 'Lina Martin', initials: 'LM', role: 'UX Researcher', jobId: 'ux-researcher', appliedAt: hoursAgo(110), status: 'New', location: 'Remote · Singapore', experience: '5 years in user research', source: 'JobSeeker search', summary: 'Lina plans and synthesizes qualitative studies, then helps teams turn findings into product decisions.', skills: ['Interviewing', 'Usability testing', 'Synthesis'], color: 'purple' },
]

export const companyJobs = ref(readStored(jobsKey, initialJobs))
export const companyApplicants = ref(readStored(applicantsKey, initialApplicants))

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

export function updateApplicantStatus(id: string, status: ApplicantStatus) {
  companyApplicants.value = companyApplicants.value.map(applicant => applicant.id === id ? { ...applicant, status } : applicant)
  saveStored(applicantsKey, companyApplicants.value)
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
