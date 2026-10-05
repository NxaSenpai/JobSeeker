<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AdminWorkspaceLayout from '@/components/admin/AdminWorkspaceLayout.vue'
import UiIcon from '@/components/company/UiIcon.vue'
import { apiRequest } from '@/services/api'

type AuditRecord = {
  id: string
  actor: { id: string; email: string }
  action: string
  subjectType: string
  subjectId: string
  metadata: Record<string, unknown>
  createdAt: string
}

const search = ref('')
const appliedSearch = ref('')
const entries = ref<AuditRecord[]>([])
const total = ref(0)
const page = ref(1)
const limit = 20
const expandedId = ref('')
const loading = ref(true)
const error = ref('')
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / limit)))
let requestVersion = 0

async function loadAuditLog() {
  const version = ++requestVersion
  loading.value = true
  error.value = ''
  try {
    const params = new URLSearchParams({ page: String(page.value), limit: String(limit) })
    if (appliedSearch.value) params.set('search', appliedSearch.value)
    const result = await apiRequest<{ auditLogs: AuditRecord[]; total: number }>(`/admin/audit-logs?${params}`)
    if (version !== requestVersion) return
    entries.value = result.auditLogs
    total.value = result.total
    if (expandedId.value && !result.auditLogs.some((entry) => entry.id === expandedId.value)) expandedId.value = ''
  } catch (cause) {
    if (version === requestVersion) error.value = cause instanceof Error ? cause.message : 'The audit log could not be loaded.'
  } finally {
    if (version === requestVersion) loading.value = false
  }
}

function applySearch() {
  appliedSearch.value = search.value.trim()
  page.value = 1
  void loadAuditLog()
}

watch(page, () => void loadAuditLog())
onMounted(() => void loadAuditLog())

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function changePage(nextPage: number) {
  page.value = nextPage
}
</script>

<template>
  <AdminWorkspaceLayout
    v-model:search="search"
    title="Audit log"
    search-label="Search audit events"
    search-placeholder="Search action or record ID"
    @search="applySearch"
  >
    <section class="audit-page" aria-labelledby="audit-heading">
      <div class="page-heading">
        <div>
          <p class="eyebrow">Accountability</p>
          <h2 id="audit-heading">Admin activity</h2>
          <p>Review who changed platform records and when. Decision reasons are retained with each event.</p>
        </div>
        <div class="record-total"><strong>{{ total.toLocaleString() }}</strong><span>events</span></div>
      </div>

      <div class="log-list" aria-label="Admin audit events">
        <div class="log-heading"><span>Action</span><span>Record</span><span>Admin</span><span>Time</span><span></span></div>
        <div v-if="loading" class="state-panel" role="status">Loading audit events…</div>
        <div v-else-if="error" class="state-panel error-state" role="alert">
          <strong>Activity log is unavailable</strong><span>{{ error }}</span><button type="button" @click="loadAuditLog">Try again</button>
        </div>
        <div v-else-if="!entries.length" class="state-panel">
          <strong>No audit events found</strong><span>Try another action, subject type, or record ID.</span>
        </div>
        <article v-for="entry in entries" :key="entry.id" class="log-entry" :class="{ expanded: expandedId === entry.id }">
          <div class="log-row">
            <div class="event-copy"><strong>{{ entry.action.replaceAll('_', ' ').toLowerCase() }}</strong><small>{{ entry.subjectType.toLowerCase() }}</small></div>
            <span class="subject-id" :title="entry.subjectId">{{ entry.subjectId }}</span>
            <span class="actor-email">{{ entry.actor.email }}</span>
            <time :datetime="entry.createdAt">{{ formatDate(entry.createdAt) }}</time>
            <button type="button" :aria-expanded="expandedId === entry.id" :aria-label="`${expandedId === entry.id ? 'Hide' : 'View'} event details ${entry.id}`" @click="expandedId = expandedId === entry.id ? '' : entry.id">
              <UiIcon name="chevron" :size="15" />
            </button>
          </div>
          <div v-if="expandedId === entry.id" class="event-details">
            <div><span>Event ID</span><code>{{ entry.id }}</code></div>
            <div><span>Subject ID</span><code>{{ entry.subjectId }}</code></div>
            <div class="metadata"><span>Recorded details</span><pre>{{ JSON.stringify(entry.metadata, null, 2) }}</pre></div>
          </div>
        </article>
      </div>

      <nav v-if="!loading && !error && pageCount > 1" class="pagination" aria-label="Audit log pages">
        <button type="button" :disabled="page <= 1" @click="changePage(page - 1)">Previous</button>
        <span>Page {{ page }} of {{ pageCount }}</span>
        <button type="button" :disabled="page >= pageCount" @click="changePage(page + 1)">Next</button>
      </nav>
    </section>
  </AdminWorkspaceLayout>
</template>

