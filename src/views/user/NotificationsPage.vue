<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import AccountPageFrame from '@/components/public/AccountPageFrame.vue'
import { apiRequest } from '@/services/api'
import { setUnreadNotificationCount, subscribeToRealtimeNotifications, unreadNotificationCount } from '@/services/notifications'

type Notification = {
  id: string
  title: string
  message: string
  link: string
  readAt: string | null
  createdAt: string
}
const items = ref<Notification[]>([])
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const page = ref(1)
const total = ref(0)
let loadSequence = 0

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / 20)))

function notificationDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date)
}

function isInterview(item: Notification) {
  return item.title.toLowerCase().includes('interview') || item.link.includes('/interviews')
}

async function load() {
  const sequence = ++loadSequence
  loading.value = true
  error.value = ''
  try {
    const data = await apiRequest<{ notifications: Notification[]; total: number }>(`/notifications?page=${page.value}&limit=20`)
    if (sequence === loadSequence) {
      items.value = data.notifications
      total.value = data.total
    }
  } catch (cause) {
    if (sequence === loadSequence) error.value = cause instanceof Error ? cause.message : 'Unable to load notifications.'
  } finally {
    if (sequence === loadSequence) loading.value = false
  }
}

async function markRead(item?: Notification) {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    await apiRequest(item ? `/notifications/${item.id}/read` : '/notifications/read-all', { method: 'PATCH' })
    const wasUnread = item ? !item.readAt : unreadNotificationCount.value > 0
    const readAt = new Date().toISOString()
    items.value.forEach(entry => { if (!item || item.id === entry.id) entry.readAt = readAt })
    if (!item) setUnreadNotificationCount(0)
    else if (wasUnread) setUnreadNotificationCount(unreadNotificationCount.value - 1)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Unable to update notifications.'
  } finally {
    busy.value = false
  }
}

const unsubscribeRealtime = subscribeToRealtimeNotifications(() => { if (page.value === 1) void load() })
onBeforeUnmount(unsubscribeRealtime)
watch(page, load, { immediate: true })
</script>

<template>
  <AccountPageFrame title="Notifications" description="A clear record of application updates, interview plans, and important next steps.">
    <section class="notification-workspace" aria-label="Your notification activity">
      <div class="notification-overview">
        <div class="notification-overview-copy">
          <span class="notification-kicker">Your activity</span>
          <h2>Stay close to every update</h2>
          <p>Interview notices open with the full schedule, location, instructions, and current status.</p>
        </div>
        <div class="notification-stat" aria-live="polite">
          <span class="notification-stat-number">{{ unreadNotificationCount }}</span>
          <span class="notification-stat-label">unread</span>
        </div>
      </div>

      <div class="notification-tools">
        <span class="notification-activity-label">Latest activity <span>{{ total }}</span></span>
        <button type="button" class="mark-all-button" :disabled="busy || unreadNotificationCount === 0" @click="markRead()">Mark all as read</button>
      </div>

      <p v-if="error" role="alert" class="notification-error">{{ error }} <button type="button" @click="load">Try again</button></p>
      <div v-if="loading" role="status" class="notification-loading"><span></span><span>Loading your updates…</span></div>

      <div v-else-if="items.length" class="notification-list">
        <article v-for="item in items" :key="item.id" class="notification-item" :class="{ unread: !item.readAt, 'interview-item': isInterview(item) }">
          <span class="notification-item-mark" :class="{ 'interview-mark': isInterview(item) }" aria-hidden="true">
            <svg v-if="isInterview(item)" viewBox="0 0 24 24" fill="none"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" stroke="currentColor" stroke-width="1.7"/><path d="M7.5 3.5v3M16.5 3.5v3M4 9.5h16M8 13h3m-3 3h5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>
            <svg v-else viewBox="0 0 24 24" fill="none"><path d="M6 18.5h12M7.5 18.5V7.8A4.5 4.5 0 0 1 12 3.3a4.5 4.5 0 0 1 4.5 4.5v10.7M5.5 18.5h13M10 21h4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </span>
          <div class="notification-body">
            <div class="notification-item-topline">
              <div class="notification-title-wrap">
                <span v-if="!item.readAt" class="unread-dot" aria-label="Unread"></span>
                <h3>{{ item.title }}</h3>
              </div>
              <time :datetime="item.createdAt">{{ notificationDate(item.createdAt) }}</time>
            </div>
            <p>{{ item.message }}</p>
            <div class="notification-item-actions">
              <router-link :to="item.link" class="notification-open-link" @click="markRead(item)">
                {{ isInterview(item) ? 'Open interview details' : 'View application update' }}
                <span aria-hidden="true">→</span>
              </router-link>
              <button v-if="!item.readAt" type="button" class="mark-one-button" :disabled="busy" @click="markRead(item)">Mark as read</button>
              <span v-else class="read-label">Read</span>
            </div>
          </div>
        </article>
      </div>

      <div v-else-if="!error" class="notification-empty">
        <span class="empty-symbol" aria-hidden="true">✓</span>
        <h2>No notifications yet</h2>
        <p>Updates about your applications and interviews will appear here.</p>
        <router-link to="/applications">Review your applications <span aria-hidden="true">→</span></router-link>
      </div>

      <nav v-if="!loading && total > 20" class="notification-pagination" aria-label="Notification pages">
        <button type="button" :disabled="page === 1" @click="page--">← Previous</button>
        <span>Page {{ page }} of {{ pageCount }}</span>
        <button type="button" :disabled="page >= pageCount" @click="page++">Next →</button>
      </nav>
    </section>
  </AccountPageFrame>
