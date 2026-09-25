<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BrandLogo from '@/components/landing/BrandLogo.vue'
import CompanyJobsPage from '@/views/company/CompanyJobsPage.vue'
import CompanyApplicantsPage from '@/views/company/CompanyApplicantsPage.vue'
import CompanyApplicantProfilePage from '@/views/company/CompanyApplicantProfilePage.vue'
import CompanySettingsPage from '@/views/company/CompanySettingsPage.vue'
import CompanyHelpPage from '@/views/company/CompanyHelpPage.vue'
import CompanyProfilePage from '@/views/company/CompanyProfilePage.vue'
import UiIcon from '@/components/company/UiIcon.vue'
import { clearAuthSession, displayNameForUser, getAuthSession, initialsForUser } from '@/services/auth'
import {
  applicantAvatarColor,
  applicantName,
  applicantStatusClass,
  applicantStatusLabel,
  fetchCompanyApplicantDashboardSummary,
  type ApplicantStatus,
  type CompanyApplicantListItem,
} from '@/services/companyApplicants'
import { companyJobs, relativeApplicationDate } from '@/services/companyWorkspace'
import { companyDarkMode, syncCompanyDarkMode } from '@/services/companyTheme'

const search = ref('')
const searchInput = ref<HTMLInputElement | null>(null)
const showNotifications = ref(false)
const notificationsRead = ref(false)
const showSidebarProfileMenu = ref(false)
const sidebarCollapsed = ref(false)
const mobileMenuOpen = ref(false)
const route = useRoute()
const router = useRouter()
const companyApplicants = ref<CompanyApplicantListItem[]>([])
const applicantTotal = ref(0)
const applicantCounts = ref({ APPLIED: 0, UNDER_REVIEW: 0, INTERVIEW: 0, SHORTLISTED: 0 })
const applicantSummaryLoading = ref(false)
const applicantSummaryError = ref('')
const currentUser = getAuthSession()?.user
syncCompanyDarkMode(currentUser)
const displayName = computed(() => currentUser ? displayNameForUser(currentUser) : 'Company account')
const initials = computed(() => currentUser ? initialsForUser(currentUser) : 'CO')

const pageComponents = {
  CompanyJobsPage,
  CompanyApplicantsPage,
  CompanyApplicantProfilePage,
  CompanySettingsPage,
  CompanyHelpPage,
  CompanyProfilePage,
}
const pageTitles: Record<string, string> = {
  CompanyDashboardPage: 'Recruiting',
  CompanyJobsPage: 'Jobs',
  CompanyApplicantsPage: 'Applicants',
  CompanyApplicantProfilePage: 'Candidate profile',
  CompanySettingsPage: 'Company settings',
  CompanyHelpPage: 'Help & Support',
  CompanyProfilePage: 'Company profile',
}
const activeNav = computed(() => ({
  CompanyDashboardPage: 'Dashboard',
  CompanyJobsPage: 'Jobs',
  CompanyApplicantsPage: 'Applicants',
  CompanyApplicantProfilePage: 'Applicants',
  CompanySettingsPage: 'Settings',
  CompanyHelpPage: 'Help & Support',
  CompanyProfilePage: 'Company profile',
} as Record<string, string>)[String(route.name)] ?? 'Dashboard')
const activePageComponent = computed(() => pageComponents[String(route.name) as keyof typeof pageComponents])
const isDashboardPage = computed(() => route.name === 'CompanyDashboardPage')
const pageTitle = computed(() => pageTitles[String(route.name)] ?? 'Recruiting')
const searchEnabled = computed(() => ['CompanyDashboardPage', 'CompanyJobsPage', 'CompanyApplicantsPage'].includes(String(route.name)))

async function loadApplicantSummary() {
  applicantSummaryLoading.value = true
  applicantSummaryError.value = ''
  try {
    const result = await fetchCompanyApplicantDashboardSummary()
    companyApplicants.value = result.recent
    applicantTotal.value = result.total
    applicantCounts.value = result.counts
  } catch (cause) {
    companyApplicants.value = []
    applicantTotal.value = 0
    applicantCounts.value = { APPLIED: 0, UNDER_REVIEW: 0, INTERVIEW: 0, SHORTLISTED: 0 }
    applicantSummaryError.value = cause instanceof Error ? cause.message : 'Unable to load applicant activity.'
  } finally {
    applicantSummaryLoading.value = false
  }
}

watch(() => route.name, name => {
  if (name === 'CompanyDashboardPage') void loadApplicantSummary()
}, { immediate: true })

function signOut() {
  clearAuthSession()
  void router.replace({ name: 'AuthPage' })
}

const navigation = computed(() => [
  { label: 'Dashboard', icon: 'grid', route: 'CompanyDashboardPage' },
  { label: 'Jobs', icon: 'briefcase', route: 'CompanyJobsPage' },
  { label: 'Applicants', icon: 'users', count: String(applicantCounts.value.SHORTLISTED), route: 'CompanyApplicantsPage' },
])
const accountNavigation = [
  { label: 'Settings', icon: 'settings', route: 'CompanySettingsPage' },
  { label: 'Help & Support', icon: 'mail', route: 'CompanyHelpPage' },
]

const filteredApplicants = computed(() => companyApplicants.value.filter((applicant) =>
  `${applicantName(applicant)} ${applicant.candidate.headline} ${applicant.job.title} ${applicantStatusLabel(applicant.status)}`.toLowerCase().includes(search.value.toLowerCase()),
))
const dashboardApplicants = computed(() => filteredApplicants.value.slice(0, 4))
const openRoleCount = computed(() => companyJobs.value.filter(job => job.status === 'Published').length)
const reviewCount = computed(() => applicantCounts.value.APPLIED + applicantCounts.value.UNDER_REVIEW)
const interviewCount = computed(() => applicantCounts.value.INTERVIEW)
const awaitingFeedbackCount = computed(() => applicantCounts.value.SHORTLISTED)
const decisionCount = computed(() => reviewCount.value + interviewCount.value + awaitingFeedbackCount.value)
const hasOpenRoles = computed(() => openRoleCount.value > 0)
const publishedViewCount = computed(() => companyJobs.value.filter(job => job.status === 'Published').reduce((total, job) => total + job.views, 0))
const shortlistRate = computed(() => applicantTotal.value ? Math.round(awaitingFeedbackCount.value / applicantTotal.value * 100) : 0)
const roleMomentum = computed(() => [...companyJobs.value]
  .filter(job => job.status === 'Published')
  .sort((left, right) => right.applicants - left.applicants)
  .slice(0, 4))
const roleMomentumMaximum = computed(() => Math.max(1, ...roleMomentum.value.map(job => job.applicants)))
const quietestRole = computed(() => [...companyJobs.value]
  .filter(job => job.status === 'Published')
  .sort((left, right) => left.applicants - right.applicants)[0])
const feedbackCandidate = computed(() => companyApplicants.value.find(applicant => applicant.status === 'SHORTLISTED'))

function queueAgeHours(value: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 3_600_000))
}

