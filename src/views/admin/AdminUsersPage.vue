<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AdminWorkspaceLayout from '@/components/admin/AdminWorkspaceLayout.vue'
import UiIcon from '@/components/company/UiIcon.vue'
import { currentUser } from '@/services/auth'
import {
  getAdminUser,
  listAdminUsers,
  suspendAdminUser,
  unsuspendAdminUser,
  type AdminUser,
  type AdminUserRole,
} from '@/services/adminOperations'

const search = ref('')
const appliedSearch = ref('')
const roleFilter = ref<AdminUserRole | ''>('')
const statusFilter = ref<'active' | 'suspended' | ''>('')
const users = ref<AdminUser[]>([])
const total = ref(0)
const loading = ref(true)
const loadError = ref('')
const actionError = ref('')
const actionMessage = ref('')
const busyId = ref('')
const expandedId = ref('')
const expandedUser = ref<AdminUser | null>(null)
const detailLoading = ref(false)
const suspendId = ref('')
const suspensionReason = ref('')
const page = ref(1)
let requestVersion = 0

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / 20)))
const activeFilters = computed(() => Number(Boolean(roleFilter.value)) + Number(Boolean(statusFilter.value)))

async function loadUsers() {
  const version = ++requestVersion
  loading.value = true
  loadError.value = ''
  actionError.value = ''
  try {
    const result = await listAdminUsers({
      search: appliedSearch.value,
      role: roleFilter.value,
      suspended: statusFilter.value === 'suspended' ? true : statusFilter.value === 'active' ? false : null,
      page: page.value,
    })
    if (version !== requestVersion) return
    users.value = result.users
    total.value = result.total
    if (expandedId.value && !result.users.some((user) => user.id === expandedId.value)) {
      expandedId.value = ''
      expandedUser.value = null
    }
  } catch (cause) {
    if (version === requestVersion) loadError.value = cause instanceof Error ? cause.message : 'Users could not be loaded.'
  } finally {
    if (version === requestVersion) loading.value = false
  }
}

function applySearch() {
  appliedSearch.value = search.value.trim()
  page.value = 1
  void loadUsers()
}

watch([roleFilter, statusFilter], () => {
  page.value = 1
  void loadUsers()
})

onMounted(() => void loadUsers())

async function toggleDetails(id: string) {
  actionMessage.value = ''
  actionError.value = ''
  if (expandedId.value === id) {
    expandedId.value = ''
    expandedUser.value = null
    return
  }
  expandedId.value = id
  expandedUser.value = null
  detailLoading.value = true
  try {
    expandedUser.value = (await getAdminUser(id)).user
  } catch (cause) {
    actionError.value = cause instanceof Error ? cause.message : 'Account details could not be loaded.'
  } finally {
    detailLoading.value = false
  }
}

function beginSuspend(user: AdminUser) {
  suspendId.value = user.id
  suspensionReason.value = ''
  actionError.value = ''
  actionMessage.value = ''
}

async function submitSuspend(user: AdminUser) {
  const reason = suspensionReason.value.trim()
  if (reason.length < 3) {
    actionError.value = 'Enter a reason of at least 3 characters.'
    return
  }
  busyId.value = user.id
  actionError.value = ''
  try {
    const result = await suspendAdminUser(user.id, reason)
    users.value = users.value.map((item) => item.id === user.id ? result.user : item)
    if (expandedUser.value?.id === user.id) expandedUser.value = result.user
    actionMessage.value = `${userName(user)} has been suspended.`
    suspendId.value = ''
  } catch (cause) {
    actionError.value = cause instanceof Error ? cause.message : 'The account could not be suspended.'
  } finally {
    busyId.value = ''
  }
}

async function restoreAccess(user: AdminUser) {
  busyId.value = user.id
  actionError.value = ''
  actionMessage.value = ''
  try {
    const result = await unsuspendAdminUser(user.id)
    users.value = users.value.map((item) => item.id === user.id ? result.user : item)
    if (expandedUser.value?.id === user.id) expandedUser.value = result.user
    actionMessage.value = `${userName(user)} can sign in again.`
  } catch (cause) {
    actionError.value = cause instanceof Error ? cause.message : 'Account access could not be restored.'
  } finally {
    busyId.value = ''
  }
}