</template>

<style scoped>
.notification-workspace { --notification-ink: #14234f; --notification-muted: #75809f; --notification-violet: #705aef; }
.notification-overview { position: relative; overflow: hidden; min-height: 145px; padding: 26px 30px; border: 1px solid #e2def2; border-radius: 14px; display: flex; justify-content: space-between; align-items: center; gap: 22px; background: radial-gradient(ellipse at 92% 0%, rgb(227 222 255 / 74%) 0, rgb(247 245 255 / 55%) 28%, transparent 58%), #fbfaff; }
.notification-overview::after { content: ''; position: absolute; right: 116px; top: -60px; width: 180px; height: 180px; border: 1px solid rgb(112 90 239 / 8%); border-radius: 50%; pointer-events: none; }
.notification-overview-copy { position: relative; z-index: 1; max-width: 600px; }
.notification-kicker { color: #7461d5; font-size: 10px; font-weight: 750; letter-spacing: .12em; text-transform: uppercase; }
.notification-overview h2 { margin: 6px 0 0; color: var(--notification-ink); font-size: clamp(21px, 3vw, 27px); font-weight: 700; letter-spacing: -.035em; line-height: 1.15; }
.notification-overview p { max-width: 500px; margin: 8px 0 0; color: #727d9a; font-size: 13px; line-height: 1.65; }
.notification-stat { position: relative; z-index: 1; min-width: 95px; padding: 13px 16px; border-left: 1px solid #ded9f1; display: grid; justify-items: center; gap: 2px; }
.notification-stat-number { color: #5140b6; font-size: 30px; font-weight: 750; line-height: 1; font-variant-numeric: tabular-nums; }
.notification-stat-label { color: #7b83a0; font-size: 11px; font-weight: 600; }
.notification-tools { min-height: 66px; margin: 18px 0 12px; display: flex; align-items: center; justify-content: space-between; gap: 18px; }
.notification-activity-label { display: inline-flex; align-items: center; gap: 9px; color: #4d5d83; font-size: 12px; font-weight: 700; }
.notification-activity-label span { min-width: 22px; height: 21px; padding: 0 5px; border-radius: 6px; display: grid; place-items: center; background: #f1effb; color: #6756c3; font-size: 10px; font-variant-numeric: tabular-nums; }
.mark-all-button { padding: 8px 0; border: 0; background: transparent; color: #6955d4; font-size: 12px; font-weight: 650; cursor: pointer; }
.mark-all-button:disabled { color: #a9acc0; cursor: default; }
.notification-error { margin: 0 0 14px; padding: 11px 13px; border-radius: 8px; background: #fff1f3; color: #a04457; font-size: 13px; }
.notification-error button { margin-left: 8px; text-decoration: underline; }
.notification-list { border: 1px solid #e7e3f0; border-radius: 12px; overflow: hidden; background: #fff; }
.notification-item { position: relative; padding: 22px 25px; display: grid; grid-template-columns: 42px minmax(0, 1fr); align-items: start; gap: 16px; transition: background 160ms ease; }
.notification-item + .notification-item { border-top: 1px solid #efedf5; }
.notification-item:hover { background: #fcfbff; }
.notification-item.unread { background: #fcfbff; }
.notification-item.unread::before { content: ''; position: absolute; inset: 0 auto 0 0; width: 3px; background: #7661e4; }
.notification-item-mark { width: 40px; height: 40px; border: 1px solid #e9e7f0; border-radius: 11px; display: grid; place-items: center; background: #f7f7fb; color: #77809a; }
.notification-item-mark svg { width: 20px; height: 20px; }
.notification-item-mark.interview-mark { border-color: #e4defa; background: #f2efff; color: #6651d0; }
.notification-body { min-width: 0; }
.notification-item-topline { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
.notification-title-wrap { min-width: 0; display: flex; align-items: flex-start; gap: 9px; }
.notification-item h3 { margin: 1px 0 0; color: var(--notification-ink); font-size: 15px; font-weight: 700; letter-spacing: -.01em; line-height: 1.45; }
.unread-dot { width: 7px; height: 7px; flex: 0 0 7px; margin-top: 7px; border-radius: 50%; background: #735eeb; box-shadow: 0 0 0 3px #eeeaff; }
.notification-item time { flex: 0 0 auto; color: #8991a8; font-size: 11px; line-height: 1.7; font-variant-numeric: tabular-nums; }
.notification-body > p { max-width: 680px; margin: 7px 0 12px; color: #6e7895; font-size: 13px; line-height: 1.7; }
.notification-item-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 15px; }
.notification-open-link { display: inline-flex; align-items: center; gap: 7px; color: #614ccf; font-size: 12px; font-weight: 700; text-decoration: none; transition: gap 160ms ease, color 160ms ease; }
.notification-open-link:hover { gap: 10px; color: #4835b5; }
.notification-open-link:focus-visible, .mark-one-button:focus-visible, .mark-all-button:focus-visible, .notification-pagination button:focus-visible { outline: 2px solid #7b66ff; outline-offset: 3px; }
.mark-one-button, .read-label { padding: 0; border: 0; background: transparent; color: #9198aa; font-size: 11px; }
.mark-one-button { text-decoration: underline; cursor: pointer; }
.mark-one-button:disabled { opacity: .5; cursor: wait; }
.notification-loading { min-height: 190px; border: 1px solid #e7e3f0; border-radius: 12px; display: flex; align-items: center; justify-content: center; gap: 11px; color: #77809a; font-size: 13px; }
.notification-loading span:first-child { width: 16px; height: 16px; border: 2px solid #dfdaf4; border-top-color: #715be4; border-radius: 50%; animation: notification-spin .8s linear infinite; }
@keyframes notification-spin { to { transform: rotate(360deg); } }
.notification-empty { padding: 54px 22px; border: 1px dashed #ddd8ec; border-radius: 12px; text-align: center; background: linear-gradient(160deg, #fff, #faf9ff); }
.empty-symbol { width: 40px; height: 40px; margin: 0 auto 12px; border-radius: 12px; display: grid; place-items: center; background: #f0edff; color: #6651d0; font-size: 19px; font-weight: 700; }
.notification-empty h2 { color: var(--notification-ink); font-size: 19px; font-weight: 700; letter-spacing: -.02em; }
.notification-empty p { max-width: 420px; margin: 8px auto 0; color: #77809a; font-size: 13px; line-height: 1.7; }
.notification-empty a { display: inline-flex; align-items: center; gap: 7px; margin-top: 18px; color: #614ccf; font-size: 12px; font-weight: 700; text-decoration: none; }
.notification-pagination { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 16px; color: #7c85a0; font-size: 12px; }
.notification-pagination button { min-height: 37px; padding: 0 12px; border: 1px solid #e1dcef; border-radius: 8px; background: #fff; color: #5c4ac0; font-size: 12px; font-weight: 650; cursor: pointer; }
.notification-pagination button:disabled { color: #a7adbf; cursor: default; }
@media (max-width: 620px) {
  .notification-overview { min-height: auto; padding: 21px 19px; align-items: flex-start; }
  .notification-stat { min-width: 65px; padding: 8px 0 8px 12px; }
  .notification-stat-number { font-size: 24px; }
  .notification-tools { min-height: 56px; gap: 8px; }
  .mark-all-button { font-size: 11px; }
  .notification-item { padding: 18px 16px; grid-template-columns: 34px minmax(0, 1fr); gap: 11px; }
  .notification-item-mark { width: 34px; height: 34px; border-radius: 9px; }
  .notification-item-mark svg { width: 17px; height: 17px; }
  .notification-item-topline { display: grid; gap: 4px; }
  .notification-item time { grid-column: 1; grid-row: 2; }
}
@media (prefers-reduced-motion: reduce) {
  .notification-loading span:first-child { animation: none; }
  .notification-item, .notification-open-link { transition: none; }
}
</style>
