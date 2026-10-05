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
  { label: "Verification", to: "/admin/companies", icon: "building" },
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
        <BrandLogo variant="dark" :icon-only="sidebarCollapsed" />
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
            v-else-if="item.label === 'Verification' && pendingCompanyCount !== null && pendingCompanyCount > 0"
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

    <main id="admin-content" class="dashboard-main">
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
          <p class="eyebrow">Admin workspace</p>
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
:global(button), :global(input), :global(select) { font: inherit; }

.admin-shell { --sidebar-width: 218px; --ink: #19233c; --ink-soft: #40506b; --muted: #657088; --line: #e2e4e8; --line-strong: #c9ced7; --canvas: #f6f6f3; --surface: #fbfbf9; --surface-raised: #fff; --accent: #6a56cf; --accent-dark: #5643b9; --accent-soft: #f0eefb; min-height: 100dvh; display: flex; background: var(--canvas); color: var(--ink); font-family: "Outfit", "Bai Jamjuree", ui-sans-serif, system-ui, sans-serif; transition: background-color 220ms ease, color 220ms ease; }
.admin-shell.theme-dark { --ink: #edf1f7; --ink-soft: #b4bfd1; --muted: #8491a7; --line: #2c3545; --line-strong: #455268; --canvas: #121722; --surface: #171e2a; --surface-raised: #1c2533; --accent: #9a88f1; --accent-dark: #b8aaff; --accent-soft: #2b2744; }
:global(body:has(.admin-shell.theme-dark)) { background: #121722; color: #edf1f7; }
.sidebar-is-collapsed.admin-shell { --sidebar-width: 82px; }
.skip-link { position: fixed; top: 10px; left: 10px; z-index: 100; padding: 10px 14px; border-radius: 6px; background: var(--ink); color: #fff; transform: translateY(-160%); transition: transform 180ms ease; }
.skip-link:focus { transform: translateY(0); }
.admin-sidebar { position: sticky; top: 0; z-index: 20; width: var(--sidebar-width); height: 100dvh; flex: 0 0 var(--sidebar-width); padding: 24px 12px 18px; display: flex; flex-direction: column; overflow-y: auto; border-right: 1px solid var(--line); background: var(--surface); backdrop-filter: blur(18px); transition: width 220ms ease, flex-basis 220ms ease, transform 220ms ease, background-color 220ms ease; }
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
.header-search input::placeholder { color: #8994b6; }
.header-search kbd { padding: 2px 5px; border: 1px solid var(--line); border-radius: 4px; background: var(--accent-soft); color: #68759d; font-size: 11px; }
.mobile-menu-button, .mobile-close, .sidebar-backdrop, .mobile-workspace-nav { display: none; }
.dashboard-content { width: min(100%, 1480px); margin: 0 auto; padding: 20px clamp(24px, 3vw, 48px) 64px; }
.admin-shell :deep(button:focus-visible), .admin-shell :deep(a:focus-visible), .admin-shell :deep(input:focus-visible), .admin-shell :deep(select:focus-visible), .admin-shell :deep(textarea:focus-visible) { outline: 3px solid rgb(123 102 255 / 30%); outline-offset: 2px; }
.admin-shell :deep(button:active) { transform: translateY(1px); }

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
