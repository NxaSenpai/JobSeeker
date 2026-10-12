<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import BrandLogo from "@/components/landing/BrandLogo.vue";
import UiIcon from "@/components/company/UiIcon.vue";
import AdminNotificationsControl from "@/components/admin/AdminNotificationsControl.vue";
import {
  clearAuthSession,
  currentUser,
  displayNameForUser,
  initialsForUser,
} from "@/services/auth";
import { useSidebarDock } from "@/composables/useSidebarDock";
import { adminDarkMode, adminPageScale } from "@/services/adminPreferences";
import {
  startAdminQueueRealtime,
  stopAdminQueueRealtime,
  useAdminQueueCounts,
} from "@/services/adminQueueCounts";

withDefaults(
  defineProps<{
    title: string;
    searchLabel?: string;
    searchPlaceholder?: string;
    showSearch?: boolean;
  }>(),
  {
    searchLabel: "Search reports",
    searchPlaceholder: "Search reports",
    showSearch: true,
  },
);

const searchQuery = defineModel<string>("search", { default: "" });
const emit = defineEmits<{ search: [] }>();
const route = useRoute();
const router = useRouter();
const mobileMenuOpen = ref(false);
const sidebarCollapsed = useSidebarDock("jobseeker.sidebar.docked.admin");
const showProfileMenu = ref(false);
const { reportCount, pendingCompanyCount, pendingJobCount } =
  useAdminQueueCounts();

onMounted(startAdminQueueRealtime);
onBeforeUnmount(stopAdminQueueRealtime);

const displayName = computed(() =>
  currentUser.value ? displayNameForUser(currentUser.value) : "Administrator",
);
const initials = computed(() =>
  currentUser.value ? initialsForUser(currentUser.value) : "AD",
);
const navigation = [
  { label: "Dashboard", to: "/admin", icon: "grid" },
  { label: "Users", to: "/admin/users", icon: "users" },
  { label: "Jobs", to: "/admin/jobs", icon: "briefcase" },
  { label: "Reports", to: "/admin/reports", icon: "chart" },
  { label: "Companies", to: "/admin/companies", icon: "building" },
  { label: "Audit log", to: "/admin/audit", icon: "clock" },
];
const accountNavigation = [
  { label: "Settings", to: "/admin/settings", icon: "settings" },
  { label: "Profile", to: "/admin/profile", icon: "users" },
];

function isActive(path: string) {
  return route.path === path || (path !== "/admin" && route.path.startsWith(`${path}/`));
}

function closeMobileMenu() {
  mobileMenuOpen.value = false;
}

function signOut() {
  clearAuthSession();
  stopAdminQueueRealtime();
  void router.replace({ name: "AuthPage" });
}
</script>

