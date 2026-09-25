import { ref } from 'vue'

export const unreadNotificationCount = ref(0)

export type RealtimeNotification = {
  id: string
  title: string
  message: string
  link: string
  readAt: null
  createdAt: string
}

const realtimeListeners = new Set<(notification: RealtimeNotification) => void>()

export function setUnreadNotificationCount(value: number) {
  unreadNotificationCount.value = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
}

export function incrementUnreadNotificationCount() {
  setUnreadNotificationCount(unreadNotificationCount.value + 1)
}

export function announceRealtimeNotification(notification: RealtimeNotification) {
  for (const listener of realtimeListeners) listener(notification)
}

export function subscribeToRealtimeNotifications(
  listener: (notification: RealtimeNotification) => void,
) {
  realtimeListeners.add(listener)
  return () => realtimeListeners.delete(listener)
}