function userName(user: AdminUser) {
  const name = [user.firstName, user.lastName].filter((part): part is string => Boolean(part?.trim())).join(' ').trim()
  return name || user.contactName || user.companyName || user.email
}

function roleLabel(role: AdminUserRole) {
  return role === 'USER' ? 'Job seeker' : role === 'COMPANY' ? 'Company' : 'Admin'
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date)
}

function changePage(nextPage: number) {
  page.value = nextPage
  void loadUsers()
}
</script>

<template>
  <AdminWorkspaceLayout
    v-model:search="search"
    title="User management"
    search-label="Search accounts"
    search-placeholder="Search name or email"
    @search="applySearch"
  >
    <section class="users-page" aria-labelledby="users-heading">
      <div class="page-heading">
        <div>
          <p class="eyebrow">Platform accounts</p>
          <h2 id="users-heading">Users</h2>
          <p>Review account access and respond to abuse without exposing unnecessary profile data.</p>
        </div>
        <div class="record-total"><strong>{{ total.toLocaleString() }}</strong><span>accounts</span></div>
      </div>

      <div class="toolbar" aria-label="User filters">
        <label class="filter-field">Role
          <select v-model="roleFilter" aria-label="Filter by role">
            <option value="">All roles</option><option value="USER">Job seeker</option><option value="COMPANY">Company</option><option value="ADMIN">Admin</option>
          </select>
        </label>
        <label class="filter-field">Access
          <select v-model="statusFilter" aria-label="Filter by account access">
            <option value="">All accounts</option><option value="active">Active</option><option value="suspended">Suspended</option>
          </select>
        </label>
        <span class="filter-count">{{ activeFilters ? `${activeFilters} filter${activeFilters === 1 ? '' : 's'} applied` : 'All account types' }}</span>
        <button v-if="activeFilters" class="clear-filters" type="button" @click="roleFilter = ''; statusFilter = ''">Clear filters</button>
      </div>

      <p v-if="actionMessage" class="notice success" role="status">{{ actionMessage }}</p>
      <p v-if="actionError" class="notice error" role="alert">{{ actionError }}</p>
      <div v-if="loading" class="state-panel" role="status">Loading accounts…</div>
      <div v-else-if="loadError" class="state-panel error-state" role="alert">
        <strong>Accounts are unavailable</strong><span>{{ loadError }}</span><button type="button" @click="loadUsers">Try again</button>
      </div>
      <div v-else-if="!users.length" class="state-panel empty-state">
        <strong>No matching accounts</strong><span>Adjust the role, access status, or search terms and try again.</span>
      </div>
      <div v-else class="account-list" aria-label="Accounts">
        <article v-for="user in users" :key="user.id" class="account-row" :class="{ expanded: expandedId === user.id }">
          <div class="account-main">
            <div class="identity-mark" aria-hidden="true">{{ userName(user).slice(0, 1).toUpperCase() }}</div>
            <div class="account-copy"><strong>{{ userName(user) }}</strong><span>{{ user.email }}</span></div>
            <span class="role-tag">{{ roleLabel(user.role) }}</span>
            <span class="access-tag" :class="user.suspendedAt ? 'suspended' : 'active'">
              <i />{{ user.suspendedAt ? 'Suspended' : 'Active' }}
            </span>
            <button class="details-button" type="button" :aria-expanded="expandedId === user.id" @click="toggleDetails(user.id)">
              {{ expandedId === user.id ? 'Hide details' : 'View details' }}<UiIcon name="chevron" :size="14" />
            </button>
          </div>

          <div v-if="expandedId === user.id" class="account-details">
            <p v-if="detailLoading" role="status">Loading account details…</p>
            <template v-else-if="expandedUser">
              <dl>
                <div><dt>Email status</dt><dd>{{ expandedUser.emailVerified ? 'Verified' : 'Unverified' }}</dd></div>
                <div><dt>Joined</dt><dd>{{ formatDate(expandedUser.createdAt) }}</dd></div>
                <div v-if="expandedUser.suspendedAt"><dt>Suspended on</dt><dd>{{ formatDate(expandedUser.suspendedAt) }}</dd></div>
                <div v-if="expandedUser.suspensionReason" class="reason-detail"><dt>Recorded reason</dt><dd>{{ expandedUser.suspensionReason }}</dd></div>
              </dl>
              <p v-if="user.id === currentUser?.id" class="self-note">You cannot suspend the account you are currently using.</p>
              <form v-else-if="suspendId === user.id" class="suspend-form" @submit.prevent="submitSuspend(user)">
                <label :for="`reason-${user.id}`">Reason for suspension</label>
                <textarea :id="`reason-${user.id}`" v-model="suspensionReason" maxlength="500" minlength="3" required placeholder="Describe the policy issue (3–500 characters)" />
                <div><button class="quiet-button" type="button" @click="suspendId = ''">Cancel</button><button class="danger-button" type="submit" :disabled="busyId === user.id">{{ busyId === user.id ? 'Saving…' : 'Confirm suspension' }}</button></div>
              </form>
              <div v-else class="detail-actions">
                <button v-if="user.suspendedAt" class="quiet-button" type="button" :disabled="busyId === user.id" @click="restoreAccess(user)">{{ busyId === user.id ? 'Saving…' : 'Restore account access' }}</button>
                <button v-else class="danger-button" type="button" :disabled="user.id === currentUser?.id || busyId === user.id" @click="beginSuspend(user)">Suspend account</button>
              </div>
            </template>
          </div>
        </article>
      </div>

      <nav v-if="pageCount > 1" class="pagination" aria-label="Account pages">
        <button type="button" :disabled="page <= 1" @click="changePage(page - 1)">Previous</button>
        <span>Page {{ page }} of {{ pageCount }}</span>
        <button type="button" :disabled="page >= pageCount" @click="changePage(page + 1)">Next</button>
      </nav>
    </section>
  </AdminWorkspaceLayout>