<template>
  <div
    class="admin-shell"
    :class="{
      'sidebar-is-collapsed': sidebarCollapsed,
      'theme-dark': adminDarkMode,
    }"
  >
    <a class="skip-link" href="#admin-content">Skip to main content</a>

    <button
      v-if="mobileMenuOpen"
      class="sidebar-backdrop"
      type="button"
      aria-label="Close navigation"
      @click="closeMobileMenu"
    />

    <aside
      id="admin-navigation"
      class="admin-sidebar"
      :class="{ open: mobileMenuOpen }"
    >
      <div class="sidebar-brand">
        <BrandLogo variant="dark" :icon-only="sidebarCollapsed" :inverted="adminDarkMode" />
        <button
          class="collapse-button mobile-close"
          type="button"
          aria-label="Close navigation"
          @click="closeMobileMenu"
        >
          <UiIcon name="close" :size="18" />
        </button>
      </div>

      <p class="sidebar-label">Workspace</p>
      <nav class="sidebar-nav" aria-label="Admin navigation">
        <router-link
          v-for="item in navigation"
          :key="item.to"
          :to="item.to"
          class="sidebar-link"
          :class="{ selected: isActive(item.to) }"
          :aria-current="isActive(item.to) ? 'page' : undefined"
          :title="sidebarCollapsed ? item.label : undefined"
          @click="closeMobileMenu"
        >
          <UiIcon :name="item.icon" :size="19" />
          <span>{{ item.label }}</span>
          <span
            v-if="item.label === 'Reports' && reportCount !== null && reportCount > 0"
            class="nav-count"
            >{{ reportCount }}</span
          >
          <span
            v-else-if="item.label === 'Jobs' && pendingJobCount !== null && pendingJobCount > 0"
            class="nav-count"
            >{{ pendingJobCount }}</span
          >
          <span
            v-else-if="item.label === 'Companies' && pendingCompanyCount !== null && pendingCompanyCount > 0"
            class="nav-count"
            >{{ pendingCompanyCount }}</span
          >
        </router-link>
      </nav>

      <div class="sidebar-bottom">
        <p class="sidebar-label">Account</p>
        <nav class="sidebar-nav account-nav" aria-label="Admin account navigation">
          <router-link
            v-for="item in accountNavigation"
            :key="item.to"
            :to="item.to"
            class="sidebar-link"
            :class="{ selected: isActive(item.to) }"
            :aria-current="isActive(item.to) ? 'page' : undefined"
            :title="sidebarCollapsed ? item.label : undefined"
            @click="closeMobileMenu"
          >
            <UiIcon :name="item.icon" :size="19" />
            <span>{{ item.label }}</span>
          </router-link>
        </nav>
        <div class="profile-wrap">
          <button
            class="sidebar-profile"
            type="button"
            aria-label="Admin account menu"
            aria-controls="admin-profile-menu"
            :aria-expanded="showProfileMenu"
            @click="showProfileMenu = !showProfileMenu"
          >
            <span class="avatar">{{ initials }}</span>
            <span class="profile-copy">
              <strong>{{ displayName }}</strong>
            </span>
            <UiIcon name="chevron" :size="16" />
          </button>
        </div>
      </div>
    </aside>

    <button
      class="collapse-button sidebar-dock-button desktop-collapse"
      :class="{ docked: sidebarCollapsed }"
      type="button"
      :aria-label="sidebarCollapsed ? 'Expand sidebar' : 'Dock sidebar'"
      :aria-pressed="sidebarCollapsed"
      @click="sidebarCollapsed = !sidebarCollapsed"
    >
      <UiIcon name="chevron" :size="18" />
    </button>

    <div
      v-if="showProfileMenu"
      id="admin-profile-menu"
      class="profile-menu"
      role="menu"
      aria-label="Admin account actions"
    >
      <div class="profile-menu-heading">
        <strong>{{ displayName }}</strong>
        <small>{{ currentUser?.email ?? "Administrator" }}</small>
      </div>
      <button type="button" role="menuitem" @click="signOut">Sign out</button>
    </div>

    <main id="admin-content" class="dashboard-main" :style="{ zoom: `${adminPageScale}%` }">
      <header class="dashboard-header">
        <button
          class="mobile-menu-button"
          type="button"
          aria-label="Open navigation"
          aria-controls="admin-navigation"
          :aria-expanded="mobileMenuOpen"
          @click="mobileMenuOpen = true"
        >
          <UiIcon name="menu" :size="21" />
        </button>
        <div class="header-copy">
          <p class="eyebrow">Admin Workspace</p>
          <h1>{{ title }}</h1>
        </div>
        <div class="header-actions">
          <form
            v-if="showSearch"
            class="header-search"
            role="search"
            :aria-label="searchLabel"
            @submit.prevent="emit('search')"
          >
            <UiIcon name="search" :size="18" />
            <input
              v-model="searchQuery"
              type="search"
              :aria-label="searchLabel"
              :placeholder="searchPlaceholder"
            />
            <kbd>Enter</kbd>
          </form>
          <slot name="actions" />
          <AdminNotificationsControl />
        </div>
      </header>

      <nav class="mobile-workspace-nav" aria-label="Admin workspace navigation">
        <router-link
          v-for="item in navigation"
          :key="item.to"
          :to="item.to"
          :class="{ selected: isActive(item.to) }"
          :aria-current="isActive(item.to) ? 'page' : undefined"
          @click="closeMobileMenu"
        >
          <UiIcon :name="item.icon" :size="16" />
          <span>{{ item.label }}</span>
          <em v-if="item.label === 'Reports' && reportCount !== null && reportCount > 0">{{ reportCount }}</em>
          <em v-else-if="item.label === 'Jobs' && pendingJobCount !== null && pendingJobCount > 0">{{ pendingJobCount }}</em>
          <em v-else-if="item.label === 'Verification' && pendingCompanyCount !== null && pendingCompanyCount > 0">{{ pendingCompanyCount }}</em>
        </router-link>
      </nav>

      <div class="dashboard-content"><slot /></div>
    </main>
  </div>
</template>

