<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AccountPageFrame from '@/components/public/AccountPageFrame.vue'
import { fetchCandidateInterviews, type InterviewRecord } from '@/services/interviews'

const route = useRoute()
const interviews = ref<InterviewRecord[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(true)
const error = ref('')
let requestSequence = 0

const applicationId = computed(() => typeof route.query.applicationId === 'string' ? route.query.applicationId : '')
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / 20)))
const orderedInterviews = computed(() => [...interviews.value].sort((left, right) => {
  const leftUpcoming = left.status === 'SCHEDULED' && new Date(left.scheduledAt).getTime() >= Date.now()
  const rightUpcoming = right.status === 'SCHEDULED' && new Date(right.scheduledAt).getTime() >= Date.now()
  if (leftUpcoming !== rightUpcoming) return leftUpcoming ? -1 : 1
  return leftUpcoming
    ? new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime()
    : new Date(right.scheduledAt).getTime() - new Date(left.scheduledAt).getTime()
}))
const title = computed(() => applicationId.value ? 'Interview details' : 'Your interviews')
const description = computed(() => applicationId.value
  ? 'Review the complete schedule and current status for this application.'
  : 'Upcoming interview plans and their latest status, all in one place.')

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'
  return new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(date)
}

function formatTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Time unavailable'
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(date)
}

function dayNumber(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(undefined, { day: '2-digit' }).format(date)
}

function yearLabel(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : String(date.getFullYear())
}

function monthLabel(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat(undefined, { month: 'short' }).format(date).toUpperCase()
}

function formatLabel(type: InterviewRecord['type']) {
  return type === 'ONSITE' ? 'In person' : type === 'ONLINE' ? 'Online' : 'Phone'
}

function statusLabel(status: InterviewRecord['status']) {
  return status === 'CANCELLED' ? 'Cancelled' : 'Scheduled'
}

function applicationStatusLabel(status: InterviewRecord['applicationStatus']) {
  const labels: Record<InterviewRecord['applicationStatus'], string> = {
    APPLIED: 'Applied',
    UNDER_REVIEW: 'Under review',
    SHORTLISTED: 'Shortlisted',
    INTERVIEW: 'Interview',
    OFFERED: 'Offer sent',
    HIRED: 'Hired',
    REJECTED: 'Rejected',
    WITHDRAWN: 'Withdrawn',
  }
  return labels[status]
}

async function load() {
  const sequence = ++requestSequence
  loading.value = true
  error.value = ''
  try {
    const result = await fetchCandidateInterviews(page.value, 20, applicationId.value || undefined)
    if (sequence !== requestSequence) return
    interviews.value = result.interviews
    total.value = result.total
  } catch (cause) {
    if (sequence === requestSequence) error.value = cause instanceof Error ? cause.message : 'Unable to load interview details.'
  } finally {
    if (sequence === requestSequence) loading.value = false
  }
}

watch(applicationId, () => { page.value = 1 })
watch([applicationId, page], () => { void load() }, { immediate: true })
</script>

