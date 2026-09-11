<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BrandLogo from './BrandLogo.vue'
import UiIcon from '@/components/company/UiIcon.vue'
import { currentUser, clearAuthSession, dashboardPathForRole, displayNameForUser, initialsForUser, isJobSeeker } from '@/services/auth'
import { savedJobIds, applicationDrafts } from '@/services/activity'

const route = useRoute()
const router = useRouter()
const isOpen = ref(false)
const profileOpen = ref(false)
const header = ref<HTMLElement>()
const profileButton = ref<HTMLButtonElement>()
const profileMenu = ref<HTMLElement>()
const name = computed(() => currentUser.value ? displayNameForUser(currentUser.value) : '')
const initials = computed(() => currentUser.value ? initialsForUser(currentUser.value) : '')
const links = [{ label: 'Find Jobs', to: '/jobs' }, { label: 'Companies', to: '/companies' }]
const accountLinks = computed(() => !currentUser.value ? [] : isJobSeeker.value ? [
  { label: 'View profile', to: '/profile', count: undefined },
  { label: 'Saved jobs', to: '/saved-jobs', count: savedJobIds.value.length },
  { label: 'Application drafts', to: '/applications', count: applicationDrafts.value.length },
] : [{ label: currentUser.value.role === 'ADMIN' ? 'Admin dashboard' : 'Company dashboard', to: dashboardPathForRole(currentUser.value.role), count: undefined }])

