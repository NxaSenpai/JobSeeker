import { computed, shallowRef } from 'vue'

export type UserRole = 'USER' | 'COMPANY' | 'ADMIN'

export type AuthUser = {
  id: string
  email: string
  role: UserRole
  emailVerified: boolean
  firstName?: string | null
  lastName?: string | null
  companyName?: string | null
  contactName?: string | null
  headline?: string | null
  location?: string | null
  bio?: string | null
}

export type AuthSession = {
  accessToken: string
  user: AuthUser
}

const authStorageKey = 'jobseeker.auth.session'
let expiryTimer: ReturnType<typeof setTimeout> | undefined

function expiresAt(session: AuthSession): number {
  try {
    const encoded = session.accessToken.split('.')[1]!
    const payload = JSON.parse(atob(encoded.replace(/-/g, '+').replace(/_/g, '/'))) as { exp: number; sub: string }
    return payload.sub === session.user.id && Number.isFinite(payload.exp) ? payload.exp * 1000 : 0
  } catch { return 0 }
}

function readSession(storage: Storage): AuthSession | null {
  try {
    const rawSession = storage.getItem(authStorageKey)
    if (!rawSession) return null
    const session = JSON.parse(rawSession) as AuthSession | null
    if (session && typeof session.accessToken === 'string' && typeof session.user?.id === 'string'
      && typeof session.user.email === 'string' && ['USER', 'COMPANY', 'ADMIN'].includes(session.user.role)
      && session.user.emailVerified === true && expiresAt(session) > Date.now()) return session
    storage.removeItem(authStorageKey)
    return null
  } catch {
    return null
  }
}

function readStoredSession(): AuthSession | null {
  if (typeof window === 'undefined') return null
  try { return readSession(window.sessionStorage) ?? readSession(window.localStorage) } catch { return null }
}

const sessionState = shallowRef<AuthSession | null>(readStoredSession())
export const currentUser = computed(() => sessionState.value?.user ?? null)
export const isJobSeeker = computed(() => currentUser.value?.role === 'USER')
export const isSignedIn = computed(() => currentUser.value !== null)

function setSession(session: AuthSession | null) {
  clearTimeout(expiryTimer)
  sessionState.value = session
  if (session) expiryTimer = setTimeout(clearAuthSession, Math.min(expiresAt(session) - Date.now(), 2_147_483_647))
}

export function getAuthSession(): AuthSession | null {
  if (sessionState.value && expiresAt(sessionState.value) <= Date.now()) clearAuthSession()
  return sessionState.value
}

export function saveAuthSession(session: AuthSession, rememberMe: boolean) {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(authStorageKey)
  window.sessionStorage.removeItem(authStorageKey)
  const storage = rememberMe ? window.localStorage : window.sessionStorage
  storage.setItem(authStorageKey, JSON.stringify(session))
  setSession(session)
}

export function clearAuthSession() {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.removeItem(authStorageKey)
    window.sessionStorage.removeItem(authStorageKey)
  } finally { setSession(null) }
}

export function updateAuthUser(user: AuthUser) {
  const session = getAuthSession()
  if (session && session.user.id === user.id) {
    saveAuthSession({ ...session, user }, window.localStorage.getItem(authStorageKey) !== null)
  }
}

if (typeof window !== 'undefined') {
  setSession(sessionState.value)
  window.addEventListener('storage', (event) => {
    if (event.key === authStorageKey || event.key === null) setSession(readStoredSession())
  })
}

export function dashboardPathForRole(role: UserRole) {
  if (role === 'COMPANY') return '/company/dashboard'
  if (role === 'ADMIN') return '/admin'
  return '/'
}

export function displayNameForUser(user: AuthUser) {
  const fullName = [user.firstName, user.lastName]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(' ')
    .trim()

  return fullName || user.contactName?.trim() || user.companyName?.trim() || user.email
}

export function initialsForUser(user: AuthUser) {
  const name = displayNameForUser(user)
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')

  return initials.toUpperCase() || 'JS'
}
