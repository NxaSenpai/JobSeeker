<script setup lang="ts">
import { computed } from 'vue'
import AdminWorkspaceLayout from '@/components/admin/AdminWorkspaceLayout.vue'
import UiIcon from '@/components/company/UiIcon.vue'
import { useSidebarDock } from '@/composables/useSidebarDock'
import {
  adminDarkMode,
  adminPageScale,
  adminPageScaleOptions,
  setAdminDarkMode,
  setAdminPageScale,
  type AdminPageScale,
} from '@/services/adminPreferences'

const sidebarDocked = useSidebarDock('jobseeker.sidebar.docked.admin')
const selectedLayout = computed(() => sidebarDocked.value ? 'Docked' : 'Expanded')
const darkMode = computed({
  get: () => adminDarkMode.value,
  set: setAdminDarkMode,
})
const selectedPageScale = computed<AdminPageScale>({
  get: () => adminPageScale.value,
  set: setAdminPageScale,
})
const pageScaleLabels: Record<AdminPageScale, string> = {
  75: 'Smaller',
  100: 'Default',
  125: 'Large',
  150: 'Extra large',
}
</script>

<template>
  <AdminWorkspaceLayout title="Admin settings" :show-search="false">
    <section class="settings-page" aria-labelledby="settings-heading">
      <div class="page-intro">
        <p class="eyebrow">Account</p>
        <h2 id="settings-heading">Workspace settings</h2>
        <p>Adjust how the admin workspace is arranged and scaled on this browser.</p>
      </div>

      <section class="settings-section appearance-section" aria-labelledby="appearance-heading">
        <div class="settings-section-heading">
          <span class="section-icon"><UiIcon name="moon" :size="18" /></span>
          <div>
            <h3 id="appearance-heading">Appearance</h3>
            <p>Choose a lighter or darker look for the admin workspace.</p>
          </div>
        </div>
        <label class="preference-row">
          <span class="appearance-copy"><strong>Dark mode</strong><small>Use darker surfaces across admin pages while keeping the sidebar and content readable.</small></span>
          <span class="theme-switch">
            <input v-model="darkMode" type="checkbox" aria-label="Turn on admin dark mode" />
            <span class="theme-switch-track" aria-hidden="true"><span /></span>
          </span>
        </label>
      </section>

      <section class="settings-section settings-spaced" aria-labelledby="navigation-heading">
        <div class="settings-section-heading">
          <span class="section-icon"><UiIcon name="grid" :size="18" /></span>
          <div>
            <h3 id="navigation-heading">Navigation layout</h3>
            <p>Choose how much room the sidebar uses when you open the admin workspace.</p>
          </div>
        </div>

        <fieldset class="layout-options">
          <legend>Default sidebar width</legend>
          <label class="layout-option" :class="{ selected: sidebarDocked }">
            <input v-model="sidebarDocked" type="radio" name="sidebar-layout" :value="true" />
            <span class="radio-mark" aria-hidden="true" />
            <span class="option-copy"><strong>Docked</strong><small>Keep the sidebar compact and leave more room for content.</small></span>
            <span class="option-state">{{ selectedLayout === 'Docked' ? 'Selected' : '' }}</span>
          </label>
          <label class="layout-option" :class="{ selected: !sidebarDocked }">
            <input v-model="sidebarDocked" type="radio" name="sidebar-layout" :value="false" />
            <span class="radio-mark" aria-hidden="true" />
            <span class="option-copy"><strong>Expanded</strong><small>Keep navigation labels visible beside each icon.</small></span>
            <span class="option-state">{{ selectedLayout === 'Expanded' ? 'Selected' : '' }}</span>
          </label>
        </fieldset>
      </section>

      <section class="settings-section scale-section" aria-labelledby="scale-heading">
        <div class="settings-section-heading">
          <span class="section-icon"><UiIcon name="grid" :size="18" /></span>
          <div>
            <h3 id="scale-heading">Page scale</h3>
            <p>Resize the admin page content to make details easier to read. The sidebar stays at its normal size.</p>
          </div>
        </div>

        <fieldset class="scale-options">
          <legend>Admin page size</legend>
          <div class="scale-grid">
            <label
              v-for="scale in adminPageScaleOptions"
              :key="scale"
              class="scale-option"
              :class="{ selected: selectedPageScale === scale }"
            >
              <input v-model="selectedPageScale" type="radio" name="admin-page-scale" :value="scale" />
              <span class="scale-value">{{ scale }}%</span>
              <span class="scale-label">{{ pageScaleLabels[scale] }}</span>
              <span class="option-state">{{ selectedPageScale === scale ? 'Selected' : '' }}</span>
            </label>
          </div>
        </fieldset>
      </section>
    </section>
  </AdminWorkspaceLayout>
</template>