<template>
  <AccountPageFrame :title="title" :description="description">
    <div class="interview-page-tools">
      <router-link to="/notifications" class="interview-back-link">← Back to notifications</router-link>
      <span v-if="!applicationId && total" class="interview-total">{{ total }} interview{{ total === 1 ? '' : 's' }}</span>
    </div>

    <p v-if="loading" role="status" class="interview-loading"><span class="interview-loading-mark"></span>Loading interview details…</p>
    <p v-else-if="error" role="alert" class="interview-page-error">{{ error }} <button type="button" @click="load">Try again</button></p>

    <div v-else-if="interviews.length" class="candidate-interview-list">
      <article v-for="interview in orderedInterviews" :key="interview.id" class="candidate-interview-card" :class="`interview-${interview.status.toLowerCase()}`">
        <header class="candidate-interview-heading">
          <div class="candidate-interview-title">
            <span class="interview-card-kicker">{{ interview.job.company }}</span>
            <h2>{{ interview.job.title }}</h2>
          </div>
          <span class="candidate-interview-status" :class="`status-${interview.status.toLowerCase()}`">
            <i aria-hidden="true"></i>{{ statusLabel(interview.status) }}
          </span>
        </header>

        <div class="candidate-interview-main">
          <div class="interview-date-block" aria-label="Interview date">
            <span>{{ monthLabel(interview.scheduledAt) }}</span>
            <strong>{{ dayNumber(interview.scheduledAt) }}</strong>
            <small>{{ yearLabel(interview.scheduledAt) }}</small>
          </div>
          <div class="interview-time-copy">
            <span class="interview-meta-label">Interview time</span>
            <strong>{{ formatDate(interview.scheduledAt) }}</strong>
            <span>{{ formatTime(interview.scheduledAt) }} · {{ formatLabel(interview.type) }}</span>
          </div>
        </div>

        <dl class="interview-detail-grid">
          <div>
            <dt>Format</dt>
            <dd>{{ formatLabel(interview.type) }}</dd>
          </div>
          <div class="interview-location-detail">
            <dt>{{ interview.type === 'ONLINE' ? 'Meeting link' : interview.type === 'PHONE' ? 'Call details' : 'Where to go' }}</dt>
            <dd v-if="interview.meetingUrl"><a :href="interview.meetingUrl" target="_blank" rel="noopener noreferrer">{{ interview.meetingUrl }} <span aria-hidden="true">↗</span></a></dd>
            <dd v-else>{{ interview.location || 'The company has not added a location yet.' }}</dd>
          </div>
          <div>
            <dt>Application stage</dt>
            <dd><span class="application-stage-chip">{{ applicationStatusLabel(interview.applicationStatus) }}</span></dd>
          </div>
        </dl>

        <section v-if="interview.notes" class="interview-instructions" aria-label="Interview instructions">
          <h3>Additional details</h3>
          <p>{{ interview.notes }}</p>
        </section>

        <footer class="candidate-interview-footer">
          <span v-if="interview.status === 'CANCELLED'">Cancelled {{ interview.cancelledAt ? formatDate(interview.cancelledAt) : '' }}</span>
          <span v-else>Last updated {{ formatDate(interview.updatedAt) }}</span>
          <router-link :to="`/applications/${interview.applicationId}`">View application <span aria-hidden="true">→</span></router-link>
        </footer>
      </article>

      <nav v-if="pageCount > 1" class="interview-pagination" aria-label="Interview pages">
        <button type="button" :disabled="page <= 1" @click="page--">← Previous</button>
        <span>Page {{ page }} of {{ pageCount }}</span>
        <button type="button" :disabled="page >= pageCount" @click="page++">Next →</button>
      </nav>
    </div>

    <div v-else class="interview-empty">
      <span class="interview-empty-icon" aria-hidden="true">◷</span>
      <h2>{{ applicationId ? 'Interview details are unavailable' : 'No interviews scheduled yet' }}</h2>
      <p>{{ applicationId ? 'This application does not have an active interview record. Check the latest notification or contact the company if you need help.' : 'When a company schedules an interview, the date, meeting place, instructions, and status will appear here.' }}</p>
      <router-link v-if="applicationId" to="/applications">View your applications <span aria-hidden="true">→</span></router-link>
      <router-link v-else to="/jobs">Explore open roles <span aria-hidden="true">→</span></router-link>
    </div>
  </AccountPageFrame>
</template>

