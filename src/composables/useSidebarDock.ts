import { ref, watch, type Ref } from 'vue'

const preferences = new Map<string, Ref<boolean>>()

function readPreference(key: string) {
  if (typeof window === 'undefined') return false

  try {
    return window.localStorage.getItem(key) === 'true'
  } catch {
    return false
  }
}

export function useSidebarDock(key: string) {
  const existing = preferences.get(key)
  if (existing) return existing

  const sidebarCollapsed = ref(readPreference(key))

  watch(sidebarCollapsed, (collapsed) => {
    if (typeof window === 'undefined') return

    try {
      window.localStorage.setItem(key, String(collapsed))
    } catch {
      // Keep the current in-memory preference if storage is unavailable.
    }
  }, { flush: 'sync' })

  preferences.set(key, sidebarCollapsed)
  return sidebarCollapsed
}
