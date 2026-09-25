import { ref } from 'vue'
import type { AuthUser } from './auth'
import { readCompanySettings } from './companySettings'

export const companyDarkMode = ref(false)

export function syncCompanyDarkMode(user?: AuthUser | null) {
  companyDarkMode.value = readCompanySettings(user).darkMode
}

export function setCompanyDarkMode(enabled: boolean) {
  companyDarkMode.value = enabled
}