<style scoped>
.interview-page-tools { margin: -7px 0 18px; display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.interview-back-link { color: #6955d4; font-size: 13px; font-weight: 650; text-decoration: none; }
.interview-back-link:hover { color: #4836b4; }
.interview-total { color: #7c85a0; font-size: 12px; font-variant-numeric: tabular-nums; }
.interview-loading { min-height: 160px; border: 1px solid #e7e3f0; border-radius: 12px; display: flex; align-items: center; justify-content: center; gap: 10px; color: #77809a; font-size: 13px; }
.interview-loading-mark { width: 16px; height: 16px; border: 2px solid #dfdaf4; border-top-color: #715be4; border-radius: 50%; animation: interview-spin .8s linear infinite; }
@keyframes interview-spin { to { transform: rotate(360deg); } }
.interview-page-error { padding: 12px 15px; border-radius: 9px; background: #fff2f3; color: #a24456; font-size: 13px; line-height: 1.6; }
.interview-page-error button { margin-left: 8px; text-decoration: underline; }
.candidate-interview-list { display: grid; gap: 18px; }
.candidate-interview-card { overflow: hidden; border: 1px solid #e4e0f0; border-radius: 14px; background: #fff; box-shadow: 0 9px 25px rgb(24 39 91 / 4%); }
.candidate-interview-card.interview-cancelled { background: linear-gradient(150deg, #fff 20%, #fdfbfc 100%); }
.candidate-interview-heading { min-height: 82px; padding: 19px 24px; border-bottom: 1px solid #efedf5; display: flex; justify-content: space-between; align-items: center; gap: 18px; background: radial-gradient(ellipse at 95% 0%, rgb(234 230 255 / 58%), transparent 50%), #fdfcff; }
.candidate-interview-title { min-width: 0; }
.interview-card-kicker { color: #7867d4; font-size: 10px; font-weight: 750; letter-spacing: .1em; text-transform: uppercase; }
.candidate-interview-heading h2 { margin: 5px 0 0; color: #14234f; font-size: clamp(19px, 2.6vw, 23px); font-weight: 700; letter-spacing: -.035em; line-height: 1.25; }
.candidate-interview-status { flex: 0 0 auto; min-height: 29px; padding: 0 10px; border-radius: 7px; display: inline-flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 700; }
.candidate-interview-status i { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.candidate-interview-status.status-scheduled { background: #edf7f1; color: #287455; }
.candidate-interview-status.status-cancelled { background: #fff0f1; color: #a14758; }
.candidate-interview-main { padding: 22px 24px; display: flex; align-items: center; gap: 16px; }
.interview-date-block { width: 67px; height: 76px; flex: 0 0 67px; border: 1px solid #e6e1f5; border-radius: 10px; display: grid; align-content: center; justify-items: center; gap: 0; background: #f8f6ff; color: #6955d4; }
.interview-date-block span { font-size: 9px; font-weight: 800; letter-spacing: .1em; }
.interview-date-block strong { margin-top: -1px; color: #1d2a59; font-size: 27px; font-weight: 750; line-height: 1.05; font-variant-numeric: tabular-nums; }
.interview-date-block small { color: #79829d; font-size: 9px; font-weight: 600; }
.interview-time-copy { min-width: 0; display: grid; gap: 4px; }
.interview-meta-label { color: #8790a8; font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.interview-time-copy strong { color: #1d2a59; font-size: 15px; font-weight: 700; line-height: 1.4; }
.interview-time-copy > span:last-child { color: #6d7896; font-size: 12px; }
.interview-detail-grid { margin: 0; padding: 19px 24px; border-top: 1px solid #f0edf6; display: grid; grid-template-columns: .75fr 1.5fr .9fr; gap: 18px; }
.interview-detail-grid > div { min-width: 0; }
.interview-detail-grid dt { margin-bottom: 6px; color: #8790a8; font-size: 10px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; }
.interview-detail-grid dd { margin: 0; color: #26345f; font-size: 13px; font-weight: 600; line-height: 1.55; overflow-wrap: anywhere; }
.interview-detail-grid dd a { color: #604bcb; text-decoration: none; }
.interview-detail-grid dd a:hover { text-decoration: underline; }
.application-stage-chip { padding: 4px 8px; border-radius: 5px; background: #f1effb; color: #6553bc; font-size: 11px; }
.interview-instructions { margin: 0 24px 18px; padding: 15px 17px; border-left: 2px solid #8572ec; border-radius: 0 8px 8px 0; background: #f8f7fd; }
.interview-instructions h3 { color: #2c3963; font-size: 12px; font-weight: 700; }
.interview-instructions p { margin-top: 6px; color: #687493; font-size: 13px; line-height: 1.75; white-space: pre-wrap; overflow-wrap: anywhere; }
.candidate-interview-footer { min-height: 50px; padding: 12px 24px; border-top: 1px solid #efedf5; display: flex; justify-content: space-between; align-items: center; gap: 14px; color: #9299ad; font-size: 10px; }
.candidate-interview-footer a { display: inline-flex; align-items: center; gap: 6px; color: #6651d0; font-size: 11px; font-weight: 700; text-decoration: none; }
.candidate-interview-footer a:hover { gap: 9px; }
.interview-pagination { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 2px; color: #7c85a0; font-size: 12px; }
.interview-pagination button { min-height: 38px; padding: 0 12px; border: 1px solid #e1dcef; border-radius: 8px; background: #fff; color: #5c4ac0; font-size: 12px; font-weight: 650; cursor: pointer; }
.interview-pagination button:disabled { color: #a7adbf; cursor: default; }
.interview-empty { padding: 52px 24px; border: 1px dashed #ddd8ec; border-radius: 14px; text-align: center; background: linear-gradient(160deg, #fff, #faf9ff); }
.interview-empty-icon { width: 44px; height: 44px; margin: 0 auto 13px; border: 1px solid #e5def8; border-radius: 13px; display: grid; place-items: center; background: #f2efff; color: #6651d0; font-size: 25px; }
.interview-empty h2 { color: #17254f; font-size: 20px; font-weight: 700; letter-spacing: -.025em; }
.interview-empty p { max-width: 480px; margin: 9px auto 0; color: #77809a; font-size: 13px; line-height: 1.75; }
.interview-empty a { display: inline-flex; align-items: center; gap: 7px; margin-top: 20px; color: #614ccf; font-size: 12px; font-weight: 700; text-decoration: none; }
@media (max-width: 680px) {
  .candidate-interview-heading { padding: 18px; align-items: flex-start; }
  .candidate-interview-status { min-height: 27px; padding: 0 8px; font-size: 10px; }
  .candidate-interview-main { padding: 18px; }
  .interview-detail-grid { padding: 17px 18px; grid-template-columns: 1fr 1fr; }
  .interview-location-detail { grid-column: 1 / -1; }
  .interview-instructions { margin-right: 18px; margin-left: 18px; }
  .candidate-interview-footer { padding: 12px 18px; }
}
@media (max-width: 460px) {
  .candidate-interview-heading { display: grid; }
  .candidate-interview-status { justify-self: start; }
  .interview-detail-grid { grid-template-columns: 1fr; gap: 13px; }
  .interview-location-detail { grid-column: auto; }
  .candidate-interview-footer { align-items: flex-start; flex-direction: column; }
}
@media (prefers-reduced-motion: reduce) { .interview-loading-mark { animation: none; } }
</style>
