<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import BrandLogo from '@/components/landing/BrandLogo.vue'
import UiIcon from '@/components/company/UiIcon.vue'
import { clearAuthSession, displayNameForUser, getAuthSession, initialsForUser } from '@/services/auth'

type Status = 'Published' | 'Draft' | 'Closed'

const activeNav = ref('Dashboard')
const search = ref('')
const searchInput = ref<HTMLInputElement | null>(null)
const selectedRange = ref('Last 30 days')
const selectedJobTab = ref<'All jobs' | Status>('All jobs')
const showNotifications = ref(false)
const notificationsRead = ref(false)
const showSidebarProfileMenu = ref(false)
const showHeaderProfileMenu = ref(false)
const sidebarCollapsed = ref(false)
const mobileMenuOpen = ref(false)
const router = useRouter()
const currentUser = getAuthSession()?.user
const displayName = computed(() => currentUser ? displayNameForUser(currentUser) : 'Company account')
const initials = computed(() => currentUser ? initialsForUser(currentUser) : 'CO')

function signOut() {
  clearAuthSession()
  void router.replace({ name: 'AuthPage' })
}

const navigation = [
  { label: 'Dashboard', icon: 'grid' },
  { label: 'Jobs', icon: 'briefcase', count: '12' },
  { label: 'Applicants', icon: 'users', count: '28' },
  { label: 'Company profile', icon: 'building' },
  { label: 'Analytics', icon: 'chart' },
]

const stats = [
  { label: 'Active jobs', value: '12', change: '8.4%', note: 'from last month', icon: 'briefcase' },
  { label: 'Applicants', value: '246', change: '12.6%', note: 'from last month', icon: 'users' },
  { label: 'Shortlisted', value: '38', change: '4.8%', note: 'from last month', icon: 'chart' },
  { label: 'Hires', value: '9', change: '20.0%', note: 'from last month', icon: 'building' },
]

const applicants = [
  { initials: 'AW', name: 'Ava Williams', role: 'Senior Product Designer', job: 'Product Designer', date: 'Today, 09:42 AM', status: 'Shortlisted', color: 'coral' },
  { initials: 'JM', name: 'James Miller', role: 'Frontend Developer', job: 'Frontend Developer', date: 'Today, 08:15 AM', status: 'Under review', color: 'blue' },
  { initials: 'SL', name: 'Sophia Lee', role: 'Marketing Specialist', job: 'Marketing Specialist', date: 'Yesterday, 04:28 PM', status: 'New', color: 'purple' },
  { initials: 'DK', name: 'Daniel Kim', role: 'Product Manager', job: 'Product Manager', date: 'Yesterday, 01:10 PM', status: 'Interview', color: 'orange' },
]

const jobs = [
  { title: 'Senior Product Designer', applicants: 48, views: '1,284', status: 'Published' as Status },
  { title: 'Frontend Developer', applicants: 36, views: '946', status: 'Published' as Status },
  { title: 'Marketing Specialist', applicants: 22, views: '734', status: 'Published' as Status },
  { title: 'Product Manager', applicants: 18, views: '512', status: 'Draft' as Status },
]

const chartData = [
  { label: 'Aug 12', applications: 72, shortlisted: 28 },
  { label: 'Aug 18', applications: 48, shortlisted: 22 },
  { label: 'Aug 24', applications: 61, shortlisted: 34 },
  { label: 'Aug 30', applications: 81, shortlisted: 39 },
  { label: 'Sep 05', applications: 66, shortlisted: 31 },
  { label: 'Sep 10', applications: 76, shortlisted: 36 },
]

const filteredJobs = computed(() => jobs.filter((job) => {
  const matchesTab = selectedJobTab.value === 'All jobs' || job.status === selectedJobTab.value
  const matchesSearch = `${job.title} ${job.status}`.toLowerCase().includes(search.value.toLowerCase())
  return matchesTab && matchesSearch
}))

const filteredApplicants = computed(() => applicants.filter((applicant) =>
  `${applicant.name} ${applicant.role} ${applicant.status}`.toLowerCase().includes(search.value.toLowerCase()),
))

function selectNav(label: string) {
  activeNav.value = label
  mobileMenuOpen.value = false
}

function openNotifications() {
  showNotifications.value = !showNotifications.value
  showSidebarProfileMenu.value = false
  showHeaderProfileMenu.value = false
}

function openSidebarProfileMenu() {
  showSidebarProfileMenu.value = !showSidebarProfileMenu.value
  showHeaderProfileMenu.value = false
  showNotifications.value = false
}

function openHeaderProfileMenu() {
  showHeaderProfileMenu.value = !showHeaderProfileMenu.value
  showSidebarProfileMenu.value = false
  showNotifications.value = false
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
    showHeaderProfileMenu.value = false
    mobileMenuOpen.value = false
  }
}

onMounted(() => window.addEventListener('keydown', handleShortcut))
onBeforeUnmount(() => window.removeEventListener('keydown', handleShortcut))
</script>

