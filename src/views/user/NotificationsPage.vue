<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import AccountPageFrame from '@/components/public/AccountPageFrame.vue'
import { apiRequest } from '@/services/api'
import { dateLabel } from '@/services/candidate'
import { setUnreadNotificationCount, subscribeToRealtimeNotifications, unreadNotificationCount } from '@/services/notifications'
type Notification = { id: string; title: string; message: string; link: string; readAt: string | null; createdAt: string }
const items = ref<Notification[]>([]); const loading = ref(true); const busy = ref(false); const error = ref(''); const page = ref(1); const total = ref(0)
let loadSequence = 0
async function load() {
  const sequence = ++loadSequence
  loading.value = true; error.value = ''
  try { const data = await apiRequest<{ notifications: Notification[]; total: number }>(`/notifications?page=${page.value}&limit=20`); if (sequence === loadSequence) { items.value = data.notifications; total.value = data.total } }
  catch (cause) { if (sequence === loadSequence) error.value = cause instanceof Error ? cause.message : 'Unable to load notifications.' }
  finally { if (sequence === loadSequence) loading.value = false }
}
async function markRead(item?: Notification) {
  if (busy.value) return
  busy.value = true; error.value = ''
  try {
    await apiRequest(item ? `/notifications/${item.id}/read` : '/notifications/read-all', { method: 'PATCH' })
    const wasUnread = item ? !item.readAt : unreadNotificationCount.value > 0
    items.value.forEach(entry => { if (!item || item.id === entry.id) entry.readAt = new Date().toISOString() })
    if (!item) setUnreadNotificationCount(0)
    else if (wasUnread) setUnreadNotificationCount(unreadNotificationCount.value - 1)
  }
  catch (cause) { error.value = cause instanceof Error ? cause.message : 'Unable to update notifications.' }
  finally { busy.value = false }
}
const unsubscribeRealtime = subscribeToRealtimeNotifications(() => { if (page.value === 1) void load() })
onBeforeUnmount(unsubscribeRealtime)
watch(page, load, { immediate: true })
</script>
<template><AccountPageFrame title="Your notifications" description="Updates about your applications, in one place."><p v-if="error" role="alert" class="account-feedback account-error mb-5">{{ error }} <button class="underline" @click="load">Try again</button></p><p v-if="loading" role="status" class="account-muted">Loading notifications…</p><template v-else-if="items.length"><button class="account-secondary mb-5" :disabled="busy" @click="markRead()">Mark all as read</button><div class="grid gap-4"><article v-for="item in items" :key="item.id" class="account-panel" :class="{ 'unread-notification': !item.readAt }"><div class="flex flex-wrap justify-between gap-3"><h2>{{ item.title }}</h2><span class="account-muted">{{ dateLabel(item.createdAt) }}</span></div><p class="account-muted my-4">{{ item.message }}</p><div class="flex flex-wrap items-center gap-6"><router-link :to="item.link" class="text-sm font-semibold text-[#6b58d4]" @click="markRead(item)">View application →</router-link><button v-if="!item.readAt" class="text-sm underline" :disabled="busy" @click="markRead(item)">Mark as read</button></div></article></div><nav v-if="total > 20" class="mt-5 flex gap-4" aria-label="Notification pages"><button class="account-secondary" :disabled="page === 1 || loading" @click="page--">Previous</button><button class="account-secondary" :disabled="page * 20 >= total || loading" @click="page++">Next</button></nav></template><div v-else-if="!error" class="account-empty"><h2>You’re all caught up</h2><p>Application updates will appear here.</p></div></AccountPageFrame></template>
<style scoped>.unread-notification { border-left: 3px solid #705aef; background: #fcfbff; }</style>