function closeMenus() { isOpen.value = false; profileOpen.value = false }
async function openProfile() {
  profileOpen.value = !profileOpen.value
  isOpen.value = false
  if (profileOpen.value) {
    await nextTick()
    profileMenu.value?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
  }
}
function menuKeydown(event: KeyboardEvent) {
  const items = Array.from(profileMenu.value?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
  const index = items.indexOf(document.activeElement as HTMLElement)
  let target: number
  if (event.key === 'ArrowDown') target = (index + 1) % items.length
  else if (event.key === 'ArrowUp') target = (index - 1 + items.length) % items.length
  else if (event.key === 'Home') target = 0
  else if (event.key === 'End') target = items.length - 1
  else return
  event.preventDefault()
  items[target]?.focus()
}
function outsideClick(event: PointerEvent) { if (!header.value?.contains(event.target as Node)) closeMenus() }
function escape(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  if (profileOpen.value) { closeMenus(); profileButton.value?.focus() }
  else isOpen.value = false
}
function focusOut(event: FocusEvent) {
  if (event.relatedTarget && !header.value?.contains(event.relatedTarget as Node)) closeMenus()
}
async function signOut() {
  closeMenus()
  // Leave protected content before clearing the session, so the expiry guard
  // does not compete with this deliberate navigation back home.
  try { await router.replace('/') } finally { clearAuthSession() }
}
watch(() => route.fullPath, closeMenus)
watch(currentUser, (user) => { if (!user) closeMenus() })
onMounted(() => { document.addEventListener('pointerdown', outsideClick); document.addEventListener('keydown', escape) })
onBeforeUnmount(() => { document.removeEventListener('pointerdown', outsideClick); document.removeEventListener('keydown', escape) })
</script>

<template>
  <header ref="header" data-no-reveal class="site-header" @focusout="focusOut">
    <nav class="header-inner" aria-label="Main navigation">
      <BrandLogo />
      <div class="desktop-links">
        <router-link v-for="link in links" :key="link.to" :to="link.to">{{ link.label }}</router-link>
      </div>
      <div class="header-actions">
        <template v-if="!currentUser">
          <router-link to="/register" class="join-link">Create account</router-link>
          <router-link to="/login" class="sign-in">Sign In</router-link>
        </template>
        <div v-else class="profile-control">
          <button ref="profileButton" class="profile-button" type="button" aria-label="Open account menu" aria-haspopup="menu" aria-controls="account-menu" :aria-expanded="profileOpen" @click="openProfile" @keydown.down.prevent="!profileOpen && openProfile()">
            <span class="avatar" aria-hidden="true">{{ initials }}</span>
          </button>
          <Transition name="dropdown">
            <div v-if="profileOpen" id="account-menu" ref="profileMenu" role="menu" aria-label="Your account" class="account-menu" @keydown="menuKeydown">
              <div class="account-identity">
                <strong>{{ name }}</strong>
                <span>{{ currentUser.email }}</span>
              </div>
              <router-link v-for="link in accountLinks" :key="link.to" :to="link.to" role="menuitem" tabindex="-1" class="menu-item">
                {{ link.label }}<span v-if="link.count !== undefined" class="menu-count">{{ link.count }}</span>
              </router-link>
              <button type="button" role="menuitem" tabindex="-1" class="menu-item sign-out" @click="signOut">Sign out <span aria-hidden="true">↗</span></button>
            </div>
          </Transition>
        </div>
        <button type="button" class="mobile-toggle" aria-label="Toggle navigation" aria-controls="mobile-navigation" :aria-expanded="isOpen" @click="isOpen = !isOpen; profileOpen = false"><UiIcon :name="isOpen ? 'close' : 'menu'" /></button>
      </div>
    </nav>
    <nav v-if="isOpen" id="mobile-navigation" class="mobile-navigation" aria-label="Mobile navigation">
      <router-link v-for="link in links" :key="link.to" :to="link.to">{{ link.label }}</router-link>
      <router-link v-if="!currentUser" to="/register">Create account</router-link>
    </nav>
  </header>
</template>

<style scoped>
.site-header { position: sticky; top: 0; z-index: 60; background: rgb(255 255 255 / 96%); border-bottom: 1px solid #e6e1fa; backdrop-filter: blur(16px); color: #0b2b82; }
.header-inner { max-width: 1440px; margin: auto; padding: 20px clamp(24px, 7.5vw, 108px); display: flex; align-items: center; gap: 40px; }
.desktop-links { display: flex; gap: 32px; font-size: 14px; font-weight: 500; white-space: nowrap; }
.desktop-links a:hover, .desktop-links .router-link-active, .join-link:hover { color: #7b66ff; }
.header-actions { display: flex; align-items: center; gap: 20px; margin-left: auto; }
.join-link { white-space: nowrap; font-size: 14px; font-weight: 500; }
.sign-in { padding: 11px 20px; border-radius: 8px; background: #7b66ff; color: white; font-size: 14px; font-weight: 600; white-space: nowrap; }
.sign-in:hover { background: #6954e5; }
.profile-control { position: relative; }
.profile-button { display: flex; align-items: center; gap: 11px; cursor: pointer; border-radius: 30px; text-align: left; }
.avatar { width: 44px; height: 44px; flex-shrink: 0; display: grid; place-items: center; border-radius: 50%; background: #eeeaff; border: 1px solid #d9d0ff; color: #6449dc; font-size: 14px; font-weight: 700; }
.profile-name { display: grid; gap: 2px; max-width: 150px; font-size: 14px; font-weight: 600; }
.profile-name > span { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.profile-name small { color: #68759d; font-size: 11px; font-weight: 400; }
.profile-chevron { transform: rotate(90deg); transition: transform .16s; }
.profile-chevron.expanded { transform: rotate(-90deg); }
.account-menu { position: absolute; right: 0; top: calc(100% + 18px); width: min(300px, calc(100vw - 40px)); padding: 8px; border: 1px solid #e6e1fa; border-radius: 16px; background: white; box-shadow: 0 16px 48px rgb(26 30 80 / 14%); }
.account-identity { padding: 12px 12px 16px; margin-bottom: 5px; border-bottom: 1px solid #efedf7; display: grid; gap: 4px; overflow-wrap: anywhere; }
.account-identity strong { font-size: 15px; }
.account-identity span { font-size: 12px; color: #68759d; }
.account-identity small { margin-top: 5px; font-size: 11px; color: #7561d9; }
.menu-item { display: flex; align-items: center; justify-content: space-between; width: 100%; min-height: 44px; padding: 11px 12px; border-radius: 8px; font-size: 14px; text-align: left; cursor: pointer; }
.menu-item:hover, .menu-item:focus { background: #f3f0ff; }
.menu-count { min-width: 23px; padding: 1px 6px; border-radius: 5px; background: #eeeaff; font-size: 11px; text-align: center; }
.sign-out { margin-top: 6px; border-top: 1px solid #efedf7; color: #a33f55; }
button:focus-visible, a:focus-visible { outline: 2px solid #7b66ff; outline-offset: 3px; }
.mobile-toggle { display: none; width: 44px; height: 44px; place-items: center; border: 1px solid #e6e1fa; border-radius: 8px; cursor: pointer; }
.mobile-navigation { position: absolute; left: 0; right: 0; top: 100%; display: grid; padding: 16px 24px; background: #f9f8ff; border-bottom: 1px solid #e6e1fa; box-shadow: 0 12px 20px #0b2b8210; }
.mobile-navigation a { padding: 14px 8px; border-radius: 8px; }
.dropdown-enter-active, .dropdown-leave-active { transition: opacity .15s, transform .15s; }
.dropdown-enter-from, .dropdown-leave-to { opacity: 0; transform: translateY(-5px); }
@media (max-width: 1023px) { .desktop-links { display: none; } .mobile-toggle { display: grid; } .header-inner { gap: 20px; } }
@media (max-width: 639px) { .header-inner { padding: 16px 20px; gap: 12px; } .header-actions { gap: 10px; } .join-link, .profile-name, .profile-chevron { display: none; } .account-menu { right: -54px; } .sign-in { padding: 11px 14px; } }
@media (max-width: 359px) { .header-inner { padding: 14px 16px; gap: 8px; } }
@media (prefers-reduced-motion: reduce) { .dropdown-enter-active, .dropdown-leave-active, .profile-chevron { transition: none; } }
</style>