<style scoped>
.settings-page { max-width: 900px; margin: 6px auto 0; }
.page-intro { margin-bottom: 27px; }
.eyebrow { margin: 0 0 8px; color: #6555bf; font-size: 12px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; }
.page-intro h2 { margin: 0; color: #19233c; font-size: clamp(27px, 3vw, 36px); font-weight: 600; letter-spacing: -.04em; line-height: 1.1; }
.page-intro > p:last-child { margin: 9px 0 0; color: #657088; font-size: 14px; line-height: 1.5; }
.settings-section { padding: 25px 27px 22px; border: 1px solid #e2e4e8; border-radius: 9px; background: #fff; }
.settings-spaced, .scale-section { margin-top: 14px; }
.settings-section-heading { display: flex; align-items: flex-start; gap: 13px; }
.section-icon { width: 36px; height: 36px; flex: 0 0 auto; border-radius: 8px; display: grid; place-items: center; background: #f2efff; color: #5948b9; }
.settings-section-heading h3 { margin: 1px 0 4px; color: #19233c; font-size: 17px; font-weight: 600; letter-spacing: -.02em; }
.settings-section-heading p { max-width: 57ch; margin: 0; color: #657088; font-size: 13px; line-height: 1.5; }
.layout-options { min-width: 0; margin: 24px 0 0 49px; padding: 0; border: 0; }
.layout-options legend { margin-bottom: 8px; color: #596477; font-size: 11px; font-weight: 600; }
.layout-option { position: relative; min-height: 68px; padding: 12px 13px; border: 1px solid #e5e7eb; border-radius: 7px; display: flex; align-items: center; gap: 11px; cursor: pointer; transition: border-color 160ms ease, background 160ms ease; }
.layout-option + .layout-option { margin-top: 8px; }
.layout-option:hover { border-color: #c9c2ef; }
.layout-option.selected { border-color: #a99fe1; background: #faf9ff; }
.layout-option input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.radio-mark { width: 16px; height: 16px; flex: 0 0 auto; border: 1px solid #aeb5c0; border-radius: 50%; display: grid; place-items: center; background: #fff; }
.layout-option input:checked + .radio-mark { border-color: #6655c5; }
.layout-option input:checked + .radio-mark::after { width: 8px; height: 8px; border-radius: 50%; background: #6655c5; content: ''; }
.layout-option:focus-within { outline: 3px solid rgb(123 102 255 / 25%); outline-offset: 2px; }
.option-copy { min-width: 0; display: grid; gap: 3px; }
.option-copy strong { color: #26334b; font-size: 13px; font-weight: 600; }
.option-copy small { color: #707b8c; font-size: 11px; line-height: 1.45; }
.option-state { margin-left: auto; color: #5d4db2; font-size: 10px; font-weight: 600; white-space: nowrap; }
.storage-note { margin: 14px 0 0 49px; display: flex; align-items: center; gap: 7px; color: #7a8391; font-size: 11px; line-height: 1.5; }
.storage-note :deep(.ui-icon) { flex: 0 0 auto; }
.scale-options { min-width: 0; margin: 24px 0 0 49px; padding: 0; border: 0; }
.scale-options legend { margin-bottom: 8px; color: #596477; font-size: 11px; font-weight: 600; }
.scale-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.scale-option { position: relative; min-height: 76px; padding: 11px 12px; border: 1px solid #e5e7eb; border-radius: 7px; display: grid; align-content: center; gap: 3px; cursor: pointer; transition: border-color 160ms ease, background 160ms ease; }
.scale-option:hover { border-color: #c9c2ef; }
.scale-option.selected { border-color: #a99fe1; background: #faf9ff; }
.scale-option input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.scale-option:focus-within { outline: 3px solid rgb(123 102 255 / 25%); outline-offset: 2px; }
.scale-value { color: #26334b; font-size: 16px; font-weight: 650; }
.scale-label { color: #707b8c; font-size: 10px; }
.scale-option .option-state { position: absolute; top: 10px; right: 10px; margin: 0; font-size: 9px; }
.preference-row { min-height: 62px; margin-top: 16px; padding-top: 12px; border-top: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: space-between; gap: 18px; cursor: pointer; }
.appearance-copy { min-width: 0; display: grid; gap: 4px; }
.appearance-copy strong { color: #26334b; font-size: 13px; font-weight: 600; }
.appearance-copy small { max-width: 58ch; color: #707b8c; font-size: 11px; line-height: 1.45; }
.theme-switch { position: relative; width: 44px; height: 25px; flex: 0 0 44px; display: block; }
.theme-switch input { position: absolute; inset: 0; z-index: 1; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: pointer; }
.theme-switch-track { position: absolute; inset: 0; border-radius: 999px; display: block; background: #c9ced7; transition: background 180ms ease; }
.theme-switch-track span { position: absolute; top: 4px; left: 4px; width: 17px; height: 17px; border-radius: 50%; background: #fff; box-shadow: 0 2px 5px rgb(22 30 50 / 18%); transition: transform 180ms ease; }
.theme-switch input:checked + .theme-switch-track { background: #6a56cf; }
.theme-switch input:checked + .theme-switch-track span { transform: translateX(19px); }
.theme-switch input:focus-visible + .theme-switch-track { outline: 3px solid rgb(123 102 255 / 30%); outline-offset: 3px; }
:global(.admin-shell.theme-dark .theme-switch-track) { background: #455268; }
:global(.admin-shell.theme-dark .theme-switch input:checked + .theme-switch-track) { background: #9a88f1; }
.scope-note { margin-top: 18px; padding: 15px 17px; border-left: 2px solid #c9c2ef; display: grid; gap: 4px; background: #f1f1ee; }
.scope-note strong { color: #37435a; font-size: 12px; font-weight: 600; }
.scope-note span { max-width: 78ch; color: #687385; font-size: 11px; line-height: 1.55; }
@media (max-width: 600px) {
  .settings-page { margin-top: 0; }
  .settings-section { padding: 20px 17px; }
  .layout-options, .scale-options, .storage-note { margin-left: 0; }
  .option-state { display: none; }
  .scale-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
