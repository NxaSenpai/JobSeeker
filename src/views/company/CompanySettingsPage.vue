<script setup lang="ts">
import { reactive, ref } from 'vue'
import CompanyPageHeader from '@/components/company/CompanyPageHeader.vue'
import { getAuthSession } from '@/services/auth'
import { readCompanySettings, saveCompanySettings, type CompanySettings } from '@/services/companySettings'

const user = getAuthSession()?.user
const settings = reactive<CompanySettings>(readCompanySettings(user))
const saved = ref(false)

function saveSettings() {
  saved.value = saveCompanySettings({ ...settings })
}
</script>

<template>
  <div class="company-page settings-page">
    <CompanyPageHeader eyebrow="Account / Settings" title="Company settings" description="Keep your company details and hiring notifications up to date." />

    <form class="settings-form" @submit.prevent="saveSettings">
      <section class="settings-section profile-section" aria-labelledby="company-profile-title">
        <div class="section-intro"><h3 id="company-profile-title">Company profile</h3><p>These details help candidates understand who is hiring.</p></div>
        <div class="field-grid">
          <label>Company name<input v-model="settings.companyName" required maxlength="100" autocomplete="organization" /></label>
          <label>Industry<input v-model="settings.industry" maxlength="100" placeholder="Software, finance, healthcare" /></label>
          <label>Company size<select v-model="settings.companySize"><option value="">Select team size</option><option>1–10 people</option><option>11–50 people</option><option>51–200 people</option><option>201–500 people</option><option>501–1,000 people</option><option>1,001–5,000 people</option><option>5,001+ people</option></select></label>
          <label>Founded<input v-model="settings.founded" inputmode="numeric" maxlength="4" placeholder="2020" /></label>
          <label>Website<input v-model="settings.website" type="url" placeholder="https://company.com" autocomplete="url" /></label>
          <label>Location<input v-model="settings.location" maxlength="100" placeholder="City, country" autocomplete="address-level2" /></label>
          <label>Public contact<input v-model="settings.contactEmail" type="email" autocomplete="email" /></label>
          <label class="field-wide">About the company<textarea v-model="settings.description" rows="4" maxlength="600" placeholder="What does your team work on?" /></label>
        </div>
      </section>

      <section class="settings-section hiring-section" aria-labelledby="hiring-preferences-title">
        <div class="section-intro"><h3 id="hiring-preferences-title">Hiring preferences</h3><p>Set the defaults used when you review new applications.</p></div>
        <div class="field-grid"><label>Primary contact<input v-model="settings.contactName" maxlength="100" autocomplete="name" placeholder="Hiring contact" /></label><label>Time zone<select v-model="settings.timezone"><option value="Asia/Phnom_Penh">Phnom Penh (UTC+7)</option><option value="Asia/Bangkok">Bangkok (UTC+7)</option><option value="Asia/Singapore">Singapore (UTC+8)</option><option value="UTC">UTC</option></select></label></div>
      </section>

      <section class="settings-section notification-section" aria-labelledby="notifications-title">
        <div class="section-intro"><h3 id="notifications-title">Email notifications</h3><p>Choose which hiring updates reach your inbox.</p></div>
        <label class="preference-row"><span><strong>New applications</strong><small>When someone applies to one of your published roles.</small></span><input v-model="settings.emailNewApplicant" type="checkbox" /></label>
        <label class="preference-row"><span><strong>Interview reminders</strong><small>A reminder before a scheduled candidate conversation.</small></span><input v-model="settings.emailInterviewReminder" type="checkbox" /></label>
        <label class="preference-row"><span><strong>Weekly hiring summary</strong><small>A short overview of activity from the previous week.</small></span><input v-model="settings.weeklySummary" type="checkbox" /></label>
      </section>

      <div class="settings-footer"><p v-if="saved" role="status">Saved on this device.</p><p v-else>Changes stay in this browser until company settings are connected to your account.</p><button class="save-button" type="submit">Save changes</button></div>
    </form>
  </div>
</template>

<style scoped>
.company-page { color: var(--ink); }
.settings-form { max-width: 920px; border: 1px solid var(--line); border-radius: 11px; background: #fff; box-shadow: 0 8px 24px rgb(11 43 130 / 4%); }
.settings-section { padding: 23px 26px 25px; }
.settings-section + .settings-section { border-top: 1px solid var(--line); }
.section-intro { margin-bottom: 19px; }
.section-intro h3 { margin: 0; color: var(--ink); font-size: 16px; font-weight: 600; }
.section-intro p { margin: 5px 0 0; color: var(--muted); font-size: 12px; line-height: 1.5; }
.field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px 18px; }
.field-grid label { min-width: 0; display: grid; gap: 7px; color: #52669e; font-size: 12px; font-weight: 600; }
.field-grid .field-wide { grid-column: 1 / -1; }
.field-grid input, .field-grid textarea, .field-grid select { width: 100%; min-height: 40px; padding: 9px 11px; border: 1px solid #dedaf0; border-radius: 7px; background: #fff; color: var(--ink); font: inherit; font-size: 13px; font-weight: 400; outline: 0; }
.field-grid textarea { resize: vertical; line-height: 1.6; }
.field-grid input::placeholder, .field-grid textarea::placeholder { color: #9aa4c2; }
.field-grid :is(input, textarea, select):focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgb(123 102 255 / 12%); }
.preference-row { min-height: 57px; padding: 10px 0; border-top: 1px solid #f0eef9; display: flex; align-items: center; justify-content: space-between; gap: 18px; cursor: pointer; }
.preference-row > span { display: grid; gap: 4px; }
.preference-row strong { color: var(--ink-soft); font-size: 13px; font-weight: 600; }
.preference-row small { color: var(--muted); font-size: 11px; }
.preference-row input { width: 16px; height: 16px; flex: 0 0 16px; accent-color: var(--accent); cursor: pointer; }
.settings-footer { min-height: 68px; padding: 13px 26px; border-top: 1px solid var(--line); display: flex; align-items: center; justify-content: space-between; gap: 18px; background: #fcfbff; }
.settings-footer p { margin: 0; color: var(--muted); font-size: 12px; line-height: 1.5; }
.save-button { min-height: 39px; padding: 0 15px; border: 0; border-radius: 7px; background: var(--accent); color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 160ms ease, transform 160ms ease; }
.save-button:hover { background: #6f5cf9; transform: translateY(-1px); }
@media (max-width: 620px) { .settings-section { padding: 19px 17px 21px; } .field-grid { grid-template-columns: 1fr; } .field-grid .field-wide { grid-column: auto; } .settings-footer { align-items: flex-start; flex-direction: column; padding: 14px 17px; } .save-button { align-self: flex-end; } }
</style>
