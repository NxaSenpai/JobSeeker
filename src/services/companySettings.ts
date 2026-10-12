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

export function readLegacyCompanyProfile(): Partial<CompanySettings> | null {
  try {
    const saved = localStorage.getItem(settingsKey)
    if (!saved) return null
    const parsed = JSON.parse(saved) as Partial<CompanySettings>
    const profileKeys = [
      'companyName',
      'industry',
      'companySize',
      'founded',
      'website',
      'location',
      'description',
      'contactEmail',
      'contactName',
    ] as const
    if (!profileKeys.some(key => typeof parsed[key] === 'string' && parsed[key]!.trim())) return null
    const legacy: Partial<CompanySettings> = {}
    for (const key of [
      'companyName',
      'industry',
      'companySize',
      'founded',
      'website',
      'location',
      'description',
      'contactEmail',
      'contactName',
      'timezone',
    ] as const) {
      if (typeof parsed[key] === 'string' && parsed[key]!.trim()) {
        legacy[key] = parsed[key]
      }
    }
    return Object.keys(legacy).length ? legacy : null
  } catch {
    return null
  }
}

export function clearLegacyCompanyProfile() {
  try {
    const saved = localStorage.getItem(settingsKey)
    if (!saved) return
    const parsed = JSON.parse(saved) as Partial<CompanySettings>
    for (const key of [
      'companyName',
      'industry',
      'companySize',
      'founded',
      'website',
      'location',
      'description',
      'contactEmail',
      'contactName',
    ] as const) {
      delete parsed[key]
    }
    localStorage.setItem(settingsKey, JSON.stringify(parsed))
  } catch {
    // The API remains the source of truth if old browser storage is unavailable.
  }
}

export function saveCompanySettings(settings: CompanySettings) {
  try {
    // Only workspace preferences remain local. Company profile fields are
    // stored by the company profile API.
    localStorage.setItem(settingsKey, JSON.stringify({
      timezone: settings.timezone,
      darkMode: settings.darkMode,
      emailNewApplicant: settings.emailNewApplicant,
      emailInterviewReminder: settings.emailInterviewReminder,
      weeklySummary: settings.weeklySummary,
    }))
    return true
  } catch {
    return false
  }
}