<style scoped>
:global(*) { box-sizing: border-box; }
:global(body:has(.admin-shell)) { margin: 0; overflow-x: hidden; background: #f6f6f3; color: #19233c; }
:global(html:has(.admin-shell)), :global(body:has(.admin-shell)) { scrollbar-width: none; -ms-overflow-style: none; }
:global(html:has(.admin-shell)::-webkit-scrollbar), :global(body:has(.admin-shell)::-webkit-scrollbar) { width: 0; height: 0; display: none; }
:global(button), :global(input), :global(select) { font: inherit; }

.admin-shell { --sidebar-width: 218px; --ink: #19233c; --ink-soft: #40506b; --muted: #657088; --line: #e2e4e8; --line-strong: #c9ced7; --canvas: #f6f6f3; --surface: #fbfbf9; --surface-raised: #fff; --accent: #6a56cf; --accent-dark: #5643b9; --accent-soft: #f0eefb; min-height: 100dvh; display: flex; background: var(--canvas); color: var(--ink); font-family: "Outfit", "Bai Jamjuree", ui-sans-serif, system-ui, sans-serif; transition: background-color 220ms ease, color 220ms ease; }
.admin-shell.theme-dark { --ink: #edf1f7; --ink-soft: #b4bfd1; --muted: #8491a7; --line: #2c3545; --line-strong: #455268; --canvas: #121722; --surface: #171e2a; --surface-raised: #1c2533; --accent: #9a88f1; --accent-dark: #b8aaff; --accent-soft: #2b2744; color-scheme: dark; }
:global(body:has(.admin-shell.theme-dark)) { background: #121722; color: #edf1f7; }
.sidebar-is-collapsed.admin-shell { --sidebar-width: 82px; }
.skip-link { position: fixed; top: 10px; left: 10px; z-index: 100; padding: 10px 14px; border-radius: 6px; background: var(--ink); color: #fff; transform: translateY(-160%); transition: transform 180ms ease; }
.skip-link:focus { transform: translateY(0); }
.admin-sidebar { position: sticky; top: 0; z-index: 20; width: var(--sidebar-width); height: 100dvh; flex: 0 0 var(--sidebar-width); padding: 24px 12px 18px; display: flex; flex-direction: column; overflow-y: auto; scrollbar-width: none; -ms-overflow-style: none; border-right: 1px solid var(--line); background: var(--surface); backdrop-filter: blur(18px); transition: width 220ms ease, flex-basis 220ms ease, transform 220ms ease, background-color 220ms ease; }
.admin-sidebar::-webkit-scrollbar { width: 0; height: 0; display: none; }
.sidebar-brand { min-height: 42px; padding: 0 8px 24px; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.sidebar-brand :deep(a) { gap: 9px !important; }
.sidebar-brand :deep(.brand-logo--wordmark img) { height: 45px !important; }
.sidebar-brand :deep(.brand-logo--icon img) { width: 33px !important; height: 33px !important; }
.collapse-button, .mobile-menu-button { border: 1px solid var(--line); display: grid; place-items: center; background: var(--surface-raised); color: var(--ink-soft); cursor: pointer; transition: border-color 180ms ease, color 180ms ease, background 180ms ease; }
.collapse-button { width: 30px; height: 30px; border-radius: 7px; }
.collapse-button:hover, .mobile-menu-button:hover { border-color: var(--line-strong); background: var(--accent-soft); color: var(--accent-dark); }
.sidebar-dock-button { position: fixed; top: 24px; left: calc(var(--sidebar-width) - 10px); z-index: 65; width: 38px; height: 38px; border-radius: 10px; box-shadow: 0 3px 12px rgb(11 43 130 / 9%); }
.sidebar-dock-button .ui-icon { transition: transform 180ms ease; }
.sidebar-dock-button.docked .ui-icon { transform: rotate(180deg); }
.sidebar-label { margin: 17px 12px 9px; color: #7a8190; font-size: 11px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; }
.sidebar-nav { display: grid; gap: 3px; }
.sidebar-link { position: relative; min-height: 42px; margin-bottom: 3px; padding: 0 12px; border: 0; border-radius: 6px; display: flex; align-items: center; gap: 11px; background: transparent; color: #5d6676; text-align: left; text-decoration: none; font-size: 14px; font-weight: 500; transition: color 180ms ease, background 180ms ease; }
.sidebar-link:hover { background: var(--accent-soft); color: var(--ink); }
.sidebar-link.selected { background: rgb(106 86 207 / 7%); color: var(--accent-dark); font-weight: 600; }
.theme-dark .sidebar-label { color: var(--muted); }
.theme-dark .sidebar-link { color: var(--ink-soft); }
.theme-dark .sidebar-link.selected { background: rgb(154 136 241 / 12%); color: var(--accent-dark); }
.sidebar-link.selected::before { position: absolute; left: 0; width: 2px; height: 18px; border-radius: 2px; background: var(--accent); content: ""; }
.nav-count { min-width: 19px; margin-left: auto; padding: 1px 5px; border-radius: 4px; background: var(--accent-soft); color: var(--accent-dark); text-align: center; font-size: 11px; font-variant-numeric: tabular-nums; }
.sidebar-bottom { margin-top: auto; }
.account-nav { gap: 1px; }
.account-nav .sidebar-link { min-height: 38px; }
.profile-wrap { position: relative; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--line); }
.sidebar-profile { width: 100%; min-height: 49px; padding: 6px 8px; border: 0; border-radius: 9px; display: flex; align-items: center; gap: 10px; background: transparent; text-align: left; cursor: pointer; transition: background 180ms ease; }
.sidebar-profile:hover { background: var(--accent-soft); }
.sidebar-profile > :deep(.ui-icon) { margin-left: auto; transform: rotate(-90deg); }
.avatar { width: 34px; height: 34px; flex: 0 0 auto; border-radius: 9px; display: grid; place-items: center; background: #f0edff; color: #5f4bd2; font-size: 11px; font-weight: 700; }
.theme-dark .avatar { background: #302a51; color: #c6bcff; }
.profile-copy { min-width: 0; display: grid; gap: 2px; }
.profile-copy strong { overflow: hidden; color: var(--ink); font-size: 14px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.profile-menu { position: fixed; left: 14px; bottom: 82px; z-index: 65; width: 208px; padding: 7px; border: 1px solid var(--line); border-radius: 10px; background: var(--surface-raised); box-shadow: 0 18px 40px rgb(11 43 130 / 14%); }
.profile-menu-heading { padding: 9px 10px 11px; border-bottom: 1px solid var(--line); display: grid; gap: 3px; }
.profile-menu-heading strong { overflow: hidden; color: var(--ink); font-size: 14px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.profile-menu-heading small { overflow: hidden; color: var(--muted); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.profile-menu button { width: 100%; margin-top: 4px; padding: 9px 10px; border: 0; border-radius: 6px; display: block; background: transparent; color: var(--ink-soft); text-align: left; font-size: 14px; cursor: pointer; }
.profile-menu button:hover { background: var(--accent-soft); }
.profile-menu button:last-child { color: #9b5262; }
.sidebar-is-collapsed .admin-sidebar { width: 82px; flex-basis: 82px; padding-inline: 12px; }
.sidebar-is-collapsed .sidebar-brand { min-height: 78px; flex-direction: column; justify-content: flex-start; gap: 8px; padding: 0 0 16px; }
.sidebar-is-collapsed .sidebar-label, .sidebar-is-collapsed .sidebar-link > span, .sidebar-is-collapsed .profile-copy, .sidebar-is-collapsed .sidebar-profile > :deep(.ui-icon) { display: none; }
.sidebar-is-collapsed .sidebar-link, .sidebar-is-collapsed .sidebar-profile { justify-content: center; padding-inline: 0; }
.sidebar-is-collapsed .profile-menu { left: calc(var(--sidebar-width) + 10px); bottom: 18px; width: 208px; }
.dashboard-main { min-width: 0; flex: 1; }
.dashboard-header { position: sticky; top: 0; z-index: 30; min-height: 76px; padding: 16px clamp(24px, 3vw, 48px); border-bottom: 1px solid var(--line); display: flex; align-items: center; justify-content: space-between; gap: 30px; background: var(--canvas); backdrop-filter: blur(16px); }
.header-copy { margin-right: auto; }
.eyebrow { margin: 0 0 3px; color: var(--muted); font-size: 14px; }
.dashboard-header h1 { margin: 0; color: var(--ink); font-size: 17px; font-weight: 600; letter-spacing: -.02em; }
.header-actions { display: flex; align-items: center; gap: 9px; }
.header-search { width: clamp(220px, 24vw, 330px); height: 41px; padding: 0 11px; border: 1px solid var(--line); border-radius: 8px; display: flex; align-items: center; gap: 9px; background: var(--surface-raised); color: #8290b4; transition: border-color 180ms ease, background 180ms ease, box-shadow 180ms ease; }
.header-search:focus-within { border-color: var(--accent); background: var(--surface-raised); box-shadow: 0 4px 14px rgb(123 102 255 / 12%); }
.header-search input { min-width: 0; flex: 1; border: 0; outline: 0; background: transparent; color: var(--ink); font-size: 14px; }
.admin-shell .header-search input:focus-visible { outline: 0; box-shadow: none; }
.header-search input::placeholder { color: #8994b6; }
.theme-dark .header-search input::placeholder { color: #8491a7; }
.header-search kbd { padding: 2px 5px; border: 1px solid var(--line); border-radius: 4px; background: var(--accent-soft); color: #68759d; font-size: 11px; }
.mobile-menu-button, .mobile-close, .sidebar-backdrop, .mobile-workspace-nav { display: none; }
.dashboard-content { width: min(100%, 1480px); margin: 0 auto; padding: 20px clamp(24px, 3vw, 48px) 64px; }
.admin-shell :deep(button:focus-visible), .admin-shell :deep(a:focus-visible), .admin-shell :deep(input:focus-visible), .admin-shell :deep(select:focus-visible), .admin-shell :deep(textarea:focus-visible) { outline: 3px solid rgb(123 102 255 / 30%); outline-offset: 2px; }
.admin-shell :deep(button:active) { transform: translateY(1px); }

:global(.admin-shell.theme-dark .dashboard-content) { color: var(--ink-soft); }
:global(.admin-shell.theme-dark .dashboard-content :is(h1, h2, h3, h4, dt, .page-heading strong, .page-intro strong, .panel-heading strong, .summary-item strong, .stage-copy span, .pipeline-stage > strong, .pipeline-insight strong, .coverage-item strong, .feature-row > strong, .record-total strong, .account-name, .company-name, .job-title strong, .event-copy strong, .owner-card h3, .profile-section-heading h3, .profile-hero-copy h3, .detail-strong, .detail-header h2, .explanation-block h3, .identity-title h3, .identity-details dd, .appearance-copy strong, .option-copy strong, .scale-value, .scope-note strong)) { color: var(--ink) !important; }
:global(.admin-shell.theme-dark .dashboard-content :is(small, time, .eyebrow, .page-heading p:not(.eyebrow), .page-intro > p:last-child, .panel-heading p:not(.panel-kicker), .settings-section-heading p, .summary-item > span, .summary-item small, .stage-copy small, .stage-detail, .pipeline-insight, .coverage-item small, .feature-head, .feature-status, .record-total span, .toolbar > label, .filter-field, .filter-count, .queue-note, .job-title span, .job-location, .company-status, .description, .job-content-grid h4, .job-content-grid ul, .owner-cell, .joined-cell, .company-copy small, .detail-kicker, .profile-kicker, .profile-section-heading > small, .profile-facts dt, .profile-entry-subtitle, .profile-entry > small, .profile-entry-description, .profile-language-list span, .profile-resume small, .profile-empty, .subject-id, .actor-email, .event-details span, .event-details code, .appearance-copy small, .option-copy small, .scale-label, .storage-note)) { color: var(--muted) !important; }
:global(.admin-shell.theme-dark .dashboard-content :is(.pipeline-panel, .role-watch-panel, .panel, .toolbar, .account-list, .account-row, .company-list-panel, .company-row, .list-heading, .job-list, .job-row, .job-details, .log-list, .log-heading, .log-row, .matching-count, .filter-bar, .queue-panel, .detail-panel, .report-row, .report-parties, .facts-grid, .explanation-block, .explanation-block > p, .decision-note-card, .state-panel, .identity-panel, .identity-header, .identity-details, .profile-skeleton, .settings-section, .layout-option, .scale-option, .profile-facts, .profile-long-text, .profile-entry-list, .profile-entry, .profile-language-list, .profile-language-list > div, .profile-resume, .profile-self-note, .profile-chip-list > span, .event-details, .event-details pre, .owner-card, .company-facts, .description-section > p, .scope-note)) { background-color: var(--surface-raised) !important; border-color: var(--line) !important; color: var(--ink-soft); box-shadow: none; }
:global(.admin-shell.theme-dark .dashboard-content :is(.filter-field input, .filter-field select, .toolbar select, .decision-form textarea, .suspend-form textarea, .reason-form textarea, input, select, textarea)) { background-color: var(--surface) !important; border-color: var(--line-strong) !important; color: var(--ink) !important; }
:global(.admin-shell.theme-dark .dashboard-content :is(.details-button, .profile-button, .pagination button, .quiet-button, .close-detail, .log-row button)) { background-color: var(--surface) !important; border-color: var(--line-strong) !important; color: var(--ink-soft) !important; }
:global(.admin-shell.theme-dark .dashboard-content :is(.identity-mark, .coverage-mark, .job-mark, .profile-pdf-mark, .section-icon, .empty-icon, .page-label, .job-meta span)) { background-color: var(--accent-soft) !important; color: var(--accent-dark) !important; }
:global(.admin-shell.theme-dark .dashboard-content :is(.company-mark, .identity-avatar, .profile-person-avatar, .company-profile-mark)) { background-color: #302a51 !important; border-color: #51478a !important; color: #c6bcff !important; }
:global(.admin-shell.theme-dark .dashboard-content :is(.layout-option.selected, .scale-option.selected)) { background-color: var(--accent-soft) !important; border-color: #5b4aa9 !important; }
:global(.admin-shell.theme-dark .dashboard-content .radio-mark) { background-color: var(--surface) !important; border-color: var(--line-strong) !important; }
:global(.admin-shell.theme-dark .dashboard-content :is(.layout-options legend, .scale-options legend, .preference-row)) { border-color: var(--line); color: var(--muted); }
:global(.admin-shell.theme-dark .dashboard-content :is(.pipeline-stage:hover, .report-row:hover, .report-row.selected, .details-button:hover, .profile-button:hover, .quiet-button:hover:not(:disabled), .log-row button:hover)) { background-color: #252d3b !important; }
:global(.admin-shell.theme-dark .dashboard-content .filter-submit) { background-color: var(--accent) !important; color: #fff !important; }
:global(.admin-shell.theme-dark .dashboard-content :is(.notice, .inline-alert, .profile-alert, .profile-success, .profile-self-note, .eligibility-note, .moderation-note, .existing-reason)) { border-color: var(--line) !important; }

:global(.admin-shell.theme-dark .notification-button), :global(.admin-shell.theme-dark .notification-close), :global(.admin-shell.theme-dark .notification-refresh) { border-color: var(--line-strong); background: var(--surface-raised); color: var(--ink-soft); }
:global(.admin-shell.theme-dark .notification-button:hover), :global(.admin-shell.theme-dark .notification-button[aria-expanded="true"]), :global(.admin-shell.theme-dark .notification-close:hover), :global(.admin-shell.theme-dark .notification-refresh:hover:not(:disabled)) { border-color: var(--line-strong); background: var(--accent-soft); color: var(--accent-dark); }
:global(.admin-shell.theme-dark .notification-count), :global(.admin-shell.theme-dark .notification-error-mark) { border-color: var(--surface); }
:global(.admin-shell.theme-dark .notification-panel) { border-color: var(--line); background: var(--surface-raised); color: var(--ink); }
:global(.admin-shell.theme-dark .notification-panel :is(h2, strong, .notification-item-count)) { color: var(--ink); }
:global(.admin-shell.theme-dark .notification-panel :is(.notification-explainer, .notification-item-copy small, .notification-state)) { color: var(--muted); }
:global(.admin-shell.theme-dark .notification-item) { border-color: var(--line); }

:global(body:has(.admin-shell.theme-dark) .profile-dialog) { border-color: #2c3545; background: #1c2533; color: #edf1f7; }
:global(body:has(.admin-shell.theme-dark) .profile-dialog .profile-dialog-header) { border-color: #2c3545; background: #1c2533; }
:global(body:has(.admin-shell.theme-dark) .profile-dialog :is(h2, h3, h4, strong, dt, dd, label)) { color: #edf1f7 !important; }
:global(body:has(.admin-shell.theme-dark) .profile-dialog :is(p, small, .profile-kicker, .profile-dialog-subtitle, .detail-kicker)) { color: #aeb9ca; }
:global(body:has(.admin-shell.theme-dark) .profile-dialog :is(.profile-facts, .profile-long-text, .profile-entry-list, .profile-entry, .profile-language-list, .profile-language-list > div, .profile-resume, .company-facts, .owner-card, .description-section > p, .company-actions, .suspend-form textarea, .decision-form textarea)) { border-color: #2c3545; background-color: #171e2a; color: #b4bfd1; }
:global(body:has(.admin-shell.theme-dark) .profile-dialog :is(.profile-person-avatar, .company-profile-mark)) { border-color: #51478a; background-color: #302a51; color: #c6bcff; }
:global(body:has(.admin-shell.theme-dark) .profile-dialog .profile-dialog-close) { border-color: #455268; background: #171e2a; color: #b4bfd1; }
:global(body:has(.admin-shell.theme-dark) .profile-dialog .profile-dialog-close:hover) { background: #2b2744; color: #b8aaff; }

/* Keep page-specific light styles from leaking through the shared admin theme. */
:global(.admin-shell.theme-dark .dashboard-content :is(.users-page, .companies-page, .jobs-page, .audit-page, .profile-page, .settings-page, .reports-page)) { color: var(--ink-soft) !important; }
:global(.admin-shell.theme-dark .dashboard-content :is(.page-heading > div > p:last-child, .reports-intro > div:first-child > p:last-child, .identity-title > p, .profile-note, .profile-loading, .profile-hero-copy > p, .account-copy > span, .role-tag, .access-tag, .summary, .company-status, .decision-copy, .detail-label, .detail-subtle, .action-explainer, .suspend-form label, .reason-form label, .decision-form label, .decision-field, .decision-field small, .moderation-guidance, .owner-card > p, .moderation-note p, .scope-note span, .profile-facts dd, .company-facts dd, .pagination, .pagination span, .queue-loading, .detail-loading, .empty-state p, .detail-empty p, .row-kicker, .row-meta, .report-summary, .log-heading, .profile-empty, .no-profile > p, .feature-unavailable)) { color: var(--ink-soft) !important; }
:global(.admin-shell.theme-dark .dashboard-content :is(.matching-count strong, .profile-resume strong, .profile-language-list strong, .state-panel strong)) { color: var(--ink) !important; }
:global(.admin-shell.theme-dark .dashboard-content :is(.section-kicker, .panel-kicker, .profile-kicker, .option-state)) { color: #c6bcff !important; }
:global(.admin-shell.theme-dark .dashboard-content :is(.status-pill.pending, .status-pending, .status-open, .status-review, .status-in-review, .owner-state.blocked, .eligibility-note.blocked, .existing-reason, .moderation-note:not(.suspended-note))) { border-color: #625236 !important; background-color: #342d1f !important; color: #efd994 !important; }
:global(.admin-shell.theme-dark .dashboard-content :is(.status-pill.verified, .status-approved, .status-resolved, .owner-state.ready, .eligibility-note.ready, .access-tag.active, .open-to-work, .default-resume, .profile-success, .notice.success, .inline-success)) { border-color: #365e4c !important; background-color: #1d3329 !important; color: #a7dbba !important; }
:global(.admin-shell.theme-dark .dashboard-content :is(.status-pill.suspended, .status-rejected, .danger-button, .access-tag.suspended, .profile-alert, .notice.error, .inline-alert, .error-state, .profile-error, .suspended-note)) { border-color: #68424b !important; background-color: #38242b !important; color: #f0aab3 !important; }
:global(.admin-shell.theme-dark .dashboard-content :is(.status-hidden, .status-pill.hidden, .status-dismissed, .role-label, .detail-tag, .job-meta span, .profile-self-note)) { border-color: var(--line) !important; background-color: #252e3c !important; color: #c1cada !important; }
:global(.admin-shell.theme-dark .dashboard-content :is(.status-review, .status-in-review, .start-review, .profile-chip-list > span)) { border-color: #51478a !important; background-color: var(--accent-soft) !important; color: #c6bcff !important; }
:global(.admin-shell.theme-dark .dashboard-content :is(.log-heading, .empty-state, .detail-empty, .queue-loading, .detail-loading, .decision-note-card, .moderation-actions, .reason-form, .decision-controls, .company-actions)) { border-color: var(--line) !important; background-color: var(--surface-raised) !important; }
:global(.admin-shell.theme-dark .dashboard-content :is(.summary-strip, .summary-item + .summary-item, .pipeline-stage, .pipeline-insight, .coverage-item, .feature-row, .panel-heading, .detail-header, .pagination, .decision-controls, .report-parties, .decision-field, .identity-details > div, .account-row + .account-row, .job-row + .job-row, .log-entry + .log-entry, .company-row, .settings-section + .settings-section, .user-profile-hero, .company-actions)) { border-color: var(--line) !important; }
:global(.admin-shell.theme-dark .dashboard-content .danger-button:hover:not(:disabled)) { background-color: #452b33 !important; }
:global(.admin-shell.theme-dark .dashboard-content .approve-button) { border-color: #5b4aa9 !important; background-color: #6a56cf !important; color: #fff !important; }
:global(.admin-shell.theme-dark .dashboard-content .approve-button:hover:not(:disabled)) { background-color: #5643b9 !important; }
:global(.admin-shell.theme-dark .dashboard-content :is(.clear-filters, .text-action, .state-panel button, .feature-row a, .profile-facts dd a)) { color: var(--accent-dark) !important; }
:global(.admin-shell.theme-dark .dashboard-content :is(.feature-live, .coverage-item b, .summary-item .live-note)) { color: #a7dbba !important; }
:global(.admin-shell.theme-dark .dashboard-content :is(.summary-item .error-note, .error-state)) { color: #f0aab3 !important; }
:global(.admin-shell.theme-dark .dashboard-content .reason-form label) { color: var(--ink-soft) !important; }
:global(.admin-shell.theme-dark .dashboard-content .company-profile-state small) { color: var(--muted) !important; }
:global(.admin-shell.theme-dark .dashboard-content :is(.moderation-note:not(.suspended-note) p, .owner-state.blocked, .eligibility-note.blocked)) { color: #efd994 !important; }
:global(.admin-shell.theme-dark .dashboard-content :is(.suspended-note p, .suspended-note .detail-kicker)) { color: #f0aab3 !important; }
:global(.admin-shell.theme-dark .dashboard-content :is(.role-watch-panel, .pipeline-panel, .panel, .queue-panel, .detail-panel, .settings-section, .identity-panel, .company-list-panel, .account-list, .job-list, .log-list, .toolbar, .filter-bar, .matching-count, .company-row, .account-row, .job-row, .log-entry, .log-heading, .report-row, .report-parties, .facts-grid, .explanation-block p, .decision-note-card, .owner-card, .moderation-note, .scope-note, .profile-error, .state-panel, .layout-option, .scale-option, .profile-facts, .profile-long-text, .profile-entry-list, .profile-entry, .profile-language-list, .profile-language-list > div, .profile-resume, .profile-empty, .profile-chip-list > span, .job-details, .event-details, .event-details pre)) { box-shadow: none !important; }

:global(body:has(.admin-shell.theme-dark) .profile-dialog :is(.profile-alert, .notice.error, .profile-error, .error-state, .suspended-note)) { border-color: #68424b !important; background-color: #38242b !important; color: #f0aab3 !important; }
:global(body:has(.admin-shell.theme-dark) .profile-dialog :is(.profile-success, .notice.success, .profile-self-note, .open-to-work, .default-resume)) { border-color: #365e4c !important; background-color: #1d3329 !important; color: #a7dbba !important; }
:global(body:has(.admin-shell.theme-dark) .profile-dialog :is(.moderation-note:not(.suspended-note), .existing-reason, .owner-state.blocked, .eligibility-note.blocked)) { border-color: #625236 !important; background-color: #342d1f !important; color: #efd994 !important; }
:global(body:has(.admin-shell.theme-dark) .profile-dialog :is(.role-tag, .access-tag, .detail-label, .detail-subtle, .action-explainer, .owner-card > p, .company-facts dd, .profile-facts dd, .profile-long-text, .profile-entry-subtitle, .profile-entry-description, .profile-language-list span, .profile-resume small, .suspend-form label, .decision-form label)) { color: #b4bfd1 !important; }
:global(body:has(.admin-shell.theme-dark) .profile-dialog :is(.status-pill.pending, .status-pending, .status-open, .owner-state.blocked, .eligibility-note.blocked, .moderation-note:not(.suspended-note), .existing-reason)) { border-color: #625236 !important; background-color: #342d1f !important; color: #efd994 !important; }
:global(body:has(.admin-shell.theme-dark) .profile-dialog :is(.status-review, .status-in-review, .start-review, .profile-chip-list > span)) { border-color: #51478a !important; background-color: #2b2744 !important; color: #c6bcff !important; }
:global(body:has(.admin-shell.theme-dark) .profile-dialog :is(.status-pill.verified, .status-approved, .status-resolved, .owner-state.ready, .eligibility-note.ready, .access-tag.active)) { border-color: #365e4c !important; background-color: #1d3329 !important; color: #a7dbba !important; }
:global(body:has(.admin-shell.theme-dark) .profile-dialog :is(.status-pill.suspended, .status-rejected, .access-tag.suspended, .danger-button, .suspended-note)) { border-color: #68424b !important; background-color: #38242b !important; color: #f0aab3 !important; }
:global(body:has(.admin-shell.theme-dark) .profile-dialog :is(.status-hidden, .status-pill.hidden, .status-dismissed, .detail-tag, .job-meta span, .profile-self-note, .profile-empty)) { border-color: #2c3545 !important; background-color: #252e3c !important; color: #c1cada !important; }
:global(body:has(.admin-shell.theme-dark) .profile-dialog :is(.quiet-button, .profile-dialog-close)) { border-color: #455268 !important; background-color: #171e2a !important; color: #b4bfd1 !important; }
:global(body:has(.admin-shell.theme-dark) .profile-dialog .approve-button) { border-color: #5b4aa9 !important; background-color: #6a56cf !important; color: #fff !important; }
:global(body:has(.admin-shell.theme-dark) .profile-dialog :is(.text-action, .profile-facts dd a)) { color: #b8aaff !important; }

@media (max-width: 1180px) {
  .admin-shell { --sidebar-width: 214px; }
  .sidebar-is-collapsed.admin-shell { --sidebar-width: 82px; }
  .admin-sidebar { width: var(--sidebar-width); flex-basis: var(--sidebar-width); }
}
@media (max-width: 760px) {
  .admin-shell, .sidebar-is-collapsed.admin-shell { display: block; }
  .admin-sidebar, .sidebar-is-collapsed .admin-sidebar { position: fixed; inset: 0 auto 0 0; z-index: 50; width: min(84vw, 310px); height: 100dvh; min-height: 0; padding: 22px 16px; box-shadow: 18px 0 50px rgb(0 0 0 / 20%); transform: translateX(-105%); }
  .admin-sidebar.open { transform: translateX(0); }
  .admin-sidebar .sidebar-brand, .sidebar-is-collapsed .admin-sidebar .sidebar-brand { justify-content: space-between; flex-direction: row; padding: 0 7px 22px; }
  .sidebar-is-collapsed .admin-sidebar .mobile-close { transform: none; }
  .sidebar-dock-button { display: none; }
  .profile-menu, .sidebar-is-collapsed .profile-menu { right: 16px; bottom: 16px; left: 16px; width: auto; }
  .admin-sidebar .sidebar-label, .admin-sidebar .sidebar-link > span, .admin-sidebar .profile-copy, .admin-sidebar .sidebar-profile > :deep(.ui-icon) { display: initial; }
  .admin-sidebar .sidebar-link, .admin-sidebar .sidebar-profile { justify-content: flex-start; padding-inline: 12px; }
  .admin-sidebar .nav-count, .admin-sidebar .sidebar-profile > :deep(.ui-icon) { margin-left: auto; }
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
  .mobile-workspace-nav a { position: relative; min-width: max-content; padding: 0 10px; display: inline-flex; align-items: center; gap: 6px; color: var(--muted); text-decoration: none; font-size: 12px; font-weight: 500; }
  .mobile-workspace-nav a.selected { color: var(--accent-dark); font-weight: 600; }
  .mobile-workspace-nav a.selected::after { position: absolute; right: 10px; bottom: 0; left: 10px; height: 2px; background: var(--accent); content: ""; }
  .mobile-workspace-nav em { min-width: 17px; padding: 1px 4px; border-radius: 3px; background: var(--accent-soft); color: var(--accent-dark); font-size: 10px; font-style: normal; }
  .dashboard-content { padding: 22px 18px 48px; }
}
@media (max-width: 620px) {
  .dashboard-header { grid-template-columns: auto minmax(0, 1fr); }
  .header-actions { grid-column: 1 / -1; width: 100%; min-width: 0; }
  .header-search { width: auto; min-width: 0; flex: 1; justify-content: flex-start; padding: 0 12px; }
  .header-search input { display: block; }
  .header-search kbd { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; }
}
</style>
