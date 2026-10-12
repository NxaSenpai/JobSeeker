import { io, type Socket } from 'socket.io-client'
import { ref } from 'vue'
import { apiRequest } from './api'
import { getAuthSession } from './auth'

export type CompanyNotification = {
  id: string
  title: string
  message: string
  link: string
  readAt: string | null
  createdAt: string
}

const apiBaseUrl = (
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1'
).replace(/\/$/, '')

export const companyNotifications = ref<CompanyNotification[]>([])
export const companyUnreadNotificationCount = ref(0)
export const companyNotificationsLoading = ref(false)
export const companyNotificationsError = ref('')

let activeSocket: Socket | null = null
let activeToken: string | null = null
let latestRequest = 0
let refreshTimer: number | undefined
let focusRefreshHandler: (() => void) | undefined
let visibilityRefreshHandler: (() => void) | undefined

function parseNotification(value: unknown): CompanyNotification | null {
  if (!value || typeof value !== 'object') return null
  const item = value as Partial<CompanyNotification>
  if (
    typeof item.id !== 'string' ||
    typeof item.title !== 'string' ||
    typeof item.message !== 'string' ||
    typeof item.link !== 'string' ||
    typeof item.createdAt !== 'string' ||
    (item.readAt !== null && typeof item.readAt !== 'string')
  ) return null
  return {
    id: item.id,
    title: item.title,
    message: item.message,
    link: item.link,
    readAt: item.readAt ?? null,
    createdAt: item.createdAt,
  }
}

export function startCompanyNotificationRealtime() {
  const session = getAuthSession()
  if (!session || session.user.role !== 'COMPANY') {
    stopCompanyNotificationRealtime()
    companyNotifications.value = []
    companyUnreadNotificationCount.value = 0
    return
  }
  if (activeSocket && activeToken === session.accessToken) return

  stopCompanyNotificationRealtime()
  companyNotifications.value = []
  companyUnreadNotificationCount.value = 0
  companyNotificationsError.value = ''
  activeToken = session.accessToken
  const apiUrl = new URL(apiBaseUrl, window.location.origin)
  const socket = io(`${apiUrl.origin}/notifications`, {
    auth: { token: session.accessToken },
    transports: ['websocket'],
    reconnection: true,
    timeout: 10_000,
  })
  activeSocket = socket

  socket.on('connect', () => void refreshCompanyNotifications())
  socket.on('notification.created', (value: unknown) => {
    if (getAuthSession()?.accessToken !== session.accessToken) return
    const notification = parseNotification(value)
    if (!notification) return
    if (companyNotifications.value.some((item) => item.id === notification.id)) {
      void refreshCompanyNotifications()
      return
    }
    companyUnreadNotificationCount.value += 1
    companyNotifications.value = [
      notification,
      ...companyNotifications.value.filter((item) => item.id !== notification.id),
    ].slice(0, 5)
    void refreshCompanyNotifications()
  })

  focusRefreshHandler = () => {
    if (document.visibilityState === 'visible') void refreshCompanyNotifications()
  }
  visibilityRefreshHandler = () => {
    if (document.visibilityState === 'visible') void refreshCompanyNotifications()
  }
  window.addEventListener('focus', focusRefreshHandler)
  document.addEventListener('visibilitychange', visibilityRefreshHandler)
  refreshTimer = window.setInterval(() => {
    if (document.visibilityState === 'visible') void refreshCompanyNotifications()
  }, 60_000)
}

export async function refreshCompanyNotifications() {
  const session = getAuthSession()
  if (!session || session.user.role !== 'COMPANY') {
    companyNotifications.value = []
    companyUnreadNotificationCount.value = 0
    return
  }

  const requestId = ++latestRequest
  companyNotificationsLoading.value = true
  companyNotificationsError.value = ''
  try {
    const [page, unread] = await Promise.all([
      apiRequest<{ notifications: CompanyNotification[]; total: number }>(
        '/company/notifications?page=1&limit=5',
      ),
      apiRequest<{ count: number }>('/company/notifications/unread-count'),
    ])
    if (
      requestId !== latestRequest ||
      getAuthSession()?.accessToken !== session.accessToken
    ) return
    companyNotifications.value = page.notifications
    companyUnreadNotificationCount.value = Math.max(0, Math.floor(Number(unread.count) || 0))
  } catch (cause) {
    if (requestId === latestRequest) {
      companyNotificationsError.value = cause instanceof Error
        ? cause.message
        : 'Unable to load company notifications.'
    }
  } finally {
    if (requestId === latestRequest) companyNotificationsLoading.value = false
  }
}

export async function markAllCompanyNotificationsRead() {
  await apiRequest<{ updated: boolean }>('/company/notifications/read-all', {
    method: 'PATCH',
  })
  latestRequest += 1
  companyNotificationsLoading.value = false
  companyNotificationsError.value = ''
  const readAt = new Date().toISOString()
  companyNotifications.value = companyNotifications.value.map((item) => ({
    ...item,
    readAt: item.readAt ?? readAt,
  }))
  companyUnreadNotificationCount.value = 0
}

export async function markCompanyNotificationRead(id: string) {
  const notification = companyNotifications.value.find((item) => item.id === id)
  if (!notification || notification.readAt) return
  await apiRequest<{ updated: boolean }>(
    `/company/notifications/${encodeURIComponent(id)}/read`,
    { method: 'PATCH' },
  )
  latestRequest += 1
  companyNotificationsLoading.value = false
  companyNotificationsError.value = ''
  notification.readAt = new Date().toISOString()
  companyUnreadNotificationCount.value = Math.max(
    0,
    companyUnreadNotificationCount.value - 1,
  )
}

export function stopCompanyNotificationRealtime() {
  latestRequest += 1
  if (refreshTimer !== undefined) window.clearInterval(refreshTimer)
  refreshTimer = undefined
  if (focusRefreshHandler) window.removeEventListener('focus', focusRefreshHandler)
  if (visibilityRefreshHandler) document.removeEventListener('visibilitychange', visibilityRefreshHandler)
  focusRefreshHandler = undefined
  visibilityRefreshHandler = undefined
  if (activeSocket) {
    activeSocket.removeAllListeners()
    activeSocket.disconnect()
  }
  activeSocket = null
  activeToken = null
}