<template>
  <div class="company-shell" :class="{ 'sidebar-is-collapsed': sidebarCollapsed }">
    <a class="skip-link" href="#dashboard-content">Skip to dashboard content</a>

    <button v-if="mobileMenuOpen" type="button" class="sidebar-backdrop" aria-label="Close navigation" @click="mobileMenuOpen = false" />

    <aside id="company-navigation" class="company-sidebar" :class="{ open: mobileMenuOpen }">
      <div class="sidebar-brand">
        <BrandLogo variant="dark" />
        <button type="button" class="collapse-button desktop-collapse" :aria-label="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'" @click="sidebarCollapsed = !sidebarCollapsed">
          <UiIcon name="chevron" :size="16" />
        </button>
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
        <button type="button" class="sidebar-link" :class="{ selected: activeNav === 'Settings' }" @click="selectNav('Settings')"><UiIcon name="settings" :size="19" /><span>Settings</span></button>
        <button type="button" class="sidebar-link" :class="{ selected: activeNav === 'Support' }" @click="selectNav('Support')"><UiIcon name="help" :size="19" /><span>Help &amp; support</span></button>

        <div class="profile-wrap">
          <button type="button" class="sidebar-profile" :aria-expanded="showSidebarProfileMenu" aria-controls="sidebar-profile-menu" @click="openSidebarProfileMenu">
            <span class="avatar avatar-small avatar-emma">{{ initials }}</span>
            <span class="profile-copy"><strong>{{ displayName }}</strong><small>Company account</small></span>
            <UiIcon name="chevron" :size="16" />
          </button>
          <div v-if="showSidebarProfileMenu" id="sidebar-profile-menu" class="profile-menu"><button type="button">View profile</button><button type="button" @click="signOut">Sign out</button></div>
        </div>
      </div>
    </aside>

    <main id="dashboard-content" class="dashboard-main">
      <header class="dashboard-header">
        <button type="button" class="mobile-menu-button" aria-label="Open navigation" aria-controls="company-navigation" :aria-expanded="mobileMenuOpen" @click="mobileMenuOpen = true"><UiIcon name="menu" :size="21" /></button>
        <div class="header-copy"><p class="eyebrow">Good morning, {{ displayName }}</p><h1>Hiring overview</h1></div>
        <div class="header-actions">
          <label class="header-search"><UiIcon name="search" :size="18" /><input ref="searchInput" v-model="search" type="search" placeholder="Search candidates or roles" aria-label="Search jobs and applicants" /><kbd>⌘K</kbd></label>
          <div class="notification-wrap">
            <button type="button" class="icon-button" aria-label="Notifications" :aria-expanded="showNotifications" @click="openNotifications"><UiIcon name="bell" :size="19" /><span v-if="!notificationsRead" class="notification-dot" /></button>
            <div v-if="showNotifications" class="notification-popover"><div class="popover-heading"><strong>Notifications</strong><button type="button" @click="markNotificationsRead">Mark as read</button></div><p><span class="notice-dot accent-dot" /> Four applications need review.</p><p><span class="notice-dot green-dot" /> The Product Designer role is live.</p></div>
          </div>
        </div>
      </header>

      <div class="dashboard-content">
        <section class="welcome-row" aria-labelledby="dashboard-summary-title">
          <div><p class="section-kicker">Thursday, 10 September</p><h2 id="dashboard-summary-title">Your hiring pipeline at a glance.</h2><p>Review the candidates and roles that need attention today.</p></div>
          <button type="button" class="primary-button" @click="selectNav('Jobs')"><UiIcon name="plus" :size="18" /> Post a job</button>
        </section>

        <section class="stats-grid" aria-label="Company statistics">
          <article v-for="stat in stats" :key="stat.label" class="stat-card">
            <div class="stat-heading"><span class="stat-icon"><UiIcon :name="stat.icon" :size="18" /></span><p>{{ stat.label }}</p></div>
            <div class="stat-number-row"><strong>{{ stat.value }}</strong><span class="trend"><UiIcon name="arrow-up" :size="13" />{{ stat.change }}</span></div>
            <small>{{ stat.note }}</small>
          </article>
        </section>

        <section class="overview-grid" aria-label="Hiring analytics">
          <article class="panel applications-panel">
            <div class="panel-heading"><div><p class="panel-kicker">Volume</p><h3>Applications overview</h3><p>Applications and shortlist decisions over time.</p></div><select v-model="selectedRange" class="select-control" aria-label="Select reporting range"><option>Last 30 days</option><option>Last 90 days</option><option>This year</option></select></div>
            <div class="chart-key"><span><i class="key-swatch accent-swatch" />Applications</span><span><i class="key-swatch light-swatch" />Shortlisted</span><strong>246 <small>total applications</small></strong></div>
            <div class="bar-chart" role="img" aria-label="Applications and shortlisted candidates over the last 30 days">
              <div class="y-axis"><span>60</span><span>45</span><span>30</span><span>15</span><span>0</span></div>
              <div class="chart-plot"><div class="grid-line line-1" /><div class="grid-line line-2" /><div class="grid-line line-3" /><div class="grid-line line-4" /><div v-for="bar in chartData" :key="bar.label" class="chart-column"><div class="bar-group"><i class="bar-main" :style="{ height: `${bar.applications}%` }" /><i class="bar-secondary" :style="{ height: `${bar.shortlisted}%` }" /></div><span>{{ bar.label }}</span></div></div>
            </div>
          </article>

          <article class="panel activity-panel">
            <div class="panel-heading"><div><p class="panel-kicker">Conversion</p><h3>Hiring activity</h3><p>Candidate progress this month.</p></div><button type="button" class="ghost-icon-button" aria-label="More hiring activity options"><UiIcon name="dots" :size="18" /></button></div>
            <div class="funnel-wrap">
              <div class="funnel-visual"><div class="funnel-segment funnel-dark">246 <small>Applicants</small></div><div class="funnel-segment funnel-mid">84 <small>Reviewed</small></div><div class="funnel-segment funnel-light">38 <small>Shortlisted</small></div><div class="funnel-segment funnel-accent">9 <small>Hired</small></div></div>
              <div class="funnel-side"><div><span class="funnel-dot dark-dot" /><span>Applications</span><strong>100%</strong></div><div><span class="funnel-dot mid-dot" /><span>Reviewed</span><strong>34.1%</strong></div><div><span class="funnel-dot light-dot" /><span>Shortlisted</span><strong>15.4%</strong></div><div><span class="funnel-dot accent-dot" /><span>Hired</span><strong>3.6%</strong></div></div>
            </div>
            <div class="activity-footer"><span class="positive-chip"><UiIcon name="arrow-up" :size="13" /> 6.2%</span> conversion from last month</div>
          </article>
        </section>

        <section class="panel table-panel applicants-panel-table" aria-labelledby="recent-applicants-title">
          <div class="panel-heading table-heading"><div><p class="panel-kicker">Pipeline</p><h3 id="recent-applicants-title">Recent applicants</h3><p>The latest candidates across your open roles.</p></div><button type="button" class="text-button" @click="selectNav('Applicants')">View all <UiIcon name="chevron" :size="15" /></button></div>
          <div class="data-table applicants-table">
            <div class="table-row table-head"><span>Candidate</span><span>Applied for</span><span>Applied on</span><span>Status</span><span /></div>
            <div v-for="applicant in filteredApplicants" :key="applicant.name" class="table-row"><div class="candidate-cell"><span class="avatar" :class="`avatar-${applicant.color}`">{{ applicant.initials }}</span><span><strong>{{ applicant.name }}</strong><small>{{ applicant.role }}</small></span></div><span class="muted-cell" data-label="Applied for">{{ applicant.job }}</span><span class="muted-cell" data-label="Applied on">{{ applicant.date }}</span><span class="status-cell" data-label="Status"><span class="status-pill" :class="`status-${applicant.status.toLowerCase().replace(' ', '-')}`">{{ applicant.status }}</span></span><button type="button" class="row-dots" :aria-label="`Actions for ${applicant.name}`"><UiIcon name="dots" :size="17" /></button></div>
            <div v-if="!filteredApplicants.length" class="empty-state"><UiIcon name="search" :size="22" /><strong>No applicants found</strong><span>Try a different name, role, or status.</span></div>
          </div>
        </section>

        <section class="bottom-grid">
          <article class="panel jobs-panel">
            <div class="panel-heading table-heading"><div><p class="panel-kicker">Open roles</p><h3>Job performance</h3><p>See how current job posts are performing.</p></div><button type="button" class="text-button" @click="selectNav('Jobs')">Manage jobs <UiIcon name="chevron" :size="15" /></button></div>
            <div class="job-tabs" role="tablist" aria-label="Filter jobs by status"><button v-for="tab in ['All jobs', 'Published', 'Draft', 'Closed']" :key="tab" type="button" role="tab" :aria-selected="selectedJobTab === tab" :class="{ active: selectedJobTab === tab }" @click="selectedJobTab = tab as 'All jobs' | Status">{{ tab }}</button></div>
            <div class="data-table compact-table"><div class="table-row table-head"><span>Job post</span><span>Applicants</span><span>Views</span><span>Status</span></div><div v-for="job in filteredJobs" :key="job.title" class="table-row"><span class="job-title-cell"><span class="job-mark"><UiIcon name="briefcase" :size="16" /></span><strong>{{ job.title }}</strong></span><span class="muted-cell" data-label="Applicants">{{ job.applicants }}</span><span class="muted-cell" data-label="Views">{{ job.views }}</span><span class="status-cell" data-label="Status"><span class="status-pill" :class="`status-${job.status.toLowerCase()}`">{{ job.status }}</span></span></div><div v-if="!filteredJobs.length" class="empty-state"><UiIcon name="search" :size="22" /><strong>No job posts found</strong><span>Change the filter or try another search.</span></div></div>
          </article>

          <article class="panel interviews-panel">
            <div class="panel-heading"><div><p class="panel-kicker">Schedule</p><h3>Upcoming interviews</h3><p>Three conversations in the next week.</p></div><button type="button" class="ghost-icon-button" aria-label="More interview options"><UiIcon name="dots" :size="18" /></button></div>
            <div class="interview-list"><div class="interview-item"><time class="date-block" datetime="2026-09-12"><strong>12</strong><small>Sep</small></time><div><strong>Ava Williams</strong><span>Product Designer · 10:00 AM</span></div><span class="avatar avatar-coral avatar-tiny">AW</span></div><div class="interview-item"><time class="date-block" datetime="2026-09-14"><strong>14</strong><small>Sep</small></time><div><strong>Daniel Kim</strong><span>Product Manager · 02:30 PM</span></div><span class="avatar avatar-orange avatar-tiny">DK</span></div><div class="interview-item"><time class="date-block" datetime="2026-09-17"><strong>17</strong><small>Sep</small></time><div><strong>Maria Garcia</strong><span>Frontend Developer · 11:00 AM</span></div><span class="avatar avatar-purple avatar-tiny">MG</span></div></div>
            <button type="button" class="calendar-button"><UiIcon name="clock" :size="17" /> Open interview calendar <UiIcon name="chevron" :size="15" /></button>
          </article>
        </section>
      </div>
    </main>
  </div>