function queueAgeLabel(value: string) {
  const hours = queueAgeHours(value)
  if (hours < 24) return `${Math.max(1, hours)}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

const summaryStatement = computed(() => {
  if (!hasOpenRoles.value && decisionCount.value) {
    return {
      lead: `${decisionCount.value} candidates are waiting for a decision.`,
      detail: 'They remain from closed roles—review, archive, or reopen a role.',
    }
  }
  if (!hasOpenRoles.value) {
    return {
      lead: 'No open roles yet.',
      detail: 'Create a role to start receiving candidates.',
    }
  }
  if (!decisionCount.value) {
    return {
      lead: `No candidates are waiting for a decision across ${openRoleCount.value} open roles.`,
      detail: 'New activity will appear here as candidates enter the pipeline.',
    }
  }
  return {
    lead: `${decisionCount.value} candidates need a decision across ${openRoleCount.value} open roles.`,
    detail: 'Review the current queue and move each application to its next stage.',
  }
})

const compactSummary = computed(() => [
  { label: 'Needs a decision', value: String(decisionCount.value), detail: decisionCount.value ? 'Across the active queue' : 'Queue is clear', tone: decisionCount.value ? 'urgent' : 'neutral' },
  { label: 'Live roles', value: String(openRoleCount.value), detail: hasOpenRoles.value ? 'Accepting applicants' : 'Create a role to start', tone: 'neutral' },
  { label: 'Applicants', value: String(applicantTotal.value), detail: 'In the current queue', tone: 'neutral' },
  { label: 'Role views', value: publishedViewCount.value.toLocaleString(), detail: 'Across live roles', tone: 'neutral' },
])

const attentionItems = computed(() => {
  const statusPriority: Record<ApplicantStatus, number> = {
    SHORTLISTED: 0,
    INTERVIEW: 1,
    UNDER_REVIEW: 2,
    APPLIED: 3,
    OFFERED: 4,
    HIRED: 5,
    REJECTED: 6,
    WITHDRAWN: 7,
  }
  const waitingOn: Record<ApplicantStatus, string> = {
    SHORTLISTED: 'Final decision',
    INTERVIEW: 'Interview feedback',
    UNDER_REVIEW: 'First review',
    APPLIED: 'First review',
    OFFERED: 'Offer response',
    HIRED: 'No action needed',
    REJECTED: 'No action needed',
    WITHDRAWN: 'No action needed',
  }
  const actionFor: Record<ApplicantStatus, string> = {
    SHORTLISTED: 'Review',
    INTERVIEW: 'Submit feedback',
    UNDER_REVIEW: 'Review',
    APPLIED: 'Review',
    OFFERED: 'Open',
    HIRED: 'Open',
    REJECTED: 'Open',
    WITHDRAWN: 'Open',
  }

  return companyApplicants.value
    .filter(applicant => ['APPLIED', 'UNDER_REVIEW', 'INTERVIEW', 'SHORTLISTED'].includes(applicant.status))
    .sort((left, right) => statusPriority[left.status] - statusPriority[right.status] || new Date(left.appliedAt).getTime() - new Date(right.appliedAt).getTime())
    .slice(0, 3)
    .map(applicant => ({
      id: applicant.id,
      priority: applicant.status === 'SHORTLISTED' || queueAgeHours(applicant.appliedAt) >= 72 ? 'High' : 'Medium',
      subject: applicantName(applicant),
      context: applicant.job.title,
      waitingOn: waitingOn[applicant.status],
      age: queueAgeLabel(applicant.appliedAt),
      action: actionFor[applicant.status],
    }))
})

const pipelineStages = computed(() => {
  return [
    { label: 'Active candidates', value: applicantTotal.value, description: 'All current candidates', detail: 'Open the full queue', tone: 'complete' },
    { label: 'Needs review', value: reviewCount.value, description: 'New and under review', detail: 'Applications in first review', tone: 'review' },
    { label: 'Interview feedback', value: interviewCount.value, description: 'Candidates in interview', detail: 'Applications in interview', tone: 'interview' },
    { label: 'Final decision', value: awaitingFeedbackCount.value, description: 'Shortlisted candidates', detail: 'Waiting for a final decision', tone: 'decision' },
  ]
})

const roleWatch = computed(() => {
  const popularRole = [...companyJobs.value]
    .filter(job => job.status === 'Published')
    .sort((left, right) => right.applicants - left.applicants)[0]
  if (!hasOpenRoles.value) return []
  return [
    ...(feedbackCandidate.value ? [{ label: applicantName(feedbackCandidate.value), value: queueAgeLabel(feedbackCandidate.value.appliedAt), title: feedbackCandidate.value.job.title, detail: 'Awaiting a final decision', action: 'Review candidate', target: 'Applicants' }] : []),
    ...(popularRole ? [{ label: popularRole.title, value: `${popularRole.applicants}`, title: 'Most active role', detail: 'Active candidates to triage', action: 'Open role', target: 'Jobs' }] : []),
    ...(quietestRole.value ? [{ label: quietestRole.value.title, value: `${quietestRole.value.applicants}`, title: 'Lowest applicant flow', detail: 'Review sourcing and role visibility', action: 'Inspect role', target: 'Jobs' }] : []),
  ]
})

function applicantJobTitle(jobId: string) {
  return companyApplicants.value.find(applicant => applicant.job.id === jobId)?.job.title
    ?? companyJobs.value.find(job => job.id === jobId)?.title
    ?? 'Role no longer listed'
}

function selectNav(label: string) {
  const target = [...navigation.value, ...accountNavigation].find(item => item.label === label)
  if (target) void router.push({ name: target.route })
  mobileMenuOpen.value = false
}

function openJobComposer() {
  mobileMenuOpen.value = false
  void router.push({ name: 'CompanyJobsPage', query: { compose: '1' } })
}

function openNotifications() {
  showNotifications.value = !showNotifications.value
  showSidebarProfileMenu.value = false
}

function openSidebarProfileMenu() {
  showSidebarProfileMenu.value = !showSidebarProfileMenu.value
  showNotifications.value = false
}

function openCompanyProfile() {
  showSidebarProfileMenu.value = false
  mobileMenuOpen.value = false
  void router.push({ name: 'CompanyProfilePage' })
}

function markNotificationsRead() {
  notificationsRead.value = true
  showNotifications.value = false
}

function handleShortcut(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    searchInput.value?.focus()
  }
  if (event.key === 'Escape') {
    showNotifications.value = false
    showSidebarProfileMenu.value = false
    mobileMenuOpen.value = false
  }
}

onMounted(() => window.addEventListener('keydown', handleShortcut))
onBeforeUnmount(() => window.removeEventListener('keydown', handleShortcut))
</script>

<template>
  <div class="company-shell" :class="{ 'sidebar-is-collapsed': sidebarCollapsed, 'theme-dark': companyDarkMode }">
    <a class="skip-link" href="#dashboard-content">Skip to dashboard content</a>

    <button v-if="mobileMenuOpen" type="button" class="sidebar-backdrop" aria-label="Close navigation" @click="mobileMenuOpen = false" />

    <aside id="company-navigation" class="company-sidebar" :class="{ open: mobileMenuOpen }">
      <div class="sidebar-brand">
        <BrandLogo variant="dark" :icon-only="sidebarCollapsed" />
        <button type="button" class="collapse-button mobile-close" aria-label="Close navigation" @click="mobileMenuOpen = false"><UiIcon name="close" :size="18" /></button>
      </div>

      <p class="sidebar-label">Workspace</p>
      <nav class="sidebar-nav" aria-label="Company navigation">
        <button v-for="item in navigation" :key="item.label" type="button" class="sidebar-link" :class="{ selected: activeNav === item.label }" :aria-current="activeNav === item.label ? 'page' : undefined" :title="sidebarCollapsed ? item.label : undefined" @click="selectNav(item.label)">
          <UiIcon :name="item.icon" :size="19" />
          <span>{{ item.label }}</span>
          <span v-if="item.count" class="nav-count">{{ item.count }}</span>
        </button>
      </nav>

      <div class="sidebar-bottom">
        <p class="sidebar-label">Account</p>
        <button v-for="item in accountNavigation" :key="item.label" type="button" class="sidebar-link" :class="{ selected: activeNav === item.label }" :aria-current="activeNav === item.label ? 'page' : undefined" :title="sidebarCollapsed ? item.label : undefined" @click="selectNav(item.label)"><UiIcon :name="item.icon" :size="19" /><span>{{ item.label }}</span></button>

        <div class="profile-wrap">
          <button type="button" class="sidebar-profile" aria-label="Company account menu" :aria-expanded="showSidebarProfileMenu" aria-controls="sidebar-profile-menu" @click="openSidebarProfileMenu">
            <span class="avatar avatar-small avatar-emma">{{ initials }}</span>
            <span class="profile-copy"><strong>{{ displayName }}</strong></span>
            <UiIcon name="chevron" :size="16" />
          </button>
        </div>
      </div>
    </aside>

    <button type="button" class="collapse-button sidebar-dock-button desktop-collapse" :class="{ docked: sidebarCollapsed }" :aria-label="sidebarCollapsed ? 'Expand sidebar' : 'Dock sidebar'" :aria-pressed="sidebarCollapsed" @click="sidebarCollapsed = !sidebarCollapsed">
      <UiIcon name="chevron" :size="18" />
    </button>
    <div v-if="showSidebarProfileMenu" id="sidebar-profile-menu" class="profile-menu" role="menu" aria-label="Company account actions">
      <div class="profile-menu-heading"><strong>{{ displayName }}</strong><small>{{ currentUser?.email ?? 'Company account' }}</small></div>
      <button type="button" role="menuitem" @click="openCompanyProfile">Company profile</button>
      <button type="button" role="menuitem" @click="signOut">Sign out</button>
    </div>

    <main id="dashboard-content" class="dashboard-main">
      <header class="dashboard-header">
        <button type="button" class="mobile-menu-button" aria-label="Open navigation" aria-controls="company-navigation" :aria-expanded="mobileMenuOpen" @click="mobileMenuOpen = true"><UiIcon name="menu" :size="21" /></button>
        <div class="header-copy"><p class="eyebrow">Company workspace</p><h1>{{ pageTitle }}</h1></div>
        <div class="header-actions">
          <label v-if="searchEnabled" class="header-search"><UiIcon name="search" :size="18" /><input ref="searchInput" v-model="search" type="search" :placeholder="route.name === 'CompanyJobsPage' ? 'Search job roles' : route.name === 'CompanyApplicantsPage' ? 'Search applicants' : 'Search candidates or roles'" aria-label="Search jobs and applicants" /><kbd>⌘K</kbd></label>
          <div class="notification-wrap">
            <button type="button" class="icon-button" aria-label="Notifications" :aria-expanded="showNotifications" @click="openNotifications"><UiIcon name="bell" :size="19" /><span v-if="!notificationsRead" class="notification-dot" /></button>
            <div v-if="showNotifications" class="notification-popover"><div class="popover-heading"><strong>Notifications</strong><button type="button" @click="markNotificationsRead">Mark as read</button></div><p><span class="notice-dot accent-dot" /> Four applications need review.</p><p><span class="notice-dot green-dot" /> The Product Designer role is live.</p></div>
          </div>
        </div>
      </header>

      <nav v-if="isDashboardPage" class="mobile-workspace-nav" aria-label="Company workspace navigation">
        <button v-for="item in navigation" :key="item.label" type="button" :class="{ selected: activeNav === item.label }" :aria-current="activeNav === item.label ? 'page' : undefined" @click="selectNav(item.label)">
          <UiIcon :name="item.icon" :size="16" />
          <span>{{ item.label }}</span>
          <em v-if="item.count">{{ item.count }}</em>
        </button>
      </nav>

      <div class="dashboard-content">
        <template v-if="isDashboardPage">
        <section class="welcome-row" aria-labelledby="dashboard-summary-title">
          <div>
            <p class="section-kicker">Today’s hiring priorities</p>
            <h2 id="dashboard-summary-title">Hiring activity</h2>
          </div>
        </section>

        <section class="summary-strip" aria-label="Hiring summary">
          <div v-for="item in compactSummary" :key="item.label" class="summary-item">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        </section>

        <section class="operations-grid" aria-label="Hiring pipeline health">
          <article class="pipeline-panel">
            <div class="panel-heading"><div><p class="panel-kicker">Candidate flow</p><h3>Pipeline requiring action</h3><p>Each stage links to the work that moves candidates forward.</p></div></div>
            <div class="pipeline-stages">
              <button v-for="stage in pipelineStages" :key="stage.label" type="button" class="pipeline-stage" :class="stage.tone" :aria-label="`Open ${stage.label.toLowerCase()} candidates`" @click="selectNav('Applicants')">
                <div class="stage-copy"><span>{{ stage.label }}</span><small>{{ stage.description }}</small></div>
                <strong>{{ stage.value }}</strong>
                <span class="stage-detail">{{ stage.detail }}</span>
                <UiIcon name="chevron" :size="15" />
              </button>
            </div>
            <p class="pipeline-insight"><strong>Where to focus:</strong> {{ reviewCount }} candidates need a first review; {{ awaitingFeedbackCount }} are ready for a final decision.</p>
          </article>

          <aside class="role-watch-panel" aria-labelledby="role-watch-title">
            <div class="panel-heading"><div><p class="panel-kicker">Role health</p><h3 id="role-watch-title">What to inspect next</h3></div></div>
            <div v-if="roleWatch.length" class="role-watch-list">
              <div v-for="item in roleWatch" :key="item.label" class="role-watch-item"><div><strong>{{ item.label }}</strong><span>{{ item.title }}</span><small>{{ item.detail }}</small></div><b>{{ item.value }}</b><button type="button" :aria-label="`${item.action}: ${item.label}`" @click="selectNav(item.target)">{{ item.action }} <UiIcon name="chevron" :size="14" /></button></div>
            </div>
            <div v-else class="role-empty"><strong>No open roles.</strong><p v-if="decisionCount">{{ decisionCount }} candidates remain from closed roles. Review or archive them before reopening a role.</p><p v-else>Create a role to start receiving applicants.</p><button type="button" @click="openJobComposer">Create a role <UiIcon name="plus" :size="14" /></button></div>
          </aside>
        </section>

        <section class="panel table-panel applicants-panel-table" aria-labelledby="recent-applicants-title">
          <div class="panel-heading table-heading"><div><p class="panel-kicker">Latest applications</p><h3 id="recent-applicants-title">New in the queue</h3><p>Recent candidates, ready for their next action.</p></div><button type="button" class="text-button" @click="selectNav('Applicants')">Open all applicants <UiIcon name="chevron" :size="15" /></button></div>
          <div class="data-table applicants-table">
            <div class="table-row table-head"><span>Candidate</span><span>Applied for</span><span>Applied on</span><span>Status</span><span /></div>
            <div v-if="applicantSummaryError" class="empty-state" role="alert"><strong>Applicant activity is unavailable</strong><span>{{ applicantSummaryError }}</span><button type="button" @click="loadApplicantSummary">Try again</button></div>
            <div v-else-if="applicantSummaryLoading" class="empty-state" role="status"><span>Loading recent applications…</span></div>
            <div v-for="applicant in dashboardApplicants" :key="applicant.id" class="table-row"><div class="candidate-cell"><span class="avatar" :class="`avatar-${applicantAvatarColor(applicant.id)}`">{{ applicantName(applicant).split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase() }}</span><span><strong>{{ applicantName(applicant) }}</strong><small>{{ applicant.candidate.headline || applicant.job.title }}</small></span></div><span class="muted-cell" data-label="Applied for">{{ applicantJobTitle(applicant.job.id) }}</span><span class="muted-cell" data-label="Applied on">{{ relativeApplicationDate(applicant.appliedAt) }}</span><span class="status-cell" data-label="Status"><span class="status-pill" :class="applicantStatusClass(applicant.status)">{{ applicantStatusLabel(applicant.status) }}</span></span><button type="button" class="queue-action row-action" :aria-label="`Review ${applicantName(applicant)}`" @click="selectNav('Applicants')">Review <UiIcon name="chevron" :size="15" /></button></div>
            <div v-if="!applicantSummaryLoading && !applicantSummaryError && !dashboardApplicants.length" class="empty-state"><UiIcon name="search" :size="22" /><strong>{{ search ? 'No applicants found' : 'No applications yet' }}</strong><span>{{ search ? 'Try a different candidate, job, or status.' : 'New applications will appear here when candidates apply.' }}</span></div>
          </div>
        </section>
        </template>
        <component v-else-if="activePageComponent" :is="activePageComponent" :search="search" />
      </div>
    </main>
  </div>
</template>

<style scoped>
:global(*) { box-sizing: border-box; }
:global(body:has(.company-shell)) { margin: 0; overflow-x: hidden; background: #f6f6f3; color: #19233c; }
:global(button), :global(input), :global(select) { font: inherit; }

.company-shell { --sidebar-width: 218px; --ink: #19233c; --ink-soft: #40506b; --muted: #657088; --line: #e2e4e8; --line-strong: #c9ced7; --canvas: #f6f6f3; --surface: #fbfbf9; --surface-raised: #fff; --accent: #6a56cf; --accent-dark: #5643b9; --accent-soft: #f0eefb; min-height: 100dvh; display: flex; background-color: var(--canvas); color: var(--ink); font-family: "Outfit", "Bai Jamjuree", ui-sans-serif, system-ui, sans-serif; transition: background-color 220ms ease, color 220ms ease; }
.company-shell.theme-dark { --ink: #edf1f7; --ink-soft: #b4bfd1; --muted: #8491a7; --line: #2c3545; --line-strong: #455268; --canvas: #121722; --surface: #171e2a; --surface-raised: #1c2533; --accent: #9a88f1; --accent-dark: #b8aaff; --accent-soft: #2b2744; }
:global(body:has(.company-shell.theme-dark)) { background: #121722; color: #edf1f7; }
.sidebar-is-collapsed.company-shell { --sidebar-width: 82px; }
.skip-link { position: fixed; top: 10px; left: 10px; z-index: 100; padding: 10px 14px; border-radius: 6px; background: var(--ink); color: #fff; transform: translateY(-160%); transition: transform 180ms ease; }
.skip-link:focus { transform: translateY(0); }
button { color: inherit; }
button:active { transform: translateY(1px); }
button:focus-visible, select:focus-visible, input:focus-visible { outline: 3px solid rgb(123 102 255 / 30%); outline-offset: 2px; }

.company-sidebar { position: sticky; top: 0; z-index: 20; width: var(--sidebar-width); height: 100dvh; flex: 0 0 var(--sidebar-width); padding: 24px 12px 18px; display: flex; flex-direction: column; overflow-y: auto; border-right: 1px solid var(--line); background: var(--surface); backdrop-filter: blur(18px); transition: width 220ms ease, flex-basis 220ms ease, transform 220ms ease, background-color 220ms ease; }
.sidebar-brand { min-height: 42px; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 0 8px 24px; }
.sidebar-brand :deep(a) { gap: 9px !important; }
.sidebar-brand :deep(.brand-logo--wordmark img) { height: 45px !important; }
.sidebar-brand :deep(.brand-logo--icon img) { width: 33px !important; height: 33px !important; }
.collapse-button, .mobile-menu-button { border: 1px solid var(--line); background: var(--surface-raised); color: var(--ink-soft); display: grid; place-items: center; cursor: pointer; transition: border-color 180ms ease, color 180ms ease, background 180ms ease; }
.collapse-button { width: 30px; height: 30px; border-radius: 7px; }
.collapse-button:hover, .mobile-menu-button:hover { border-color: var(--line-strong); color: var(--accent-dark); background: var(--accent-soft); }
.sidebar-dock-button { position: fixed; top: 24px; left: calc(var(--sidebar-width) - 10px); z-index: 65; width: 38px; height: 38px; border-radius: 10px; background: var(--surface-raised); box-shadow: 0 3px 12px rgb(11 43 130 / 9%); }
.sidebar-dock-button .ui-icon { transition: transform 180ms ease; }
.sidebar-dock-button.docked .ui-icon { transform: rotate(180deg); }
.sidebar-label { margin: 17px 12px 9px; color: #7a8190; font-size: 11px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; }
.sidebar-nav { display: grid; gap: 3px; }
.sidebar-link { position: relative; width: 100%; min-height: 42px; border: 0; border-radius: 6px; padding: 0 12px; display: flex; align-items: center; gap: 11px; background: transparent; color: #5d6676; text-align: left; font-size: 14px; font-weight: 500; cursor: pointer; transition: color 180ms ease, background 180ms ease; margin-bottom: 3px; }
.sidebar-link:hover { background: var(--accent-soft); color: var(--ink); }
.sidebar-link.selected { background: rgb(106 86 207 / 7%); color: var(--accent-dark); font-weight: 600; }
.sidebar-link.selected::before { position: absolute; left: 0; width: 2px; height: 18px; border-radius: 2px; background: var(--accent); content: ''; }
.nav-count { min-width: 19px; margin-left: auto; padding: 1px 5px; border-radius: 4px; background: var(--accent-soft); color: var(--accent-dark); text-align: center; font-size: 11px; font-variant-numeric: tabular-nums; }
.selected .nav-count { background: rgb(106 86 207 / 14%); color: var(--accent-dark); }
.sidebar-bottom { margin-top: auto; }
.profile-wrap { position: relative; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--line); }
.sidebar-profile { width: 100%; min-height: 49px; padding: 6px 8px; border: 0; border-radius: 9px; display: flex; align-items: center; gap: 10px; background: transparent; text-align: left; cursor: pointer; transition: background 180ms ease; }
.sidebar-profile:hover { background: var(--accent-soft); }
.sidebar-profile > .ui-icon { margin-left: auto; transform: rotate(-90deg); }
.profile-copy { min-width: 0; display: grid; gap: 2px; }
.profile-copy strong { overflow: hidden; color: var(--ink); font-size: 14px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.profile-copy small { color: var(--muted); font-size: 12px; }
.profile-menu { position: fixed; left: 14px; bottom: 82px; z-index: 65; width: 208px; padding: 7px; border: 1px solid var(--line); border-radius: 10px; background: var(--surface-raised); box-shadow: 0 18px 40px rgb(11 43 130 / 14%); }
.profile-menu-heading { padding: 9px 10px 11px; border-bottom: 1px solid var(--line); display: grid; gap: 3px; }
.profile-menu-heading strong { overflow: hidden; color: var(--ink); font-size: 14px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.profile-menu-heading small { overflow: hidden; color: var(--muted); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.profile-menu button { width: 100%; margin-top: 4px; padding: 9px 10px; border: 0; border-radius: 6px; display: block; background: transparent; color: var(--ink-soft); text-align: left; font-size: 14px; cursor: pointer; }
.profile-menu button:hover { background: var(--accent-soft); }
.profile-menu button:last-child { color: #9b5262; }

.dashboard-main { min-width: 0; flex: 1; }
.dashboard-header { position: sticky; top: 0; z-index: 30; min-height: 76px; padding: 16px clamp(24px, 3vw, 48px); display: flex; align-items: center; justify-content: space-between; gap: 30px; border-bottom: 1px solid var(--line); background: var(--canvas); backdrop-filter: blur(16px); }
.eyebrow { margin: 0 0 3px; color: var(--muted); font-size: 14px; }
.dashboard-header h1 { margin: 0; color: var(--ink); font-size: 17px; font-weight: 600; letter-spacing: -.02em; }
.header-actions { display: flex; align-items: center; gap: 9px; }
.header-search { width: clamp(220px, 24vw, 330px); height: 41px; padding: 0 11px; display: flex; align-items: center; gap: 9px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface-raised); color: #8290b4; transition: border-color 180ms ease, background 180ms ease, box-shadow 180ms ease; }
.header-search:focus-within { border-color: var(--accent); background: var(--surface-raised); box-shadow: 0 4px 14px rgb(123 102 255 / 12%); }
.header-search input { min-width: 0; flex: 1; border: 0; outline: 0; background: transparent; color: var(--ink); font-size: 14px; }
.header-search input::placeholder { color: #8994b6; }
.header-search kbd { padding: 2px 5px; border: 1px solid var(--line); border-radius: 4px; background: var(--accent-soft); color: #68759d; font-size: 11px; }
.icon-button, .header-avatar { position: relative; width: 41px; height: 41px; border: 1px solid var(--line); display: grid; place-items: center; background: var(--surface-raised); cursor: pointer; transition: border-color 180ms ease, background 180ms ease; }
.icon-button { border-radius: 8px; color: var(--ink-soft); }
.icon-button:hover { border-color: var(--line-strong); background: var(--accent-soft); }
.header-avatar { border: 0; border-radius: 10px; background: var(--ink); color: #fff; font-size: 13px; font-weight: 600; }
.header-profile-wrap { position: relative; }
.header-profile-menu { position: absolute; top: 50px; right: 0; z-index: 10; width: 180px; padding: 12px 6px 6px; border: 1px solid var(--line); border-radius: 10px; display: grid; background: var(--surface-raised); box-shadow: 0 20px 50px rgb(11 43 130 / 12%); }
.header-profile-menu > strong, .header-profile-menu > span { padding-inline: 7px; }
.header-profile-menu > strong { color: var(--ink); font-size: 14px; font-weight: 600; }
.header-profile-menu > span { margin: 2px 0 10px; color: var(--muted); font-size: 12px; }
.header-profile-menu button { padding: 8px 7px; border: 0; border-radius: 5px; background: transparent; color: var(--ink-soft); text-align: left; font-size: 13px; cursor: pointer; }
.header-profile-menu button:hover { background: var(--accent-soft); color: var(--ink); }
.notification-dot { position: absolute; top: 8px; right: 8px; width: 6px; height: 6px; border: 1px solid #fff; border-radius: 50%; background: var(--accent); }
.notification-wrap { position: relative; }
.notification-popover { position: absolute; top: 50px; right: 0; z-index: 10; width: 290px; padding: 16px; border: 1px solid var(--line); border-radius: 10px; background: var(--surface-raised); box-shadow: 0 20px 50px rgb(11 43 130 / 12%); font-size: 14px; }
.popover-heading { display: flex; align-items: center; justify-content: space-between; padding-bottom: 11px; border-bottom: 1px solid var(--line); }
.popover-heading strong { font-size: 15px; }
.popover-heading button { padding: 0; border: 0; background: none; color: var(--accent-dark); font-size: 13px; cursor: pointer; }
.notification-popover p { display: flex; align-items: center; gap: 9px; margin: 13px 0 0; color: var(--ink-soft); }
.notice-dot, .funnel-dot { width: 7px; height: 7px; flex: 0 0 7px; border-radius: 2px; }

.dashboard-content { width: min(100%, 1840px); margin: 0 auto; padding: 45px clamp(24px, 3vw, 48px) 64px; }
.welcome-row { display: flex; align-items: end; justify-content: space-between; gap: 32px; margin-bottom: 32px; }
.section-kicker, .panel-kicker { color: #6654d8 !important; font-weight: 600; letter-spacing: .02em; }
.section-kicker { margin: 0 0 8px !important; font-size: 14px !important; }
.welcome-row h2 { max-width: 650px; margin: 0 0 9px; color: var(--ink); font-size: clamp(27px, 3vw, 42px); font-weight: 600; line-height: 1.05; letter-spacing: -.045em; text-wrap: balance; }
.welcome-row > div > p:last-child { max-width: 54ch; margin: 0; color: var(--muted); font-size: 16px; line-height: 1.55; }
.primary-button { min-height: 43px; padding: 0 17px; border: 0; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: var(--accent); color: #fff; font-size: 15px; font-weight: 600; box-shadow: 0 8px 20px rgb(123 102 255 / 22%); cursor: pointer; transition: background 180ms ease, box-shadow 180ms ease, transform 180ms ease; }
.primary-button:hover { background: #6f5cf9; box-shadow: 0 10px 24px rgb(123 102 255 / 28%); transform: translateY(-1px); }

.stats-grid { margin-bottom: 20px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border: 1px solid var(--line); border-radius: 12px; background: var(--surface-raised); }
.stat-card { min-width: 0; padding: 19px 21px 21px; }
.stat-card + .stat-card { border-left: 1px solid var(--line); }
.stat-heading { display: flex; align-items: center; gap: 8px; }
.stat-icon { width: 28px; height: 28px; border-radius: 7px; display: grid; place-items: center; background: var(--accent-soft); color: #6654d8; }
.stat-card p { margin: 0; color: var(--muted); font-size: 14px; font-weight: 500; }
.stat-number-row { margin: 14px 0 1px; display: flex; align-items: baseline; gap: 11px; }
.stat-number-row strong { color: var(--ink); font-size: 31px; font-weight: 600; line-height: 1; letter-spacing: -.045em; font-variant-numeric: tabular-nums; }
.trend { display: inline-flex; align-items: center; color: #267554; font-size: 13px; font-weight: 600; font-variant-numeric: tabular-nums; }
.stat-card small { color: #7b87a8; font-size: 12px; }

.overview-grid, .bottom-grid { margin-bottom: 20px; display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(310px, .85fr); gap: 20px; align-items: start; }
.panel { min-width: 0; padding: 25px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface-raised); box-shadow: 0 8px 26px rgb(11 43 130 / 5%); }
.panel-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.panel-kicker { margin: 0 0 5px !important; font-size: 12px !important; text-transform: uppercase; letter-spacing: .1em !important; }
.panel-heading h3 { margin: 0 0 5px; color: var(--ink); font-size: 18px; font-weight: 600; letter-spacing: -.018em; }
.panel-heading p:not(.panel-kicker) { margin: 0; color: var(--muted); font-size: 14px; line-height: 1.45; }
.select-control { height: 34px; padding: 0 28px 0 10px; border: 1px solid var(--line); border-radius: 7px; background-color: var(--surface-raised); color: var(--ink-soft); font-size: 13px; cursor: pointer; }
.chart-key { margin-top: 28px; display: flex; align-items: center; gap: 17px; color: var(--muted); font-size: 13px; }
.chart-key > span { display: inline-flex; align-items: center; gap: 6px; }
.key-swatch { width: 8px; height: 8px; border-radius: 2px; }
.accent-swatch, .bar-main, .accent-dot { background: var(--accent); }
.light-swatch, .bar-secondary { background: #c6bef4; }
.chart-key strong { margin-left: auto; color: var(--ink); font-size: 19px; font-weight: 600; font-variant-numeric: tabular-nums; }
.chart-key strong small { display: block; color: var(--muted); font-size: 11px; font-weight: 400; text-align: right; }
.bar-chart { height: 225px; margin-top: 17px; display: flex; }
.y-axis { width: 30px; padding-bottom: 22px; display: flex; flex-direction: column; justify-content: space-between; color: #8290b4; font-size: 11px; font-variant-numeric: tabular-nums; }
.chart-plot { position: relative; min-width: 0; flex: 1; padding: 0 5px 0 8px; display: flex; justify-content: space-between; }
.grid-line { position: absolute; right: 0; left: 8px; border-top: 1px dashed #e6e1fa; }
.line-1 { top: 4px; } .line-2 { top: 52px; } .line-3 { top: 100px; } .line-4 { top: 148px; }
.chart-column { z-index: 1; width: 13%; align-self: stretch; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; color: #8290b4; font-size: 11px; }
.chart-column > span { position: absolute; bottom: 0; white-space: nowrap; transform: translateY(18px); }
.bar-group { width: 100%; height: 188px; display: flex; align-items: flex-end; justify-content: center; gap: 3px; }
.bar-group i { width: clamp(7px, 1vw, 12px); display: block; border-radius: 3px 3px 0 0; }

.funnel-wrap { margin-top: 28px; display: grid; grid-template-columns: 1fr .9fr; gap: 22px; align-items: center; }
.funnel-visual { display: grid; gap: 6px; }
.funnel-segment { height: 36px; padding: 0 10px; border-radius: 5px; display: flex; align-items: center; justify-content: space-between; color: #fff; font-size: 14px; font-weight: 600; font-variant-numeric: tabular-nums; }
.funnel-segment small { font-size: 11px; font-weight: 400; opacity: .84; }
.funnel-dark { width: 100%; background: #0b2b82; }
.funnel-mid { width: 82%; background: #5269b2; }
.funnel-light { width: 65%; background: #d8d1ff; color: #263d80; }
.funnel-accent { width: 48%; background: var(--accent); }
.funnel-side { display: grid; gap: 14px; }
.funnel-side > div { display: flex; align-items: center; gap: 7px; color: var(--muted); font-size: 12px; }
.funnel-side strong { margin-left: auto; color: var(--ink); font-size: 12px; font-variant-numeric: tabular-nums; }
.dark-dot { background: #0b2b82; } .mid-dot { background: #5269b2; } .light-dot { background: #bcb1f5; } .green-dot { background: #438d74; }
.activity-footer { margin-top: 27px; padding-top: 16px; border-top: 1px solid var(--line); display: flex; align-items: center; gap: 7px; color: var(--muted); font-size: 12px; }
.positive-chip { display: inline-flex; align-items: center; gap: 2px; color: #267554; font-weight: 600; }

.table-panel { margin-bottom: 20px; padding-bottom: 12px; }
.table-heading { align-items: center; margin-bottom: 20px; }
.text-button { padding: 7px 0 7px 7px; border: 0; display: inline-flex; align-items: center; gap: 4px; background: none; color: var(--accent-dark); font-size: 13px; font-weight: 600; cursor: pointer; }
.text-button .ui-icon { transition: transform 180ms ease; }
.text-button:hover .ui-icon { transform: translateX(2px); }
.data-table { width: 100%; }
.table-row { position: relative; min-height: 64px; display: grid; grid-template-columns: 1.65fr 1.2fr 1.2fr .9fr 26px; align-items: center; gap: 14px; border-top: 1px solid var(--line); font-size: 14px; }
.table-head { min-height: 34px; border: 0; color: #7b87a8; font-size: 12px; font-weight: 600; letter-spacing: .025em; }
.candidate-cell { min-width: 0; display: flex; align-items: center; gap: 11px; }
.candidate-cell > span:last-child { min-width: 0; display: grid; gap: 2px; }
.candidate-cell strong, .job-title-cell strong { overflow: hidden; color: var(--ink); font-size: 14px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.candidate-cell small { overflow: hidden; color: var(--muted); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.muted-cell { color: var(--ink-soft); font-size: 13px; }
.avatar { width: 34px; height: 34px; flex: 0 0 34px; border-radius: 9px; display: grid; place-items: center; font-size: 11px; font-weight: 600; }
.avatar-small { width: 34px; height: 34px; flex-basis: 34px; }
.avatar-tiny { width: 29px; height: 29px; flex-basis: 29px; border-radius: 7px; font-size: 10px; }
.avatar-emma { background: #f0edff; color: #5f4bd2; }
.avatar-coral { background: #fff0f1; color: #9b5262; }
.avatar-blue { background: #eaf1ff; color: #315eaa; }
.avatar-purple { background: #f0edff; color: #604bd0; }
.avatar-orange { background: #fff3e4; color: #91602c; }
.status-pill { min-height: 28px; padding: 5px 10px; border: 1px solid; border-radius: 999px; display: inline-flex; align-items: center; font-size: 11px; font-weight: 650; letter-spacing: .01em; line-height: 1; white-space: nowrap; }
.status-shortlisted { border-color: #d0c4f2; background: #f7f3ff; color: #5b46c6; }
.status-published { border-color: #b8e1c5; background: #f0faf3; color: #2f7b4e; }
.status-under-review { border-color: #c6d4ed; background: #f5f8ff; color: #45628e; }
.status-new { border-color: #b6d5ef; background: #f1f7ff; color: #21649f; }
.status-interview { border-color: #b5e1d5; background: #effaf7; color: #227565; }
.status-offer-sent { border-color: #f0d5a7; background: #fff9eb; color: #8b6420; }
.status-withdrawn { border-color: #d8dbe5; background: #f5f6f9; color: #65708a; }
.status-draft { border-color: #edd39f; background: #fff9ec; color: #8b6820; }
.status-closed { border-color: #d8dce5; background: #f7f8fa; color: #59617a; }
.ghost-icon-button, .row-dots { padding: 6px; border: 0; border-radius: 6px; display: grid; place-items: center; background: none; color: #8290b4; cursor: pointer; transition: background 180ms ease, color 180ms ease; }
.ghost-icon-button:hover, .row-dots:hover { background: var(--accent-soft); color: var(--accent-dark); }
.row-dots { justify-self: end; }
.empty-state { min-height: 150px; display: grid; place-items: center; place-content: center; gap: 6px; color: var(--muted); text-align: center; }
.empty-state strong { color: var(--ink); font-size: 15px; font-weight: 600; }
.empty-state span { font-size: 13px; }

.jobs-panel, .interviews-panel { min-width: 0; }
.job-tabs { margin-bottom: 7px; display: flex; gap: 22px; overflow-x: auto; border-bottom: 1px solid var(--line); scrollbar-width: none; }
.job-tabs button { position: relative; padding: 0 0 11px; border: 0; background: none; color: #7b87a8; font-size: 12px; white-space: nowrap; cursor: pointer; }
.job-tabs button.active { color: var(--ink); font-weight: 600; }
.job-tabs button.active::after { position: absolute; right: 0; bottom: -1px; left: 0; height: 2px; background: var(--accent); content: ""; }
.compact-table .table-row { min-height: 53px; grid-template-columns: 2fr .75fr .7fr .85fr; }
.job-title-cell { min-width: 0; display: flex; align-items: center; gap: 9px; }
.job-mark { width: 29px; height: 29px; flex: 0 0 29px; border-radius: 7px; display: grid; place-items: center; background: var(--accent-soft); color: #6654d8; }
.interview-list { margin: 19px 0 17px; display: grid; }
.interview-item { min-width: 0; padding: 11px 0; display: flex; align-items: center; gap: 11px; border-bottom: 1px solid var(--line); }
.date-block { width: 38px; height: 42px; flex: 0 0 38px; border-radius: 7px; display: grid; place-content: center; background: var(--accent-soft); text-align: center; text-decoration: none; }
.date-block strong { color: var(--ink); font-size: 15px; line-height: 1; }
.date-block small { margin-top: 2px; color: var(--muted); font-size: 10px; text-transform: uppercase; }
.interview-item > div { min-width: 0; flex: 1; display: grid; gap: 3px; }
.interview-item > div strong { overflow: hidden; color: var(--ink); font-size: 13px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.interview-item > div span { overflow: hidden; color: var(--muted); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.calendar-button { width: 100%; min-height: 37px; border: 1px solid var(--line); border-radius: 7px; display: flex; align-items: center; justify-content: center; gap: 8px; background: var(--surface-raised); color: var(--ink-soft); font-size: 12px; font-weight: 500; cursor: pointer; transition: background 180ms ease, border-color 180ms ease; }
.calendar-button:hover { border-color: var(--line-strong); background: var(--accent-soft); color: var(--accent-dark); }

/* Action-first dashboard: data is organized by the next decision, not by visual weight. */
.mobile-workspace-nav { display: none; }
.dashboard-content { width: min(100%, 1480px); padding: 20px clamp(24px, 3vw, 48px) 64px; }
.welcome-row { align-items: flex-end; margin-bottom: 20px; }
.section-kicker, .panel-kicker { color: var(--accent-dark) !important; }
.section-kicker { margin-bottom: 9px !important; font-size: 12px !important; text-transform: uppercase; letter-spacing: .09em !important; }
.welcome-row h2 { max-width: none; margin-bottom: 7px; font-size: clamp(31px, 3.3vw, 44px); font-weight: 600; letter-spacing: -.05em; }
.welcome-row > div > p:last-child { max-width: 62ch; color: var(--ink-soft); font-size: 17px; }
.welcome-row > div > p:last-child strong { color: var(--ink); font-weight: 600; }
.primary-button { min-height: 42px; border-radius: 6px; box-shadow: none; }
.secondary-action { min-height: 40px; padding: 0 13px; border: 1px solid var(--line-strong); border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: transparent; color: var(--ink); font-size: 13px; font-weight: 600; cursor: pointer; transition: border-color 180ms ease, background 180ms ease, transform 180ms ease; }
.secondary-action:hover { border-color: var(--ink-soft); background: var(--surface-raised); }
.text-button { color: var(--ink-soft); }
.text-button:hover { color: var(--ink); }

.summary-strip { margin-bottom: 22px; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); background: transparent; }
.summary-item { min-width: 0; padding: 15px 22px 16px; display: grid; grid-template-columns: auto auto 1fr; align-items: baseline; column-gap: 9px; }
.summary-item + .summary-item { border-left: 1px solid var(--line); }
.summary-item > span { grid-column: 1 / -1; margin-bottom: 4px; color: var(--muted); font-size: 12px; font-weight: 500; }
.summary-item strong { color: var(--ink); font-size: 25px; font-weight: 600; line-height: 1; letter-spacing: -.045em; font-variant-numeric: tabular-nums; }
.summary-item small { min-width: 0; overflow: hidden; color: var(--ink-soft); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.summary-item small.positive { color: #267554; font-weight: 600; }
.summary-item small.urgent { color: #b45c67; font-weight: 600; }

.snapshot-grid { margin-bottom: 22px; display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1.35fr); gap: 22px; align-items: stretch; }
.snapshot-panel { min-width: 0; padding: 24px 26px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface-raised); box-shadow: 0 8px 25px rgb(25 35 60 / 4%); }
.pulse-metrics { margin-top: 24px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.pulse-metrics > div { min-width: 0; padding-right: 14px; border-right: 1px solid var(--line); display: grid; gap: 5px; }
.pulse-metrics > div:last-child { border-right: 0; padding-right: 0; }
.pulse-metrics strong { color: var(--ink); font-size: 25px; font-weight: 600; line-height: 1; letter-spacing: -.045em; font-variant-numeric: tabular-nums; }
.pulse-metrics span { color: var(--muted); font-size: 11px; line-height: 1.35; }
.snapshot-note { margin: 23px 0 0; padding-top: 14px; border-top: 1px solid var(--line); color: var(--ink-soft); font-size: 12px; line-height: 1.5; }
.snapshot-note strong { color: var(--ink); font-weight: 600; }
.reach-panel .panel-heading { align-items: center; }
.role-reach-list { margin-top: 20px; display: grid; gap: 17px; }
.role-reach-item { min-width: 0; display: grid; gap: 8px; }
.role-reach-copy { min-width: 0; display: flex; align-items: baseline; justify-content: space-between; gap: 16px; }
.role-reach-copy strong { overflow: hidden; color: var(--ink); font-size: 13px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.role-reach-copy span { flex: 0 0 auto; color: var(--muted); font-size: 11px; white-space: nowrap; }
.role-reach-track { height: 6px; overflow: hidden; border-radius: 99px; background: var(--surface); }
.role-reach-track span { display: block; height: 100%; border-radius: inherit; background: var(--accent); transition: width 220ms ease; }
.snapshot-empty { min-height: 125px; display: grid; align-content: center; gap: 5px; color: var(--muted); font-size: 12px; }
.snapshot-empty strong { color: var(--ink); font-size: 14px; font-weight: 600; }

.attention-panel { margin-bottom: 22px; padding: 24px 26px 8px; border: 1px solid var(--line); border-left: 3px solid var(--accent); border-radius: 8px; background: var(--surface-raised); box-shadow: 0 8px 25px rgb(25 35 60 / 4%); }
.attention-heading { display: flex; align-items: center; justify-content: space-between; gap: 18px; margin-bottom: 16px; }
.attention-heading h3, .pipeline-panel h3, .role-watch-panel h3 { margin: 0 0 5px; color: var(--ink); font-size: 20px; font-weight: 600; letter-spacing: -.025em; }
.attention-heading p:not(.panel-kicker) { margin: 0; color: var(--muted); font-size: 14px; }
.attention-table { width: 100%; }
.attention-row { min-height: 65px; display: grid; grid-template-columns: 80px minmax(170px, 1.15fr) minmax(145px, .9fr) 62px auto; align-items: center; gap: 18px; border-top: 1px solid var(--line); }
.attention-head { min-height: 33px; border: 0; color: var(--muted); font-size: 11px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; }
.priority { width: fit-content; padding: 3px 6px; border-radius: 3px; font-size: 11px; font-weight: 600; }
.priority-high { background: #fff0f0; color: #ae444f; }
.priority-medium { background: var(--accent-soft); color: var(--accent-dark); }
.attention-subject { min-width: 0; display: grid; gap: 2px; }
.attention-subject strong { overflow: hidden; color: var(--ink); font-size: 14px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.attention-subject small { overflow: hidden; color: var(--muted); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.attention-issue { color: var(--ink-soft); font-size: 13px; line-height: 1.35; }
.queue-age { color: var(--muted); font-size: 12px; font-variant-numeric: tabular-nums; }
.queue-action { border: 0; display: inline-flex; align-items: center; justify-content: flex-end; gap: 3px; background: transparent; color: var(--ink-soft); font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap; }
.queue-action-urgent { color: var(--accent-dark); }
.queue-action .ui-icon { transition: transform 180ms ease; }
.queue-action:hover .ui-icon { transform: translateX(2px); }
.queue-empty { min-height: 118px; border-top: 1px solid var(--line); display: grid; place-content: center; justify-items: start; gap: 4px; color: var(--muted); font-size: 13px; }
.queue-empty strong { color: var(--ink); font-size: 14px; font-weight: 600; }

.operations-grid { margin-bottom: 22px; display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(300px, .8fr); gap: 22px; align-items: stretch; }
.pipeline-panel, .role-watch-panel { min-width: 0; padding: 25px 26px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface-raised); box-shadow: 0 8px 25px rgb(25 35 60 / 4%); }
.pipeline-stages { margin-top: 24px; display: grid; gap: 0; }
.pipeline-stage { width: 100%; min-height: 61px; padding: 0; border: 0; border-top: 1px solid var(--line); display: grid; grid-template-columns: minmax(145px, .9fr) 38px minmax(125px, 1fr) 16px; align-items: center; gap: 13px; background: transparent; color: inherit; text-align: left; cursor: pointer; transition: background 180ms ease, transform 180ms ease; }
.pipeline-stage:first-child { border-top: 0; }
.pipeline-stage:hover { background: var(--surface); }
.stage-copy { min-width: 0; display: grid; gap: 3px; }
.stage-copy span { color: var(--ink); font-size: 13px; font-weight: 600; }
.stage-copy small { overflow: hidden; color: var(--muted); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.pipeline-stage > strong { color: var(--ink); font-size: 16px; font-weight: 600; font-variant-numeric: tabular-nums; text-align: right; }
.stage-detail { color: var(--muted); font-size: 12px; }
.pipeline-stage > .ui-icon { color: var(--muted); transition: transform 180ms ease, color 180ms ease; }
.pipeline-stage:hover > .ui-icon { color: var(--accent-dark); transform: translateX(2px); }
.pipeline-insight { margin: 20px 0 0; padding: 13px 0 0; border-top: 1px solid var(--line); color: var(--ink-soft); font-size: 13px; line-height: 1.5; }
.pipeline-insight strong { color: var(--ink); font-weight: 600; }

.role-watch-panel { display: flex; flex-direction: column; }
.role-watch-list { margin-top: 18px; display: grid; }
.role-watch-item { min-height: 84px; padding: 14px 0; display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: start; column-gap: 12px; border-top: 1px solid var(--line); }
.role-watch-item > div { min-width: 0; display: grid; gap: 3px; }
.role-watch-item strong { overflow: hidden; color: var(--ink); font-size: 13px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.role-watch-item span { color: var(--ink-soft); font-size: 11px; }
.role-watch-item small { color: var(--muted); font-size: 11px; }
.role-watch-item b { color: var(--ink); font-size: 18px; font-weight: 600; font-variant-numeric: tabular-nums; }
.role-watch-item button { grid-column: 1 / -1; width: fit-content; margin-top: 8px; padding: 0; border: 0; display: inline-flex; align-items: center; gap: 2px; background: transparent; color: var(--accent-dark); font-size: 11px; font-weight: 600; cursor: pointer; }
.role-watch-item button:hover { text-decoration: underline; }
.role-empty { min-height: 222px; margin-top: 18px; padding-top: 20px; border-top: 1px solid var(--line); display: flex; flex-direction: column; align-items: flex-start; justify-content: center; }
.role-empty strong { color: var(--ink); font-size: 15px; font-weight: 600; }
.role-empty p { margin: 7px 0 16px; color: var(--muted); font-size: 13px; line-height: 1.55; }
.role-empty button { padding: 0; border: 0; display: inline-flex; align-items: center; gap: 5px; background: transparent; color: var(--accent-dark); font-size: 12px; font-weight: 600; cursor: pointer; }
.role-empty button:hover { text-decoration: underline; }

.table-panel { padding: 25px 26px 10px; border-radius: 8px; box-shadow: 0 8px 25px rgb(25 35 60 / 4%); }
.row-action { padding: 0; }

:global(.company-shell.theme-dark .company-page) { color: var(--ink); }
:global(.company-shell.theme-dark .jobs-overview), :global(.company-shell.theme-dark .jobs-workspace), :global(.company-shell.theme-dark .job-composer), :global(.company-shell.theme-dark .candidate-directory), :global(.company-shell.theme-dark .candidate-modal), :global(.company-shell.theme-dark .profile-overview), :global(.company-shell.theme-dark .profile-card), :global(.company-shell.theme-dark .missing-profile) { border-color: var(--line); background: var(--surface-raised); color: var(--ink); }
:global(.company-shell.theme-dark .company-secondary), :global(.company-shell.theme-dark .close-composer), :global(.company-shell.theme-dark .modal-toolbar button) { border-color: var(--line); background: var(--surface); color: var(--ink-soft); }
:global(.company-shell.theme-dark .jobs-table th), :global(.company-shell.theme-dark .table-heading), :global(.company-shell.theme-dark .modal-actions) { border-color: var(--line); background: var(--surface); color: var(--muted); }
:global(.company-shell.theme-dark .jobs-table td), :global(.company-shell.theme-dark .candidate-table li + li), :global(.company-shell.theme-dark .modal-toolbar), :global(.company-shell.theme-dark .candidate-facts), :global(.company-shell.theme-dark .profile-main section + section), :global(.company-shell.theme-dark .profile-aside), :global(.company-shell.theme-dark .experience-item), :global(.company-shell.theme-dark .application-grid) { border-color: var(--line); }
:global(.company-shell.theme-dark .candidate-row), :global(.company-shell.theme-dark .candidate-table ul) { background: var(--surface-raised); }
:global(.company-shell.theme-dark .candidate-row:hover), :global(.company-shell.theme-dark .applicant-filters button:hover) { background: var(--surface); }
:global(.company-shell.theme-dark .applicant-filters button.active), :global(.company-shell.theme-dark .applicant-filters button span), :global(.company-shell.theme-dark .jobs-tabs button span) { border-color: var(--line-strong); background: var(--accent-soft); color: var(--accent-dark); }
:global(.company-shell.theme-dark .job-form input), :global(.company-shell.theme-dark .job-form select), :global(.company-shell.theme-dark .stage-control select) { border-color: var(--line-strong); background: var(--surface); color: var(--ink); }
:global(.company-shell.theme-dark .candidate-name strong), :global(.company-shell.theme-dark .role-cell strong), :global(.company-shell.theme-dark .identity-main h3), :global(.company-shell.theme-dark .name-line h1), :global(.company-shell.theme-dark .profile-main h4), :global(.company-shell.theme-dark .profile-aside h4), :global(.company-shell.theme-dark .modal-toolbar span), :global(.company-shell.theme-dark .candidate-facts dd), :global(.company-shell.theme-dark .profile-summary dd), :global(.company-shell.theme-dark .experience-heading h3), :global(.company-shell.theme-dark .resume-row strong), :global(.company-shell.theme-dark .application-grid dd), :global(.company-shell.theme-dark .preference-card dd) { color: var(--ink); }
:global(.company-shell.theme-dark .candidate-name small), :global(.company-shell.theme-dark .role-cell small), :global(.company-shell.theme-dark .location-cell), :global(.company-shell.theme-dark .applied-cell), :global(.company-shell.theme-dark .identity-main p), :global(.company-shell.theme-dark .identity-copy > p), :global(.company-shell.theme-dark .profile-main p), :global(.company-shell.theme-dark .experience-heading p), :global(.company-shell.theme-dark .modal-toolbar small) { color: var(--ink-soft); }
:global(.company-shell.theme-dark .profile-summary), :global(.company-shell.theme-dark .experience-heading time), :global(.company-shell.theme-dark .modal-actions) { background: var(--surface); }
:global(.company-shell.theme-dark .status-new) { border-color: #4d79a3; background: #26374b; color: #b9d6ff; }
:global(.company-shell.theme-dark .status-under-review) { border-color: #587095; background: #2a3244; color: #c0cde8; }
:global(.company-shell.theme-dark .status-interview) { border-color: #4f8d7f; background: #233c3a; color: #a8e0d2; }
:global(.company-shell.theme-dark .status-shortlisted) { border-color: #7568af; background: #312b4f; color: #d0c6ff; }
:global(.company-shell.theme-dark .status-offer-sent) { border-color: #8b7549; background: #403827; color: #f2d394; }
:global(.company-shell.theme-dark .status-hired) { border-color: #588d6b; background: #243b2f; color: #b2e0bf; }
:global(.company-shell.theme-dark .status-rejected) { border-color: #9c626e; background: #402d35; color: #f0bac4; }
:global(.company-shell.theme-dark .status-withdrawn) { border-color: #596477; background: #2b3140; color: #c5cada; }

.mobile-menu-button, .mobile-close, .sidebar-backdrop { display: none; }
.sidebar-is-collapsed .company-sidebar { width: 82px; flex-basis: 82px; padding-inline: 12px; }
.sidebar-is-collapsed .sidebar-brand { min-height: 78px; flex-direction: column; justify-content: flex-start; gap: 8px; padding: 0 0 16px; }
.sidebar-is-collapsed .sidebar-label, .sidebar-is-collapsed .sidebar-link > span, .sidebar-is-collapsed .profile-copy, .sidebar-is-collapsed .sidebar-profile > .ui-icon { display: none; }
.sidebar-is-collapsed .sidebar-link, .sidebar-is-collapsed .sidebar-profile { justify-content: center; padding-inline: 0; }
.sidebar-is-collapsed .profile-menu { left: calc(var(--sidebar-width) + 10px); bottom: 18px; width: 208px; }

@media (max-width: 1180px) {
  .company-shell { --sidebar-width: 214px; }
  .sidebar-is-collapsed.company-shell { --sidebar-width: 82px; }
  .company-sidebar { width: var(--sidebar-width); flex-basis: var(--sidebar-width); }
  .overview-grid, .bottom-grid { grid-template-columns: 1fr; }
  .operations-grid { grid-template-columns: 1fr; }
  .snapshot-grid { grid-template-columns: 1fr; }
  .role-watch-list { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
  .role-watch-item { min-height: 105px; padding-top: 0; border-top: 0; }
  .role-watch-item + .role-watch-item { border-left: 1px solid var(--line); padding-left: 18px; }
}

@media (max-width: 900px) {
  .stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .stat-card:nth-child(3) { border-left: 0; border-top: 1px solid var(--line); }
  .stat-card:nth-child(4) { border-top: 1px solid var(--line); }
}

@media (max-width: 760px) {
  .company-shell, .sidebar-is-collapsed.company-shell { display: block; }
  .company-sidebar, .sidebar-is-collapsed .company-sidebar { position: fixed; inset: 0 auto 0 0; z-index: 50; width: min(84vw, 310px); height: 100dvh; min-height: 0; padding: 22px 16px; box-shadow: 18px 0 50px rgb(0 0 0 / 20%); transform: translateX(-105%); }
  .company-sidebar.open { transform: translateX(0); }
  .company-sidebar .sidebar-brand, .sidebar-is-collapsed .sidebar-brand { justify-content: space-between; flex-direction: row; padding: 0 7px 22px; }
  .sidebar-is-collapsed .company-sidebar .mobile-close { transform: none; }
  .sidebar-dock-button { display: none; }
  .profile-menu, .sidebar-is-collapsed .profile-menu { right: 16px; bottom: 16px; left: 16px; width: auto; }
  .company-sidebar .sidebar-label, .company-sidebar .sidebar-link > span, .company-sidebar .profile-copy, .company-sidebar .sidebar-profile > .ui-icon { display: initial; }
  .company-sidebar .sidebar-link, .company-sidebar .sidebar-profile { justify-content: flex-start; padding-inline: 12px; }
  .company-sidebar .nav-count, .company-sidebar .sidebar-profile > .ui-icon { margin-left: auto; }
  .desktop-collapse { display: none; }
  .mobile-close, .mobile-menu-button { display: grid; place-items: center; }
  .mobile-close { position: static; transform: none; }
  .mobile-menu-button { width: 41px; height: 41px; flex: 0 0 41px; border-radius: 8px; }
  .sidebar-backdrop { position: fixed; inset: 0; z-index: 40; display: block; border: 0; background: rgb(0 0 0 / 42%); backdrop-filter: blur(2px); }
  .dashboard-header { min-height: 76px; padding: 14px 18px; display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 12px; }
  .dashboard-header .eyebrow { display: none; }
  .dashboard-header h1 { font-size: 21px; }
  .header-search { width: 41px; padding: 0; justify-content: center; }
  .header-search input, .header-search kbd { display: none; }
  .mobile-workspace-nav { position: sticky; top: 76px; z-index: 29; min-height: 49px; padding: 0 12px; display: flex; align-items: stretch; gap: 3px; overflow-x: auto; border-bottom: 1px solid var(--line); background: var(--canvas); backdrop-filter: blur(16px); scrollbar-width: none; }
  .mobile-workspace-nav::-webkit-scrollbar { display: none; }
  .mobile-workspace-nav button { position: relative; min-width: max-content; padding: 0 10px; border: 0; display: inline-flex; align-items: center; gap: 6px; background: transparent; color: var(--muted); font-size: 12px; font-weight: 500; cursor: pointer; }
  .mobile-workspace-nav button.selected { color: var(--accent-dark); font-weight: 600; }
  .mobile-workspace-nav button.selected::after { position: absolute; right: 10px; bottom: 0; left: 10px; height: 2px; background: var(--accent); content: ''; }
  .mobile-workspace-nav em { min-width: 17px; padding: 1px 4px; border-radius: 3px; background: var(--accent-soft); color: var(--accent-dark); font-size: 10px; font-style: normal; }
  .dashboard-content { padding: 22px 18px 48px; }
  .welcome-row { align-items: center; }
  .welcome-row h2 { font-size: clamp(27px, 7vw, 36px); }
  .panel { padding: 21px 18px; }
  .bar-chart { height: 205px; }
  .attention-panel, .pipeline-panel, .role-watch-panel, .table-panel { padding-right: 18px; padding-left: 18px; }
  .snapshot-panel { padding-right: 18px; padding-left: 18px; }
  .attention-panel { margin-bottom: 18px; }
  .operations-grid { gap: 18px; margin-bottom: 18px; }
  .role-watch-list { grid-template-columns: 1fr; gap: 0; }
  .role-watch-item { min-height: 76px; padding: 12px 0; border-top: 1px solid var(--line); }
  .role-watch-item + .role-watch-item { padding-left: 0; border-left: 0; }
}

@media (max-width: 620px) {
  .dashboard-header { grid-template-columns: auto minmax(0, 1fr); }
  .header-actions { grid-column: 1 / -1; width: 100%; }
  .header-search { width: auto; flex: 1; justify-content: flex-start; padding: 0 12px; }
  .header-search input { display: block; }
  .welcome-row { align-items: stretch; flex-direction: column; gap: 22px; }
  .primary-button { width: 100%; }
  .summary-strip { margin-right: -18px; margin-left: -18px; display: flex; overflow-x: auto; overscroll-behavior-x: contain; scrollbar-width: none; }
  .summary-strip::-webkit-scrollbar { display: none; }
  .summary-item { min-width: 190px; flex: 0 0 190px; padding: 14px 18px 15px; }
  .pulse-metrics { gap: 10px; }
  .pulse-metrics > div { padding-right: 9px; }
  .role-reach-copy { align-items: flex-start; flex-direction: column; gap: 4px; }
  .attention-heading { align-items: flex-start; flex-direction: column; gap: 12px; }
  .attention-heading .text-button { padding-left: 0; }
  .attention-head { display: none; }
  .attention-row:not(.attention-head) { min-height: 0; padding: 14px 0; grid-template-columns: minmax(0, 1fr) auto; gap: 8px 12px; }
  .attention-row .priority { grid-column: 1; grid-row: 1; }
  .attention-row .queue-action { grid-column: 2; grid-row: 1; }
  .attention-subject { grid-column: 1 / -1; grid-row: 2; }
  .attention-issue { grid-column: 1; grid-row: 3; }
  .queue-age { grid-column: 2; grid-row: 3; }
  .pipeline-panel h3, .role-watch-panel h3, .attention-heading h3 { font-size: 19px; }
  .pipeline-stage { min-height: 83px; grid-template-columns: minmax(0, 1fr) auto; gap: 7px 12px; padding: 11px 0; }
  .stage-copy { grid-column: 1; grid-row: 1; }
  .pipeline-stage > strong { grid-column: 2; grid-row: 1; }
  .stage-detail { grid-column: 1; grid-row: 2; }
  .pipeline-stage > .ui-icon { grid-column: 2; grid-row: 2; }
  .panel-heading { align-items: flex-start; }
  .chart-key { flex-wrap: wrap; }
  .chart-key strong { width: 100%; margin-left: 0; }
  .chart-key strong small { display: inline; margin-left: 4px; }
  .funnel-wrap { grid-template-columns: 1fr; }
  .funnel-side { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .data-table .table-head { display: none; }
  .data-table .table-row:not(.table-head) { min-height: 0; margin-top: 9px; padding: 14px; border: 1px solid var(--line); border-radius: 7px; background: var(--surface); }
  .applicants-table .table-row:not(.table-head) { grid-template-columns: 1fr auto; gap: 13px 10px; }
  .applicants-table .candidate-cell { grid-column: 1 / -1; padding-right: 35px; }
  .applicants-table .muted-cell, .applicants-table .status-cell { grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
  .applicants-table .row-dots { position: absolute; top: 13px; right: 11px; }
  .applicants-table .row-action { position: static; grid-column: 1 / -1; justify-content: flex-start; }
  .compact-table .table-row:not(.table-head) { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px 8px; }
  .compact-table .job-title-cell { grid-column: 1 / -1; }
  .compact-table .muted-cell, .compact-table .status-cell { display: grid; gap: 6px; }
  [data-label]::before { color: #7b87a8; font-size: 11px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; content: attr(data-label); }
}

@media (max-width: 430px) {
  .stats-grid { grid-template-columns: 1fr; }
  .stat-card + .stat-card { border-top: 1px solid var(--line); border-left: 0; }
  .notification-popover { position: fixed; top: 125px; right: 16px; left: 16px; width: auto; }
  .header-profile-menu { position: fixed; top: 125px; right: 16px; width: 180px; }
  .panel-heading { flex-wrap: wrap; }
  .table-heading .text-button { margin-left: auto; }
  .chart-column { font-size: 10px; }
  .funnel-side { grid-template-columns: 1fr; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; animation-duration: .01ms !important; }
}
</style>
