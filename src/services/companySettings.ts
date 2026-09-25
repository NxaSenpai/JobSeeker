import type { AuthUser } from '@/services/auth'

export type CompanySettings = {
  companyName: string
  industry: string
  companySize: string
  founded: string
  website: string
  location: string
  description: string
  contactName: string
  contactEmail: string
  timezone: string
  darkMode: boolean
  emailNewApplicant: boolean
  emailInterviewReminder: boolean
  weeklySummary: boolean
}

const settingsKey = 'jobseeker.company.settings'

function defaultsFor(user?: AuthUser | null): CompanySettings {
  return {
    companyName: user?.companyName ?? '',
    industry: '',
    companySize: '',
    founded: '',
    website: '',
    location: user?.location ?? '',
    description: user?.bio ?? '',
    contactName: user?.contactName ?? '',
    contactEmail: user?.email ?? '',
    timezone: 'Asia/Phnom_Penh',
    darkMode: false,
    emailNewApplicant: true,
    emailInterviewReminder: true,
    weeklySummary: false,
  }
}

export function readCompanySettings(user?: AuthUser | null): CompanySettings {
  const defaults = defaultsFor(user)
  try {
    const saved = localStorage.getItem(settingsKey)
    return saved ? { ...defaults, ...JSON.parse(saved) as Partial<CompanySettings> } : defaults
  } catch {
    return defaults
  }
}

export function saveCompanySettings(settings: CompanySettings) {
  try {
    localStorage.setItem(settingsKey, JSON.stringify(settings))
    return true
  } catch {
    return false
  }
}