</template>

<style scoped>
:global(*) { box-sizing: border-box; }
:global(body:has(.company-shell)) { margin: 0; overflow-x: hidden; background: #f7f7f7; color: #171717; }
:global(button), :global(input), :global(select) { font: inherit; }

.company-shell { --ink: #171717; --ink-soft: #4f4f4f; --muted: #777; --line: #e3e3e3; --line-strong: #c9c9c9; --canvas: #f7f7f7; --surface: #fbfbfb; --surface-raised: #fff; --accent: #202020; --accent-dark: #000; min-height: 100dvh; display: flex; background-color: var(--canvas); color: var(--ink); font-family: "Outfit", "Bai Jamjuree", ui-sans-serif, system-ui, sans-serif; }
.skip-link { position: fixed; top: 10px; left: 10px; z-index: 100; padding: 10px 14px; border-radius: 6px; background: var(--ink); color: #fff; transform: translateY(-160%); transition: transform 180ms ease; }
.skip-link:focus { transform: translateY(0); }
button { color: inherit; }
button:active { transform: translateY(1px); }
button:focus-visible, select:focus-visible, input:focus-visible { outline: 3px solid rgb(0 0 0 / 22%); outline-offset: 2px; }

.company-sidebar { position: sticky; top: 0; z-index: 20; width: 236px; height: 100dvh; flex: 0 0 236px; padding: 26px 14px 18px; display: flex; flex-direction: column; overflow-y: auto; border-right: 1px solid var(--line); background: rgb(251 250 247 / 94%); backdrop-filter: blur(18px); transition: width 220ms ease, flex-basis 220ms ease, transform 220ms ease; }
.sidebar-brand { min-height: 42px; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 0 8px 24px; }
.sidebar-brand :deep(a) { gap: 9px !important; }
.sidebar-brand :deep(img:first-child) { height: 33px !important; }
.sidebar-brand :deep(img:last-child) { height: 22px !important; }
.collapse-button, .mobile-menu-button { border: 1px solid var(--line); background: var(--surface-raised); color: var(--ink-soft); display: grid; place-items: center; cursor: pointer; transition: border-color 180ms ease, color 180ms ease, background 180ms ease; }
.collapse-button { width: 30px; height: 30px; border-radius: 7px; }
.collapse-button:hover, .mobile-menu-button:hover { border-color: var(--line-strong); color: var(--ink); background: #f0f0f0; }
.sidebar-label { margin: 17px 12px 9px; color: #8a8a8a; font-size: 11px; font-weight: 600; letter-spacing: .06em; }
.sidebar-nav { display: grid; gap: 3px; }
.sidebar-link { width: 100%; min-height: 43px; border: 0; border-radius: 8px; padding: 0 12px; display: flex; align-items: center; gap: 12px; background: transparent; color: #5e665d; text-align: left; font-size: 13px; font-weight: 500; cursor: pointer; transition: color 180ms ease, background 180ms ease; }
.sidebar-link:hover { background: #efefef; color: var(--ink); }
.sidebar-link.selected { background: var(--ink); color: #fff; }
.nav-count { min-width: 23px; margin-left: auto; padding: 2px 6px; border-radius: 5px; background: #e7e7e7; color: #5f5f5f; text-align: center; font-size: 10px; font-variant-numeric: tabular-nums; }
.selected .nav-count { background: rgb(255 255 255 / 13%); color: #fff; }
.sidebar-bottom { margin-top: auto; }
.profile-wrap { position: relative; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--line); }
.sidebar-profile { width: 100%; min-height: 49px; padding: 6px 8px; border: 0; border-radius: 9px; display: flex; align-items: center; gap: 10px; background: transparent; text-align: left; cursor: pointer; transition: background 180ms ease; }
.sidebar-profile:hover { background: #efefef; }
.sidebar-profile > .ui-icon { margin-left: auto; transform: rotate(-90deg); }
.profile-copy { min-width: 0; display: grid; gap: 2px; }
.profile-copy strong { overflow: hidden; color: var(--ink); font-size: 12px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.profile-copy small { color: var(--muted); font-size: 10px; }
.profile-menu { position: absolute; right: 0; bottom: 56px; left: 0; z-index: 5; padding: 6px; border: 1px solid var(--line); border-radius: 9px; background: #fff; box-shadow: 0 18px 40px rgb(0 0 0 / 12%); }
.profile-menu button { width: 100%; padding: 9px 10px; border: 0; border-radius: 5px; background: transparent; text-align: left; font-size: 12px; cursor: pointer; }
.profile-menu button:hover { background: #f1f1f1; }

.dashboard-main { min-width: 0; flex: 1; }
.dashboard-header { min-height: 92px; padding: 20px clamp(24px, 3vw, 48px); display: flex; align-items: center; justify-content: space-between; gap: 30px; border-bottom: 1px solid var(--line); }
.eyebrow { margin: 0 0 3px; color: var(--muted); font-size: 12px; }
.dashboard-header h1 { margin: 0; color: var(--ink); font-size: 23px; font-weight: 600; letter-spacing: -.035em; }
.header-actions { display: flex; align-items: center; gap: 9px; }
.header-search { width: clamp(220px, 24vw, 330px); height: 41px; padding: 0 11px; display: flex; align-items: center; gap: 9px; border: 1px solid var(--line); border-radius: 8px; background: rgb(255 255 255 / 86%); color: #888; transition: border-color 180ms ease, background 180ms ease, box-shadow 180ms ease; }
.header-search:focus-within { border-color: var(--line-strong); background: #fff; box-shadow: 0 4px 14px rgb(0 0 0 / 6%); }
.header-search input { min-width: 0; flex: 1; border: 0; outline: 0; background: transparent; color: var(--ink); font-size: 12px; }
.header-search input::placeholder { color: #9da29b; }
.header-search kbd { padding: 2px 5px; border: 1px solid var(--line); border-radius: 4px; background: #f0f0f0; color: #777; font-size: 9px; }
.icon-button, .header-avatar { position: relative; width: 41px; height: 41px; border: 1px solid var(--line); display: grid; place-items: center; background: #fff; cursor: pointer; transition: border-color 180ms ease, background 180ms ease; }
.icon-button { border-radius: 8px; color: var(--ink-soft); }
.icon-button:hover { border-color: var(--line-strong); background: #f0f0f0; }
.header-avatar { border: 0; border-radius: 10px; background: var(--ink); color: #fff; font-size: 11px; font-weight: 600; }
.header-profile-wrap { position: relative; }
.header-profile-menu { position: absolute; top: 50px; right: 0; z-index: 10; width: 180px; padding: 12px 6px 6px; border: 1px solid var(--line); border-radius: 10px; display: grid; background: #fff; box-shadow: 0 20px 50px rgb(0 0 0 / 14%); }
.header-profile-menu > strong, .header-profile-menu > span { padding-inline: 7px; }
.header-profile-menu > strong { color: var(--ink); font-size: 12px; font-weight: 600; }
.header-profile-menu > span { margin: 2px 0 10px; color: var(--muted); font-size: 10px; }
.header-profile-menu button { padding: 8px 7px; border: 0; border-radius: 5px; background: transparent; color: var(--ink-soft); text-align: left; font-size: 11px; cursor: pointer; }
.header-profile-menu button:hover { background: #f1f1f1; color: var(--ink); }
.notification-dot { position: absolute; top: 8px; right: 8px; width: 6px; height: 6px; border: 1px solid #fff; border-radius: 50%; background: var(--accent); }
.notification-wrap { position: relative; }
.notification-popover { position: absolute; top: 50px; right: 0; z-index: 10; width: 290px; padding: 16px; border: 1px solid var(--line); border-radius: 10px; background: #fff; box-shadow: 0 20px 50px rgb(0 0 0 / 14%); font-size: 12px; }
.popover-heading { display: flex; align-items: center; justify-content: space-between; padding-bottom: 11px; border-bottom: 1px solid var(--line); }
.popover-heading strong { font-size: 13px; }
.popover-heading button { padding: 0; border: 0; background: none; color: var(--accent-dark); font-size: 11px; cursor: pointer; }
.notification-popover p { display: flex; align-items: center; gap: 9px; margin: 13px 0 0; color: var(--ink-soft); }
.notice-dot, .funnel-dot { width: 7px; height: 7px; flex: 0 0 7px; border-radius: 2px; }

.dashboard-content { width: min(100%, 1480px); margin: 0 auto; padding: 45px clamp(24px, 3vw, 48px) 64px; }
.welcome-row { display: flex; align-items: end; justify-content: space-between; gap: 32px; margin-bottom: 32px; }
.section-kicker, .panel-kicker { color: #555 !important; font-weight: 600; letter-spacing: .02em; }
.section-kicker { margin: 0 0 8px !important; font-size: 12px !important; }
.welcome-row h2 { max-width: 650px; margin: 0 0 9px; color: var(--ink); font-size: clamp(27px, 3vw, 42px); font-weight: 600; line-height: 1.05; letter-spacing: -.045em; text-wrap: balance; }
.welcome-row > div > p:last-child { max-width: 54ch; margin: 0; color: var(--muted); font-size: 14px; line-height: 1.55; }
.primary-button { min-height: 43px; padding: 0 17px; border: 0; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: var(--accent); color: #fff; font-size: 13px; font-weight: 600; box-shadow: 0 8px 20px rgb(0 0 0 / 12%); cursor: pointer; transition: background 180ms ease, box-shadow 180ms ease, transform 180ms ease; }
.primary-button:hover { background: var(--accent-dark); box-shadow: 0 10px 24px rgb(0 0 0 / 18%); transform: translateY(-1px); }

.stats-grid { margin-bottom: 20px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border: 1px solid var(--line); border-radius: 12px; background: rgb(255 255 255 / 82%); }
.stat-card { min-width: 0; padding: 19px 21px 21px; }
.stat-card + .stat-card { border-left: 1px solid var(--line); }
.stat-heading { display: flex; align-items: center; gap: 8px; }
.stat-icon { width: 28px; height: 28px; border-radius: 7px; display: grid; place-items: center; background: #ededed; color: var(--ink-soft); }
.stat-card p { margin: 0; color: var(--muted); font-size: 12px; font-weight: 500; }
.stat-number-row { margin: 14px 0 1px; display: flex; align-items: baseline; gap: 11px; }
.stat-number-row strong { color: var(--ink); font-size: 29px; font-weight: 600; line-height: 1; letter-spacing: -.045em; font-variant-numeric: tabular-nums; }
.trend { display: inline-flex; align-items: center; color: #4d4d4d; font-size: 11px; font-weight: 600; font-variant-numeric: tabular-nums; }
.stat-card small { color: #8c8c8c; font-size: 10px; }

.overview-grid, .bottom-grid { margin-bottom: 20px; display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(310px, .85fr); gap: 20px; align-items: start; }
.panel { min-width: 0; padding: 25px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface-raised); box-shadow: 0 8px 26px rgb(0 0 0 / 4%); }
.panel-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.panel-kicker { margin: 0 0 5px !important; font-size: 10px !important; text-transform: uppercase; letter-spacing: .1em !important; }
.panel-heading h3 { margin: 0 0 5px; color: var(--ink); font-size: 16px; font-weight: 600; letter-spacing: -.018em; }
.panel-heading p:not(.panel-kicker) { margin: 0; color: var(--muted); font-size: 12px; line-height: 1.45; }
.select-control { height: 34px; padding: 0 28px 0 10px; border: 1px solid var(--line); border-radius: 7px; background-color: #fff; color: var(--ink-soft); font-size: 11px; cursor: pointer; }
.chart-key { margin-top: 28px; display: flex; align-items: center; gap: 17px; color: var(--muted); font-size: 11px; }
.chart-key > span { display: inline-flex; align-items: center; gap: 6px; }
.key-swatch { width: 8px; height: 8px; border-radius: 2px; }
.accent-swatch, .bar-main, .accent-dot { background: var(--accent); }
.light-swatch, .bar-secondary { background: #cfcfcf; }
.chart-key strong { margin-left: auto; color: var(--ink); font-size: 17px; font-weight: 600; font-variant-numeric: tabular-nums; }
.chart-key strong small { display: block; color: var(--muted); font-size: 9px; font-weight: 400; text-align: right; }
.bar-chart { height: 225px; margin-top: 17px; display: flex; }
.y-axis { width: 30px; padding-bottom: 22px; display: flex; flex-direction: column; justify-content: space-between; color: #9b9f98; font-size: 9px; font-variant-numeric: tabular-nums; }
.chart-plot { position: relative; min-width: 0; flex: 1; padding: 0 5px 0 8px; display: flex; justify-content: space-between; }
.grid-line { position: absolute; right: 0; left: 8px; border-top: 1px dashed #e8e6df; }
.line-1 { top: 4px; } .line-2 { top: 52px; } .line-3 { top: 100px; } .line-4 { top: 148px; }
.chart-column { z-index: 1; width: 13%; align-self: stretch; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; color: #969b94; font-size: 9px; }
.chart-column > span { position: absolute; bottom: 0; white-space: nowrap; transform: translateY(18px); }
.bar-group { width: 100%; height: 188px; display: flex; align-items: flex-end; justify-content: center; gap: 3px; }
.bar-group i { width: clamp(7px, 1vw, 12px); display: block; border-radius: 3px 3px 0 0; }

.funnel-wrap { margin-top: 28px; display: grid; grid-template-columns: 1fr .9fr; gap: 22px; align-items: center; }
.funnel-visual { display: grid; gap: 6px; }
.funnel-segment { height: 36px; padding: 0 10px; border-radius: 5px; display: flex; align-items: center; justify-content: space-between; color: #fff; font-size: 12px; font-weight: 600; font-variant-numeric: tabular-nums; }
.funnel-segment small { font-size: 9px; font-weight: 400; opacity: .84; }
.funnel-dark { width: 100%; background: #1a1a1a; }
.funnel-mid { width: 82%; background: #626262; }
.funnel-light { width: 65%; background: #bdbdbd; color: #202020; }
.funnel-accent { width: 48%; background: var(--accent); }
.funnel-side { display: grid; gap: 14px; }
.funnel-side > div { display: flex; align-items: center; gap: 7px; color: var(--muted); font-size: 10px; }
.funnel-side strong { margin-left: auto; color: var(--ink); font-size: 10px; font-variant-numeric: tabular-nums; }
.dark-dot { background: #1a1a1a; } .mid-dot { background: #626262; } .light-dot { background: #bdbdbd; } .green-dot { background: #6b6b6b; }
.activity-footer { margin-top: 27px; padding-top: 16px; border-top: 1px solid var(--line); display: flex; align-items: center; gap: 7px; color: var(--muted); font-size: 10px; }
.positive-chip { display: inline-flex; align-items: center; gap: 2px; color: #4d4d4d; font-weight: 600; }

.table-panel { margin-bottom: 20px; padding-bottom: 12px; }
.table-heading { align-items: center; margin-bottom: 20px; }
.text-button { padding: 7px 0 7px 7px; border: 0; display: inline-flex; align-items: center; gap: 4px; background: none; color: var(--accent-dark); font-size: 11px; font-weight: 600; cursor: pointer; }
.text-button .ui-icon { transition: transform 180ms ease; }
.text-button:hover .ui-icon { transform: translateX(2px); }
.data-table { width: 100%; }
.table-row { position: relative; min-height: 64px; display: grid; grid-template-columns: 1.65fr 1.2fr 1.2fr .9fr 26px; align-items: center; gap: 14px; border-top: 1px solid #ebe9e3; font-size: 12px; }
.table-head { min-height: 34px; border: 0; color: #8c918a; font-size: 10px; font-weight: 600; letter-spacing: .025em; }
.candidate-cell { min-width: 0; display: flex; align-items: center; gap: 11px; }
.candidate-cell > span:last-child { min-width: 0; display: grid; gap: 2px; }
.candidate-cell strong, .job-title-cell strong { overflow: hidden; color: var(--ink); font-size: 12px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.candidate-cell small { overflow: hidden; color: var(--muted); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.muted-cell { color: var(--ink-soft); font-size: 11px; }
.avatar { width: 34px; height: 34px; flex: 0 0 34px; border-radius: 9px; display: grid; place-items: center; font-size: 9px; font-weight: 600; }
.avatar-small { width: 34px; height: 34px; flex-basis: 34px; }
.avatar-tiny { width: 29px; height: 29px; flex-basis: 29px; border-radius: 7px; font-size: 8px; }
.avatar-emma { background: #e3e3e3; color: #202020; }
.avatar-coral { background: #ededed; color: #3f3f3f; }
.avatar-blue { background: #e1e1e1; color: #3f3f3f; }
.avatar-purple { background: #e8e8e8; color: #3f3f3f; }
.avatar-orange { background: #ededed; color: #3f3f3f; }
.status-pill { display: inline-flex; align-items: center; padding: 4px 7px; border-radius: 5px; font-size: 9px; font-weight: 600; white-space: nowrap; }
.status-shortlisted, .status-published { background: #e3e3e3; color: #242424; }
.status-under-review { background: #ededed; color: #4d4d4d; }
.status-new { background: #e8e8e8; color: #3d3d3d; }
.status-interview { background: #e4e4e4; color: #303030; }
.status-draft { background: #f0f0f0; color: #666; }
.status-closed { background: #dedede; color: #303030; }
.ghost-icon-button, .row-dots { padding: 6px; border: 0; border-radius: 6px; display: grid; place-items: center; background: none; color: #898f88; cursor: pointer; transition: background 180ms ease, color 180ms ease; }
.ghost-icon-button:hover, .row-dots:hover { background: #efefef; color: var(--ink); }
.row-dots { justify-self: end; }
.empty-state { min-height: 150px; display: grid; place-items: center; place-content: center; gap: 6px; color: var(--muted); text-align: center; }
.empty-state strong { color: var(--ink); font-size: 13px; font-weight: 600; }
.empty-state span { font-size: 11px; }

.jobs-panel, .interviews-panel { min-width: 0; }
.job-tabs { margin-bottom: 7px; display: flex; gap: 22px; overflow-x: auto; border-bottom: 1px solid var(--line); scrollbar-width: none; }
.job-tabs button { position: relative; padding: 0 0 11px; border: 0; background: none; color: #858b83; font-size: 10px; white-space: nowrap; cursor: pointer; }
.job-tabs button.active { color: var(--ink); font-weight: 600; }
.job-tabs button.active::after { position: absolute; right: 0; bottom: -1px; left: 0; height: 2px; background: var(--accent); content: ""; }
.compact-table .table-row { min-height: 53px; grid-template-columns: 2fr .75fr .7fr .85fr; }
.job-title-cell { min-width: 0; display: flex; align-items: center; gap: 9px; }
.job-mark { width: 29px; height: 29px; flex: 0 0 29px; border-radius: 7px; display: grid; place-items: center; background: #ededed; color: var(--ink-soft); }
.interview-list { margin: 19px 0 17px; display: grid; }
.interview-item { min-width: 0; padding: 11px 0; display: flex; align-items: center; gap: 11px; border-bottom: 1px solid #ebe9e3; }
.date-block { width: 38px; height: 42px; flex: 0 0 38px; border-radius: 7px; display: grid; place-content: center; background: #ededed; text-align: center; text-decoration: none; }
.date-block strong { color: var(--ink); font-size: 13px; line-height: 1; }
.date-block small { margin-top: 2px; color: var(--muted); font-size: 8px; text-transform: uppercase; }
.interview-item > div { min-width: 0; flex: 1; display: grid; gap: 3px; }
.interview-item > div strong { overflow: hidden; color: var(--ink); font-size: 11px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.interview-item > div span { overflow: hidden; color: var(--muted); font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
.calendar-button { width: 100%; min-height: 37px; border: 1px solid var(--line); border-radius: 7px; display: flex; align-items: center; justify-content: center; gap: 8px; background: #fff; color: var(--ink-soft); font-size: 10px; font-weight: 500; cursor: pointer; transition: background 180ms ease, border-color 180ms ease; }
.calendar-button:hover { border-color: var(--line-strong); background: #f1f1f1; }

.mobile-menu-button, .mobile-close, .sidebar-backdrop { display: none; }
.sidebar-is-collapsed .company-sidebar { width: 82px; flex-basis: 82px; padding-inline: 12px; }
.sidebar-is-collapsed .sidebar-brand { justify-content: center; padding-inline: 0; }
.sidebar-is-collapsed .sidebar-brand :deep(img:last-child), .sidebar-is-collapsed .sidebar-label, .sidebar-is-collapsed .sidebar-link > span, .sidebar-is-collapsed .profile-copy, .sidebar-is-collapsed .sidebar-profile > .ui-icon { display: none; }
.sidebar-is-collapsed .sidebar-link, .sidebar-is-collapsed .sidebar-profile { justify-content: center; padding-inline: 0; }
.sidebar-is-collapsed .collapse-button { position: absolute; top: 33px; right: 2px; transform: rotate(180deg); }
.sidebar-is-collapsed .profile-menu { left: 58px; bottom: 0; width: 140px; }

@media (max-width: 1180px) {
  .company-sidebar { width: 214px; flex-basis: 214px; }
  .overview-grid, .bottom-grid { grid-template-columns: 1fr; }
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
  .company-sidebar .sidebar-brand, .sidebar-is-collapsed .sidebar-brand { justify-content: space-between; padding: 0 7px 22px; }
  .company-sidebar .sidebar-brand :deep(img:last-child), .company-sidebar .sidebar-label, .company-sidebar .sidebar-link > span, .company-sidebar .profile-copy, .company-sidebar .sidebar-profile > .ui-icon { display: initial; }
  .company-sidebar .sidebar-link, .company-sidebar .sidebar-profile { justify-content: flex-start; padding-inline: 12px; }
  .company-sidebar .nav-count, .company-sidebar .sidebar-profile > .ui-icon { margin-left: auto; }
  .desktop-collapse { display: none; }
  .mobile-close, .mobile-menu-button { display: grid; place-items: center; }
  .mobile-close { position: static; transform: none; }
  .mobile-menu-button { width: 41px; height: 41px; flex: 0 0 41px; border-radius: 8px; }
  .sidebar-backdrop { position: fixed; inset: 0; z-index: 40; display: block; border: 0; background: rgb(0 0 0 / 42%); backdrop-filter: blur(2px); }
  .dashboard-header { position: sticky; top: 0; z-index: 30; min-height: 76px; padding: 14px 18px; display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 12px; background: rgb(247 247 247 / 92%); backdrop-filter: blur(18px); }
  .dashboard-header .eyebrow { display: none; }
  .dashboard-header h1 { font-size: 19px; }
  .header-search { width: 41px; padding: 0; justify-content: center; }
  .header-search input, .header-search kbd { display: none; }
  .dashboard-content { padding: 32px 18px 48px; }
  .welcome-row { align-items: center; }
  .welcome-row h2 { font-size: clamp(27px, 7vw, 36px); }
  .panel { padding: 21px 18px; }
  .bar-chart { height: 205px; }
}

@media (max-width: 620px) {
  .dashboard-header { grid-template-columns: auto minmax(0, 1fr); }
  .header-actions { grid-column: 1 / -1; width: 100%; }
  .header-search { width: auto; flex: 1; justify-content: flex-start; padding: 0 12px; }
  .header-search input { display: block; }
  .welcome-row { align-items: stretch; flex-direction: column; gap: 22px; }
  .primary-button { width: 100%; }
  .panel-heading { align-items: flex-start; }
  .chart-key { flex-wrap: wrap; }
  .chart-key strong { width: 100%; margin-left: 0; }
  .chart-key strong small { display: inline; margin-left: 4px; }
  .funnel-wrap { grid-template-columns: 1fr; }
  .funnel-side { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .data-table .table-head { display: none; }
  .data-table .table-row:not(.table-head) { min-height: 0; margin-top: 9px; padding: 14px; border: 1px solid var(--line); border-radius: 9px; background: #fafafa; }
  .applicants-table .table-row:not(.table-head) { grid-template-columns: 1fr auto; gap: 13px 10px; }
  .applicants-table .candidate-cell { grid-column: 1 / -1; padding-right: 35px; }
  .applicants-table .muted-cell, .applicants-table .status-cell { grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
  .applicants-table .row-dots { position: absolute; top: 13px; right: 11px; }
  .compact-table .table-row:not(.table-head) { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px 8px; }
  .compact-table .job-title-cell { grid-column: 1 / -1; }
  .compact-table .muted-cell, .compact-table .status-cell { display: grid; gap: 6px; }
  [data-label]::before { color: #8c918a; font-size: 9px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; content: attr(data-label); }
}

@media (max-width: 430px) {
  .stats-grid { grid-template-columns: 1fr; }
  .stat-card + .stat-card { border-top: 1px solid var(--line); border-left: 0; }
  .notification-popover { position: fixed; top: 125px; right: 16px; left: 16px; width: auto; }
  .header-profile-menu { position: fixed; top: 125px; right: 16px; width: 180px; }
  .panel-heading { flex-wrap: wrap; }
  .table-heading .text-button { margin-left: auto; }
  .chart-column { font-size: 8px; }
  .funnel-side { grid-template-columns: 1fr; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; animation-duration: .01ms !important; }
}
</style>