<style scoped>
.audit-page { max-width: 1250px; margin: 5px auto 0; }
.page-heading { margin-bottom: 20px; display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; }
.eyebrow { margin: 0 0 8px; color: #6555bf; font-size: 12px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; }
.page-heading h2 { margin: 0; color: #19233c; font-size: clamp(29px, 3vw, 38px); font-weight: 600; letter-spacing: -.045em; }
.page-heading p:not(.eyebrow) { max-width: 65ch; margin: 7px 0 0; color: #657088; font-size: 13px; line-height: 1.5; }
.record-total { padding: 5px 0 2px 15px; border-left: 1px solid #dfe2e7; display: grid; gap: 2px; text-align: right; }
.record-total strong { color: #26334b; font-size: 23px; font-variant-numeric: tabular-nums; }
.record-total span { color: #7a8391; font-size: 11px; }
.log-list { overflow: hidden; border: 1px solid #e2e4e8; border-radius: 8px; background: #fff; }
.log-heading, .log-row { display: grid; grid-template-columns: minmax(155px, 1.1fr) minmax(130px, .9fr) minmax(150px, 1fr) minmax(125px, .8fr) 32px; align-items: center; gap: 14px; }
.log-heading { min-height: 39px; padding: 0 15px; border-bottom: 1px solid #e8eaee; background: #fafaf8; color: #7c8594; font-size: 10px; font-weight: 600; letter-spacing: .045em; text-transform: uppercase; }
.log-entry + .log-entry { border-top: 1px solid #eceef1; }
.log-row { min-height: 65px; padding: 10px 15px; }
.event-copy { min-width: 0; display: grid; gap: 4px; }
.event-copy strong { overflow: hidden; color: #344158; font-size: 12px; font-weight: 600; text-overflow: ellipsis; text-transform: capitalize; white-space: nowrap; }
.event-copy small { color: #87909e; font-size: 10px; text-transform: capitalize; }
.subject-id, .actor-email, .log-row time { overflow: hidden; color: #687487; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.subject-id { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.log-row button { width: 29px; height: 29px; border: 1px solid transparent; border-radius: 5px; display: grid; place-items: center; background: transparent; color: #7d8797; cursor: pointer; }
.log-row button:hover { border-color: #e0dcef; background: #f5f3fb; color: #5d4db2; }
.log-row button :deep(.ui-icon) { transform: rotate(90deg); transition: transform 160ms ease; }
.expanded .log-row button :deep(.ui-icon) { transform: rotate(-90deg); }
.event-details { padding: 13px 18px 16px; border-top: 1px solid #eeeff2; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 20px; background: #fbfbfa; }
.event-details > div { min-width: 0; display: grid; gap: 4px; }
.event-details span { color: #7b8594; font-size: 10px; }
.event-details code { overflow-wrap: anywhere; color: #4e5a70; font-size: 11px; }
.event-details .metadata { grid-column: 1 / -1; }
.event-details pre { max-height: 220px; overflow: auto; margin: 0; padding: 12px; border: 1px solid #eaebee; border-radius: 5px; background: #fff; color: #4e5a70; font-size: 11px; line-height: 1.5; white-space: pre-wrap; }
.state-panel { min-height: 130px; padding: 22px; grid-column: 1 / -1; display: grid; align-content: center; justify-items: center; gap: 7px; color: #707b8c; font-size: 12px; text-align: center; }
.state-panel strong { color: #35425a; font-size: 14px; }
.state-panel span { max-width: 55ch; line-height: 1.5; }
.state-panel button { border: 0; background: transparent; color: #5d4db2; font-size: 12px; font-weight: 600; cursor: pointer; }
.error-state { color: #994650; }
.pagination { margin-top: 15px; display: flex; align-items: center; justify-content: center; gap: 16px; color: #778194; font-size: 11px; }
.pagination button { min-height: 32px; padding: 0 9px; border: 1px solid #dde0e6; border-radius: 5px; background: #fff; color: #4b5870; font-size: 11px; cursor: pointer; }
.pagination button:disabled { opacity: .45; cursor: not-allowed; }
@media (max-width: 820px) {
  .log-heading { display: none; }
  .log-row { grid-template-columns: minmax(0, 1fr) auto; gap: 7px 12px; }
  .event-copy { grid-column: 1; }
  .subject-id { grid-column: 1; grid-row: 2; }
  .actor-email { grid-column: 1; grid-row: 3; }
  .log-row time { grid-column: 1; grid-row: 4; }
  .log-row button { grid-column: 2; grid-row: 1 / span 4; }
  .event-details { padding-inline: 13px; }
}
@media (max-width: 540px) {
  .page-heading { align-items: flex-start; }
  .record-total { padding-left: 9px; }
  .event-details { grid-template-columns: 1fr; }
  .event-details .metadata { grid-column: auto; }
}
</style>