</template>

<style scoped>
.users-page { max-width: 1180px; margin: 5px auto 0; }
.page-heading { margin-bottom: 20px; display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; }
.eyebrow { margin: 0 0 8px; color: #6555bf; font-size: 12px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; }
.page-heading h2 { margin: 0; color: #19233c; font-size: clamp(29px, 3vw, 38px); font-weight: 600; letter-spacing: -.045em; }
.page-heading p:not(.eyebrow) { max-width: 62ch; margin: 7px 0 0; color: #657088; font-size: 13px; line-height: 1.5; }
.record-total { padding: 5px 0 2px 15px; border-left: 1px solid #dfe2e7; display: grid; gap: 2px; text-align: right; }
.record-total strong { color: #26334b; font-size: 23px; font-variant-numeric: tabular-nums; }
.record-total span { color: #7a8391; font-size: 11px; }
.toolbar { min-height: 62px; margin-bottom: 13px; padding: 10px 13px; border: 1px solid #e2e4e8; border-radius: 7px; display: flex; align-items: center; gap: 13px; background: #fff; }
.filter-field { display: flex; align-items: center; gap: 8px; color: #788293; font-size: 11px; font-weight: 500; }
.filter-field select { min-width: 125px; height: 35px; padding: 0 26px 0 9px; border: 1px solid #e0e3e8; border-radius: 5px; background: #fff; color: #35425a; font-size: 12px; }
.filter-count { margin-left: auto; color: #808998; font-size: 11px; }
.clear-filters { border: 0; background: transparent; color: #5e4eb1; font-size: 11px; font-weight: 600; cursor: pointer; }
.account-list { border: 1px solid #e2e4e8; border-radius: 8px; overflow: hidden; background: #fff; }
.account-row + .account-row { border-top: 1px solid #e8eaee; }
.account-main { min-height: 72px; padding: 12px 17px; display: grid; grid-template-columns: 34px minmax(150px, 1fr) 100px 105px auto; align-items: center; gap: 13px; }
.identity-mark { width: 32px; height: 32px; border-radius: 8px; display: grid; place-items: center; background: #f1effa; color: #5d4db2; font-size: 12px; font-weight: 600; }
.account-copy { min-width: 0; display: grid; gap: 4px; }
.account-copy strong, .account-copy span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.account-copy strong { color: #27344b; font-size: 13px; font-weight: 600; }
.account-copy span { color: #7a8391; font-size: 11px; }
.role-tag { color: #677285; font-size: 11px; }
.access-tag { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; }
.access-tag i { width: 6px; height: 6px; border-radius: 50%; background: #408967; }
.access-tag.active { color: #367451; }
.access-tag.suspended { color: #a34f58; }
.access-tag.suspended i { background: #b65d65; }
.details-button { justify-self: end; padding: 7px 8px; border: 0; display: inline-flex; align-items: center; gap: 4px; background: transparent; color: #5d4db2; font-size: 11px; font-weight: 600; cursor: pointer; }
.details-button :deep(.ui-icon) { transform: rotate(90deg); transition: transform 160ms ease; }
.expanded .details-button :deep(.ui-icon) { transform: rotate(-90deg); }
.account-details { padding: 17px 20px 18px 64px; border-top: 1px solid #eeeff2; background: #fbfbfa; }
.account-details > p { margin: 0; color: #697487; font-size: 12px; }
.account-details dl { margin: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px 22px; }
.account-details dl > div { min-width: 0; display: grid; gap: 4px; }
.account-details dt { color: #808998; font-size: 10px; }
.account-details dd { overflow-wrap: anywhere; margin: 0; color: #36435a; font-size: 12px; }
.account-details .reason-detail { grid-column: 1 / -1; }
.self-note { margin: 14px 0 0 !important; color: #667389 !important; }
.detail-actions { margin-top: 15px; }
.suspend-form { max-width: 620px; margin-top: 17px; display: grid; gap: 7px; }
.suspend-form label { color: #586579; font-size: 11px; font-weight: 600; }
.suspend-form textarea { min-height: 76px; padding: 9px 10px; border: 1px solid #d9dde4; border-radius: 5px; resize: vertical; color: #29364d; font-size: 12px; line-height: 1.5; }
.suspend-form > div { display: flex; justify-content: flex-end; gap: 8px; }
.quiet-button, .danger-button { min-height: 33px; padding: 0 11px; border: 1px solid #d8dce3; border-radius: 5px; background: #fff; color: #3f4b61; font-size: 11px; font-weight: 600; cursor: pointer; }
.danger-button { border-color: #ead1d3; color: #9a454e; }
.danger-button:hover:not(:disabled) { background: #fff6f6; }
.quiet-button:hover:not(:disabled) { background: #f5f4fb; }
button:disabled { opacity: .55; cursor: not-allowed; }
.notice { margin: 0 0 12px; padding: 10px 12px; border-radius: 5px; font-size: 12px; }
.notice.success { background: #eff7f2; color: #347250; }
.notice.error, .error-state { background: #fff6f6; color: #994650; }
.state-panel { min-height: 138px; padding: 24px; border: 1px solid #e2e4e8; border-radius: 8px; display: grid; align-content: center; justify-items: center; gap: 8px; background: #fff; color: #707b8c; font-size: 13px; text-align: center; }
.state-panel strong { color: #35425a; font-size: 14px; }
.state-panel span { max-width: 48ch; font-size: 12px; line-height: 1.5; }
.state-panel button { margin-top: 3px; border: 0; background: transparent; color: #5d4db2; font-size: 12px; font-weight: 600; cursor: pointer; }
.pagination { margin-top: 15px; display: flex; align-items: center; justify-content: center; gap: 16px; color: #778194; font-size: 11px; }
.pagination button { min-height: 32px; padding: 0 9px; border: 1px solid #dde0e6; border-radius: 5px; background: #fff; color: #4b5870; font-size: 11px; cursor: pointer; }
.pagination button:disabled { opacity: .45; cursor: not-allowed; }
@media (max-width: 760px) {
  .account-main { grid-template-columns: 32px minmax(0, 1fr) auto; gap: 10px; }
  .role-tag { grid-column: 2; grid-row: 2; }
  .access-tag { grid-column: 2; grid-row: 3; }
  .details-button { grid-column: 3; grid-row: 1 / span 3; }
  .account-details { padding: 16px; }
}
@media (max-width: 560px) {
  .page-heading { align-items: flex-start; }
  .page-heading p:not(.eyebrow) { max-width: 40ch; }
  .record-total { padding-left: 10px; }
  .toolbar { align-items: stretch; flex-wrap: wrap; }
  .filter-field { flex: 1 1 100%; justify-content: space-between; }
  .filter-field select { width: 70%; }
  .filter-count { margin-left: 0; }
  .account-details dl { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
