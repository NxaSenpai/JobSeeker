<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AdminProfileDialog from '@/components/admin/AdminProfileDialog.vue'
import AdminWorkspaceLayout from '@/components/admin/AdminWorkspaceLayout.vue'
import { adminDarkMode } from '@/services/adminPreferences'
import { apiBlob } from '@/services/api'
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
const selectedUser = ref<AdminUser | null>(null)
const profileAvatarUrl = ref('')
const profileLoading = ref(false)
const profileReady = ref(false)
const profileOpen = computed(() => selectedUser.value !== null)
const suspendId = ref('')
const suspensionReason = ref('')
const page = ref(1)
let requestVersion = 0
let profileRequestVersion = 0
let avatarRequestVersion = 0

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / 20)))
const activeFilters = computed(() => Number(Boolean(roleFilter.value)) + Number(Boolean(statusFilter.value)))

async function loadUsers() {
  const version = ++requestVersion
  loading.value = true
  loadError.value = ''
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
    if (selectedUser.value) {
      const updated = result.users.find(({ id }) => id === selectedUser.value?.id)
      if (updated) selectedUser.value = { ...selectedUser.value, ...updated }
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

function clearProfileAvatar() {
  avatarRequestVersion += 1
  if (profileAvatarUrl.value) URL.revokeObjectURL(profileAvatarUrl.value)
  profileAvatarUrl.value = ''
}

async function loadProfileAvatar(user: AdminUser, profileVersion: number) {
  if (!user.profile?.profileImageUrl) return
  const avatarVersion = ++avatarRequestVersion
  try {
    const blob = await apiBlob(`/admin/users/${encodeURIComponent(user.id)}/avatar`)
    if (
      avatarVersion !== avatarRequestVersion ||
      profileVersion !== profileRequestVersion ||
      selectedUser.value?.id !== user.id
    ) return
    profileAvatarUrl.value = URL.createObjectURL(blob)
  } catch {
    // Keep the initials fallback when no readable photo is available.
  }
}

async function openProfile(user: AdminUser) {
  clearProfileAvatar()
  selectedUser.value = user
  suspendId.value = ''
  suspensionReason.value = ''
  actionError.value = ''
  actionMessage.value = ''
  profileLoading.value = true
  profileReady.value = false
  const version = ++profileRequestVersion
  try {
    const result = await getAdminUser(user.id)
    if (version === profileRequestVersion && selectedUser.value?.id === user.id) {
      selectedUser.value = result.user
      profileReady.value = true
      void loadProfileAvatar(result.user, version)
    }
  } catch (cause) {
    if (version === profileRequestVersion) actionError.value = cause instanceof Error ? cause.message : 'Account details could not be loaded.'
  } finally {
    if (version === profileRequestVersion) profileLoading.value = false
  }
}

function closeProfile() {
  clearProfileAvatar()
  selectedUser.value = null
  suspendId.value = ''
  suspensionReason.value = ''
  profileRequestVersion += 1
  profileLoading.value = false
  profileReady.value = false
}

onBeforeUnmount(clearProfileAvatar)

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
  actionMessage.value = ''
  try {
    const result = await suspendAdminUser(user.id, reason)
    users.value = users.value.map((item) => item.id === user.id ? result.user : item)
    selectedUser.value = {
      ...result.user,
      profile: selectedUser.value?.profile ?? null,
      resumes: selectedUser.value?.resumes ?? [],
    }
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
    selectedUser.value = {
      ...result.user,
      profile: selectedUser.value?.profile ?? null,
      resumes: selectedUser.value?.resumes ?? [],
    }
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

function formatDateOnly(value: string | null | undefined) {
  if (!value) return 'Not provided'
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return 'Not provided'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(year, month - 1, day))
}

function dateRange(start: string, end: string, current = false) {
  return `${formatDateOnly(start)} – ${current ? 'Present' : end ? formatDateOnly(end) : 'Not provided'}`
}

function fileSize(value: number) {
  return value < 1024 * 1024
    ? `${Math.max(1, Math.round(value / 1024))} KB`
    : `${(value / 1024 / 1024).toFixed(1)} MB`
}

function initialsFor(user: AdminUser) {
  const name = userName(user).split(/\s+/).filter(Boolean)
  return name.slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U'
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
    <section class="users-page" :class="{ 'theme-dark': adminDarkMode }" aria-labelledby="users-heading">
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
      <p v-if="actionError && !profileOpen" class="notice error" role="alert">{{ actionError }}</p>
      <div v-if="loading" class="state-panel" role="status">Loading accounts…</div>
      <div v-else-if="loadError" class="state-panel error-state" role="alert">
        <strong>Accounts are unavailable</strong><span>{{ loadError }}</span><button type="button" @click="loadUsers">Try again</button>
      </div>
      <div v-else-if="!users.length" class="state-panel empty-state">
        <strong>No matching accounts</strong><span>Adjust the role, access status, or search terms and try again.</span>
      </div>
      <div v-else class="account-list" aria-label="Accounts">
        <article v-for="user in users" :key="user.id" class="account-row">
          <div class="account-main">
            <div class="identity-mark" aria-hidden="true">{{ userName(user).slice(0, 1).toUpperCase() }}</div>
            <div class="account-copy">
              <button class="account-name" type="button" @click="openProfile(user)">{{ userName(user) }}</button>
              <span>{{ user.email }}</span>
            </div>
            <span class="role-tag">{{ roleLabel(user.role) }}</span>
            <span class="access-tag" :class="user.suspendedAt ? 'suspended' : 'active'"><i />{{ user.suspendedAt ? 'Suspended' : 'Active' }}</span>
            <button class="details-button" type="button" @click="openProfile(user)">Profile</button>
          </div>
        </article>
      </div>

      <nav v-if="pageCount > 1" class="pagination" aria-label="Account pages">
        <button type="button" :disabled="page <= 1" @click="changePage(page - 1)">Previous</button>
        <span>Page {{ page }} of {{ pageCount }}</span>
        <button type="button" :disabled="page >= pageCount" @click="changePage(page + 1)">Next</button>
      </nav>
    </section>

    <AdminProfileDialog
      :open="profileOpen"
      eyebrow="Account profile"
      :title="selectedUser ? userName(selectedUser) : 'Account profile'"
      :subtitle="selectedUser?.email"
      @close="closeProfile"
    >
      <template v-if="selectedUser">
        <div v-if="profileLoading" class="profile-loading" role="status">Loading account profile…</div>
        <div class="user-profile">
          <header class="user-profile-hero">
            <span class="profile-person-avatar" aria-hidden="true">
              <img v-if="profileAvatarUrl" :src="profileAvatarUrl" alt="" />
              <span v-else>{{ initialsFor(selectedUser) }}</span>
            </span>
            <div class="profile-hero-copy">
              <h3>{{ [selectedUser.profile?.firstName, selectedUser.profile?.lastName].filter(Boolean).join(' ') || userName(selectedUser) }}</h3>
              <p>{{ selectedUser.profile?.headline || selectedUser.headline || 'No professional headline added' }}</p>
              <div class="user-profile-tags">
                <span class="role-tag">{{ roleLabel(selectedUser.role) }}</span>
                <span class="access-tag" :class="selectedUser.suspendedAt ? 'suspended' : 'active'"><i />{{ selectedUser.suspendedAt ? 'Suspended' : 'Active' }}</span>
                <span v-if="selectedUser.profile?.isOpenToWork" class="open-to-work">Open to work</span>
              </div>
            </div>
          </header>

          <section class="profile-section" aria-labelledby="account-information-title">
            <div class="profile-section-heading"><div><span class="profile-kicker">Account</span><h3 id="account-information-title">Account information</h3></div></div>
            <dl class="profile-facts">
              <div><dt>Account ID</dt><dd>{{ selectedUser.id }}</dd></div>
              <div><dt>Email</dt><dd>{{ selectedUser.email }}</dd></div>
              <div><dt>Account type</dt><dd>{{ roleLabel(selectedUser.role) }}</dd></div>
              <div><dt>Email verification</dt><dd>{{ selectedUser.emailVerified ? 'Verified' : 'Not verified' }}</dd></div>
              <div><dt>Terms accepted</dt><dd>{{ selectedUser.termsAccepted ? 'Yes' : 'No' }}</dd></div>
              <div><dt>Account created</dt><dd>{{ formatDate(selectedUser.createdAt) }}</dd></div>
              <div><dt>Account updated</dt><dd>{{ formatDate(selectedUser.updatedAt) }}</dd></div>
              <div v-if="selectedUser.companyName"><dt>Company</dt><dd>{{ selectedUser.companyName }}</dd></div>
              <div v-if="selectedUser.contactName"><dt>Contact name</dt><dd>{{ selectedUser.contactName }}</dd></div>
              <div v-if="selectedUser.suspendedAt"><dt>Suspended on</dt><dd>{{ formatDate(selectedUser.suspendedAt) }}</dd></div>
              <div v-if="selectedUser.suspensionReason" class="profile-fact-wide"><dt>Suspension reason</dt><dd>{{ selectedUser.suspensionReason }}</dd></div>
            </dl>
          </section>

          <template v-if="profileReady && selectedUser.profile">
            <section class="profile-section" aria-labelledby="personal-information-title">
              <div class="profile-section-heading"><div><span class="profile-kicker">Candidate profile</span><h3 id="personal-information-title">Personal information</h3></div><small>Updated {{ formatDate(selectedUser.profile.updatedAt) }}</small></div>
              <dl class="profile-facts">
                <div><dt>First name</dt><dd>{{ selectedUser.profile.firstName || 'Not provided' }}</dd></div>
                <div><dt>Last name</dt><dd>{{ selectedUser.profile.lastName || 'Not provided' }}</dd></div>
                <div><dt>Professional headline</dt><dd>{{ selectedUser.profile.headline || selectedUser.headline || 'Not provided' }}</dd></div>
                <div><dt>Location</dt><dd>{{ selectedUser.profile.location || selectedUser.location || 'Not provided' }}</dd></div>
                <div><dt>Phone</dt><dd>{{ selectedUser.profile.phone || 'Not provided' }}</dd></div>
                <div><dt>Date of birth</dt><dd>{{ formatDateOnly(selectedUser.profile.dateOfBirth) }}</dd></div>
                <div><dt>Availability</dt><dd>{{ selectedUser.profile.isOpenToWork ? 'Open to work' : 'Not actively looking' }}</dd></div>
                <div><dt>Profile created</dt><dd>{{ formatDate(selectedUser.profile.createdAt) }}</dd></div>
                <div v-if="selectedUser.profile.websiteUrl"><dt>Website / portfolio</dt><dd><a :href="selectedUser.profile.websiteUrl" target="_blank" rel="noopener noreferrer">{{ selectedUser.profile.websiteUrl }}</a></dd></div>
                <div v-if="selectedUser.profile.linkedinUrl"><dt>LinkedIn</dt><dd><a :href="selectedUser.profile.linkedinUrl" target="_blank" rel="noopener noreferrer">{{ selectedUser.profile.linkedinUrl }}</a></dd></div>
                <div v-if="selectedUser.profile.githubUrl"><dt>GitHub</dt><dd><a :href="selectedUser.profile.githubUrl" target="_blank" rel="noopener noreferrer">{{ selectedUser.profile.githubUrl }}</a></dd></div>
              </dl>
            </section>

            <section class="profile-section" aria-labelledby="profile-about-title">
              <div class="profile-section-heading"><div><span class="profile-kicker">Introduction</span><h3 id="profile-about-title">About</h3></div></div>
              <p class="profile-long-text">{{ selectedUser.profile.bio || selectedUser.bio || 'No profile summary has been added.' }}</p>
            </section>

            <section class="profile-section" aria-labelledby="profile-skills-title">
              <div class="profile-section-heading"><div><span class="profile-kicker">Expertise</span><h3 id="profile-skills-title">Skills</h3></div></div>
              <div v-if="selectedUser.profile.skills.length" class="profile-chip-list"><span v-for="skill in selectedUser.profile.skills" :key="skill">{{ skill }}</span></div>
              <p v-else class="profile-empty">No skills have been added.</p>
            </section>

            <section class="profile-section" aria-labelledby="profile-experience-title">
              <div class="profile-section-heading"><div><span class="profile-kicker">Career history</span><h3 id="profile-experience-title">Experience</h3></div></div>
              <div v-if="selectedUser.profile.experience.length" class="profile-entry-list">
                <article v-for="(experience, index) in selectedUser.profile.experience" :key="`${experience.company}-${experience.position}-${index}`" class="profile-entry">
                  <h4>{{ experience.position || 'Position not provided' }}</h4><p class="profile-entry-subtitle">{{ experience.company || 'Company not provided' }}<span v-if="experience.employmentType"> · {{ experience.employmentType }}</span></p>
                  <small>{{ dateRange(experience.startDate, experience.endDate, experience.current) }}</small>
                  <p v-if="experience.description" class="profile-entry-description">{{ experience.description }}</p>
                </article>
              </div>
              <p v-else class="profile-empty">No experience has been added.</p>
            </section>

            <section class="profile-section" aria-labelledby="profile-education-title">
              <div class="profile-section-heading"><div><span class="profile-kicker">Education</span><h3 id="profile-education-title">Education</h3></div></div>
              <div v-if="selectedUser.profile.education.length" class="profile-entry-list">
                <article v-for="(education, index) in selectedUser.profile.education" :key="`${education.school}-${education.degree}-${index}`" class="profile-entry">
                  <h4>{{ education.degree || 'Degree not provided' }}<span v-if="education.fieldOfStudy"> · {{ education.fieldOfStudy }}</span></h4><p class="profile-entry-subtitle">{{ education.school || 'School not provided' }}</p>
                  <small>{{ dateRange(education.startDate, education.endDate) }}</small>
                  <p v-if="education.description" class="profile-entry-description">{{ education.description }}</p>
                </article>
              </div>
              <p v-else class="profile-empty">No education has been added.</p>
            </section>

            <section class="profile-section" aria-labelledby="profile-languages-title">
              <div class="profile-section-heading"><div><span class="profile-kicker">Communication</span><h3 id="profile-languages-title">Languages</h3></div></div>
              <div v-if="selectedUser.profile.languages.length" class="profile-language-list">
                <div v-for="(language, index) in selectedUser.profile.languages" :key="`${language.name}-${index}`"><strong>{{ language.name }}</strong><span>{{ language.proficiency }}</span></div>
              </div>
              <p v-else class="profile-empty">No languages have been added.</p>
            </section>

            <section class="profile-section" aria-labelledby="profile-resumes-title">
              <div class="profile-section-heading"><div><span class="profile-kicker">Documents</span><h3 id="profile-resumes-title">Résumé files</h3></div></div>
              <div v-if="selectedUser.resumes?.length" class="profile-resume-list">
                <article v-for="resume in selectedUser.resumes" :key="resume.id" class="profile-resume">
                  <span class="profile-pdf-mark" aria-hidden="true">PDF</span>
                  <div><strong>{{ resume.fileName }}</strong><small>{{ resume.mimeType }} · {{ fileSize(resume.fileSize) }} · Added {{ formatDate(resume.createdAt) }} · Updated {{ formatDate(resume.updatedAt) }}</small></div>
                  <span v-if="resume.isDefault" class="default-resume">Default</span>
                </article>
              </div>
              <p v-else class="profile-empty">No résumé has been uploaded.</p>
            </section>
          </template>
          <section v-else-if="profileReady" class="profile-section no-profile" aria-label="Profile not available">
            <span class="profile-kicker">Candidate profile</span>
            <h3>No detailed profile</h3>
            <p>{{ selectedUser.role === 'USER' ? 'This user has not added a detailed job seeker profile yet.' : 'This account does not have a job seeker profile.' }}</p>
            <dl class="profile-facts">
              <div><dt>Professional headline</dt><dd>{{ selectedUser.headline || 'Not provided' }}</dd></div>
              <div><dt>Location</dt><dd>{{ selectedUser.location || 'Not provided' }}</dd></div>
              <div class="profile-fact-wide"><dt>About</dt><dd>{{ selectedUser.bio || 'Not provided' }}</dd></div>
            </dl>
          </section>

          <p v-if="actionError" class="profile-alert" role="alert">{{ actionError }}</p>
          <p v-if="actionMessage" class="profile-success" role="status">{{ actionMessage }}</p>
          <p v-if="selectedUser.id === currentUser?.id" class="profile-self-note">You cannot suspend the account you are currently using.</p>
          <form v-else-if="suspendId === selectedUser.id" class="suspend-form" @submit.prevent="submitSuspend(selectedUser)">
            <label :for="`reason-${selectedUser.id}`">Reason for suspension</label>
            <textarea :id="`reason-${selectedUser.id}`" v-model="suspensionReason" maxlength="500" minlength="3" required placeholder="Describe the policy issue (3–500 characters)" />
            <div><button class="quiet-button" type="button" @click="suspendId = ''">Cancel</button><button class="danger-button" type="submit" :disabled="busyId === selectedUser.id">{{ busyId === selectedUser.id ? 'Saving…' : 'Confirm suspension' }}</button></div>
          </form>
          <div v-else class="profile-actions">
            <button v-if="selectedUser.suspendedAt" class="quiet-button" type="button" :disabled="busyId === selectedUser.id" @click="restoreAccess(selectedUser)">{{ busyId === selectedUser.id ? 'Saving…' : 'Restore account access' }}</button>
            <button v-else class="danger-button" type="button" :disabled="selectedUser.id === currentUser?.id || busyId === selectedUser.id" @click="beginSuspend(selectedUser)">Suspend account</button>
          </div>
        </div>
      </template>
    </AdminProfileDialog>
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
.account-copy span { color: #7a8391; font-size: 11px; }
.account-name { width: fit-content; max-width: 100%; overflow: hidden; padding: 0; border: 0; background: transparent; color: #27344b; font-size: 13px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; text-align: left; cursor: pointer; }
.account-name:hover { color: #5d4db2; text-decoration: underline; text-underline-offset: 3px; }
.account-name:focus-visible { outline: 2px solid #8879da; outline-offset: 3px; border-radius: 2px; }
.role-tag { color: #677285; font-size: 11px; }
.access-tag { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; }
.access-tag i { width: 6px; height: 6px; border-radius: 50%; background: #408967; }
.access-tag.active { color: #367451; }
.access-tag.suspended { color: #a34f58; }
.access-tag.suspended i { background: #b65d65; }
.details-button { justify-self: end; padding: 7px 9px; border: 1px solid #e4e5eb; border-radius: 5px; background: #fff; color: #5d4db2; font-size: 11px; font-weight: 600; cursor: pointer; }
.details-button:hover { background: #f5f3fc; }
.profile-loading { margin-bottom: 14px; color: #697487; font-size: 12px; }
.user-profile-hero { display: flex; align-items: center; gap: 15px; padding-bottom: 17px; border-bottom: 1px solid #e8eaf0; }
.profile-person-avatar { width: 66px; height: 66px; flex: 0 0 auto; border: 1px solid #ded9f3; border-radius: 50%; display: grid; place-items: center; overflow: hidden; background: #f0eefb; color: #5643b9; font-size: 21px; font-weight: 700; }
.profile-person-avatar img { width: 100%; height: 100%; object-fit: cover; }
.profile-hero-copy { min-width: 0; }
.profile-hero-copy h3 { margin: 0; overflow-wrap: anywhere; color: #26334b; font-size: 17px; font-weight: 650; letter-spacing: -.02em; }
.profile-hero-copy > p { margin: 4px 0 9px; color: #657088; font-size: 11px; line-height: 1.5; }
.user-profile-tags { margin-bottom: 17px; display: flex; align-items: center; gap: 14px; }
.user-profile-hero .user-profile-tags { margin: 0; flex-wrap: wrap; gap: 7px 12px; }
.open-to-work { padding: 4px 7px; border: 1px solid #cce8d6; border-radius: 5px; background: #edf7f0; color: #276c48; font-size: 9px; font-weight: 700; }
.profile-section { margin-top: 19px; }
.profile-section-heading { margin-bottom: 10px; display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; }
.profile-section-heading h3, .no-profile h3 { margin: 4px 0 0; color: #26334b; font-size: 13px; font-weight: 650; letter-spacing: -.015em; }
.profile-section-heading > small { color: #7b8493; font-size: 9px; white-space: nowrap; }
.profile-kicker { color: #6250be; font-size: 8px; font-weight: 700; letter-spacing: .075em; text-transform: uppercase; }
.profile-facts { margin: 0; padding: 15px; border: 1px solid #e8eaf0; border-radius: 8px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 17px 22px; background: #fbfbf9; }
.profile-facts > div { min-width: 0; display: grid; gap: 5px; }
.profile-facts dt { color: #7b8493; font-size: 9px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
.profile-facts dd { margin: 0; overflow-wrap: anywhere; color: #36435a; font-size: 12px; line-height: 1.5; }
.profile-facts dd a { color: #5d4db2; overflow-wrap: anywhere; }
.profile-facts dd a:hover { text-decoration: underline; }
.profile-facts .profile-fact-wide { grid-column: 1 / -1; }
.profile-long-text { margin: 0; padding: 12px 13px; border-left: 2px solid #d7d1f4; border-radius: 0 6px 6px 0; background: #fbfbf9; color: #40506b; font-size: 11px; line-height: 1.7; white-space: pre-wrap; overflow-wrap: anywhere; }
.profile-chip-list { display: flex; flex-wrap: wrap; gap: 7px; }
.profile-chip-list > span { padding: 6px 8px; border: 1px solid #e2dff2; border-radius: 999px; background: #f5f3fc; color: #51439a; font-size: 10px; font-weight: 600; }
.profile-entry-list { border: 1px solid #e8eaf0; border-radius: 7px; overflow: hidden; }
.profile-entry { padding: 12px 13px; background: #fff; }
.profile-entry + .profile-entry { border-top: 1px solid #e8eaf0; }
.profile-entry h4 { margin: 0; color: #2d3950; font-size: 12px; font-weight: 650; line-height: 1.4; }
.profile-entry-subtitle { margin: 3px 0 5px; color: #56647a; font-size: 10px; }
.profile-entry > small { color: #7d8797; font-size: 9px; }
.profile-entry-description { margin: 8px 0 0; color: #56647a; font-size: 10px; line-height: 1.6; white-space: pre-wrap; overflow-wrap: anywhere; }
.profile-language-list { border: 1px solid #e8eaf0; border-radius: 7px; overflow: hidden; }
.profile-language-list > div { min-height: 39px; padding: 8px 12px; display: flex; align-items: center; justify-content: space-between; gap: 10px; background: #fff; }
.profile-language-list > div + div { border-top: 1px solid #e8eaf0; }
.profile-language-list strong { color: #344158; font-size: 11px; font-weight: 600; }
.profile-language-list span { color: #657088; font-size: 10px; }
.profile-resume-list { display: grid; gap: 7px; }
.profile-resume { min-width: 0; padding: 9px; border: 1px solid #e8eaf0; border-radius: 7px; display: grid; grid-template-columns: 32px minmax(0, 1fr) auto; align-items: center; gap: 9px; background: #fbfbf9; }
.profile-pdf-mark { width: 30px; height: 30px; border-radius: 6px; display: grid; place-items: center; background: #f0eefb; color: #5d4db2; font-size: 8px; font-weight: 800; }
.profile-resume > div { min-width: 0; display: grid; gap: 4px; }
.profile-resume strong { overflow: hidden; color: #344158; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.profile-resume small { color: #7b8493; font-size: 8px; line-height: 1.45; }
.default-resume { padding: 4px 6px; border-radius: 4px; background: #edf7f0; color: #276c48; font-size: 8px; font-weight: 700; white-space: nowrap; }
.profile-empty, .no-profile > p { margin: 0; padding: 11px 12px; border: 1px dashed #dfe2e8; border-radius: 6px; color: #7b8493; font-size: 10px; line-height: 1.5; }
.no-profile > p { margin: 8px 0 10px; padding: 0; border: 0; }
.profile-alert, .profile-success, .profile-self-note { margin: 14px 0 0; padding: 10px 12px; border-radius: 6px; font-size: 11px; line-height: 1.5; }
.profile-alert { background: #fff3f4; color: #963448; }
.profile-success { background: #edf7f0; color: #276c48; }
.profile-self-note { background: #f4f5f8; color: #667389; }
.profile-actions { margin-top: 17px; display: flex; justify-content: flex-end; }
.suspend-form { margin-top: 17px; display: grid; gap: 7px; }
.suspend-form label { color: #586579; font-size: 11px; font-weight: 600; }
.suspend-form textarea { min-height: 76px; padding: 9px 10px; border: 1px solid #d9dde4; border-radius: 5px; resize: vertical; color: #29364d; font-size: 12px; line-height: 1.5; }
.suspend-form > div { display: flex; justify-content: flex-end; gap: 8px; }
.quiet-button, .danger-button { min-height: 34px; padding: 0 11px; border: 1px solid #d8dce3; border-radius: 5px; background: #fff; color: #3f4b61; font-size: 11px; font-weight: 600; cursor: pointer; }
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
.users-page.theme-dark { --page-ink: #edf1f7; --page-muted: #b4bfd1; --page-line: #2c3545; --page-line-strong: #455268; --page-surface: #171e2a; --page-raised: #1c2533; --page-accent: #b8aaff; color: var(--page-muted); }
.users-page.theme-dark :is(.page-heading h2, .record-total strong, .account-name, .profile-hero-copy h3, .profile-section-heading h3, .profile-facts dd, .profile-entry h4, .profile-language-list strong, .profile-resume strong, .state-panel strong) { color: var(--page-ink) !important; }
.users-page.theme-dark :is(.page-heading p:not(.eyebrow), .record-total span, .toolbar, .filter-field, .filter-count, .account-copy span, .role-tag, .profile-loading, .profile-hero-copy > p, .profile-section-heading > small, .profile-facts dt, .profile-entry-subtitle, .profile-entry > small, .profile-entry-description, .profile-language-list span, .profile-resume small, .profile-empty, .no-profile > p, .pagination, .suspend-form label) { color: var(--page-muted) !important; }
.users-page.theme-dark :is(.toolbar, .account-list, .account-row, .profile-facts, .profile-long-text, .profile-entry-list, .profile-entry, .profile-language-list, .profile-language-list > div, .profile-resume, .state-panel) { background-color: var(--page-raised) !important; border-color: var(--page-line) !important; box-shadow: none; }
.users-page.theme-dark .account-row + .account-row, .users-page.theme-dark .profile-entry + .profile-entry, .users-page.theme-dark .profile-language-list > div + div, .users-page.theme-dark .user-profile-hero { border-color: var(--page-line) !important; }
.users-page.theme-dark :is(.filter-field select, .suspend-form textarea) { background-color: var(--page-surface) !important; border-color: var(--page-line-strong) !important; color: var(--page-ink) !important; }
.users-page.theme-dark :is(.details-button, .quiet-button, .pagination button) { background-color: var(--page-surface) !important; border-color: var(--page-line-strong) !important; color: var(--page-muted) !important; }
.users-page.theme-dark :is(.clear-filters, .account-name:hover, .profile-facts dd a, .profile-kicker, .state-panel button) { color: var(--page-accent) !important; }
.users-page.theme-dark :is(.identity-mark, .profile-person-avatar, .profile-pdf-mark) { background-color: #302a51 !important; border-color: #51478a !important; color: #c6bcff !important; }
.users-page.theme-dark .profile-chip-list > span { border-color: #51478a !important; background-color: #2b2744 !important; color: #c6bcff !important; }
.users-page.theme-dark .pagination { border-color: var(--page-line) !important; }
.users-page.theme-dark :is(.access-tag.active, .open-to-work, .default-resume, .profile-success, .notice.success) { border-color: #365e4c !important; background-color: #1d3329 !important; color: #a7dbba !important; }
.users-page.theme-dark :is(.access-tag.suspended, .danger-button, .profile-alert, .notice.error, .error-state) { border-color: #68424b !important; background-color: #38242b !important; color: #f0aab3 !important; }
.users-page.theme-dark .profile-self-note { border-color: var(--page-line) !important; background-color: #252e3c !important; color: #c1cada !important; }
.users-page.theme-dark .access-tag.active i { background-color: #a7dbba !important; }
.users-page.theme-dark .access-tag.suspended i { background-color: #f0aab3 !important; }
@media (max-width: 760px) {
  .account-main { grid-template-columns: 32px minmax(0, 1fr) auto; gap: 10px; }
  .role-tag { grid-column: 2; grid-row: 2; }
  .access-tag { grid-column: 2; grid-row: 3; }
  .details-button { grid-column: 3; grid-row: 1 / span 3; }
}
@media (max-width: 560px) {
  .page-heading { align-items: flex-start; }
  .page-heading p:not(.eyebrow) { max-width: 40ch; }
  .record-total { padding-left: 10px; }
  .toolbar { align-items: stretch; flex-wrap: wrap; }
  .filter-field { flex: 1 1 100%; justify-content: space-between; }
  .filter-field select { width: 70%; }
  .filter-count { margin-left: 0; }
  .profile-facts { grid-template-columns: 1fr; }
  .profile-facts .profile-fact-wide { grid-column: auto; }
  .user-profile-hero { align-items: flex-start; }
  .profile-person-avatar { width: 54px; height: 54px; font-size: 17px; }
  .profile-resume { grid-template-columns: 30px minmax(0, 1fr); }
  .default-resume { grid-column: 2; justify-self: start; }
}
</style>
