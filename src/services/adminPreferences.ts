import { ref, watch } from 'vue'

export const adminPageScaleOptions = [75, 100, 125, 150] as const
export type AdminPageScale = (typeof adminPageScaleOptions)[number]

const pageScaleStorageKey = 'jobseeker.admin.page-scale'
const darkModeStorageKey = 'jobseeker.admin.dark-mode'

function readPageScale(): AdminPageScale {
  if (typeof window === 'undefined') return 100

  try {
    const saved = Number(window.localStorage.getItem(pageScaleStorageKey))
    return adminPageScaleOptions.includes(saved as AdminPageScale)
      ? saved as AdminPageScale
      : 100
  } catch {
    return 100
  }
}

export const adminPageScale = ref<AdminPageScale>(readPageScale())

watch(adminPageScale, (scale) => {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(pageScaleStorageKey, String(scale))
  } catch {
    // Keep the selected scale for this session if browser storage is unavailable.
  }
}, { flush: 'sync' })

export function setAdminPageScale(scale: AdminPageScale) {
  adminPageScale.value = scale
}

function readDarkMode() {
  if (typeof window === 'undefined') return false

  try {
    return window.localStorage.getItem(darkModeStorageKey) === 'true'
  } catch {
    return false
  }
}

export const adminDarkMode = ref(readDarkMode())

watch(adminDarkMode, (enabled) => {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(darkModeStorageKey, String(enabled))
  } catch {
    // Keep the selected theme for this session if browser storage is unavailable.
  }
}, { flush: 'sync' })

export function setAdminDarkMode(enabled: boolean) {
  adminDarkMode.value = enabled
}
