<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import verifyLogo from '@/assets/img/verify_logo.png'
import CompanyPageHeader from '@/components/company/CompanyPageHeader.vue'
import { displayNameForUser, getAuthSession, initialsForUser } from '@/services/auth'
import { companyJobs } from '@/services/companyWorkspace'
import { readCompanySettings, saveCompanySettings, type CompanySettings } from '@/services/companySettings'

const user = getAuthSession()?.user
const settings = reactive<CompanySettings>(readCompanySettings(user))
const draft = reactive<CompanySettings>({ ...settings })
const editing = ref(false)
const saveError = ref('')
const saveSuccess = ref('')

const companyName = computed(() => settings.companyName.trim() || (user ? displayNameForUser(user) : 'Your company'))
const companyInitials = computed(() => settings.companyName.trim()
  ? settings.companyName.split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase()
  : user ? initialsForUser(user) : 'CO')
const hiringTeams = computed(() => [...new Set(companyJobs.value.filter(job => job.status === 'Published').map(job => job.team))].slice(0, 6))

function startEditing() {
  Object.assign(draft, settings)
  saveError.value = ''
  saveSuccess.value = ''
  editing.value = true
}

function cancelEditing() {
  Object.assign(draft, settings)
  saveError.value = ''
  editing.value = false
}

function saveProfile() {
  saveError.value = ''
  const next = { ...settings, ...draft }
  if (!saveCompanySettings(next)) {
    saveError.value = 'The company profile could not be saved in this browser.'
    return
  }
  Object.assign(settings, next)
  editing.value = false
  saveSuccess.value = 'Company profile updated.'
}
</script>

<template>
  <div class="company-profile-page">
    <CompanyPageHeader
      eyebrow="Account / Company profile"
      title="Company profile"
      description="Manage the company information candidates see."
    />

    <section class="profile-overview" aria-labelledby="company-profile-name">
      <div class="identity-row">
        <div class="identity-main">
          <div class="logo-wrap">
            <div class="company-logo" aria-hidden="true">{{ companyInitials }}</div>
            <img :src="verifyLogo" class="verification-mark" alt="Verified company" />
          </div>
          <div class="identity-copy">
            <h2 id="company-profile-name">{{ companyName }}</h2>
            <p>{{ settings.industry || 'Add your company industry' }}</p>
            <div class="identity-meta">
              <span><b aria-hidden="true">@</b>{{ settings.contactEmail || user?.email }}</span>
              <span><b aria-hidden="true">⌖</b>{{ settings.location || 'Location not added' }}</span>
              <span v-if="settings.website"><b aria-hidden="true">↗</b>{{ settings.website.replace(/^https?:\/\//, '') }}</span>
            </div>
          </div>
        </div>
        <button type="button" class="edit-button" @click="editing ? cancelEditing() : startEditing()">
          {{ editing ? 'Cancel' : 'Edit profile' }}
        </button>
      </div>

      <div class="fact-summary" aria-label="Company summary">
        <div><span>Industry</span><strong>{{ settings.industry || 'Not added' }}</strong></div>
        <div><span>Company size</span><strong>{{ settings.companySize || 'Not added' }}</strong></div>
        <div><span>Founded</span><strong>{{ settings.founded || 'Not added' }}</strong></div>
        <div><span>Location</span><strong>{{ settings.location || 'Not added' }}</strong></div>
      </div>
    </section>

    <p v-if="saveSuccess" class="save-message" role="status">{{ saveSuccess }}</p>

    <form v-if="editing" class="profile-card profile-edit-form" @submit.prevent="saveProfile">
      <header class="form-heading">
        <div><h3>Edit company profile</h3><p>All fields below are used in the company profile.</p></div>
      </header>

      <section class="form-section" aria-labelledby="company-identity-fields">
        <div class="section-heading"><h4 id="company-identity-fields">Company identity</h4></div>
        <div class="field-grid">
          <label>Company name<input v-model="draft.companyName" required maxlength="100" autocomplete="organization" /></label>
          <label>Industry<input v-model="draft.industry" maxlength="100" placeholder="Software, finance, healthcare" /></label>
          <label>Company size
            <select v-model="draft.companySize">
              <option value="">Select team size</option>
              <option>1–10 people</option><option>11–50 people</option><option>51–200 people</option>
              <option>201–500 people</option><option>501–1,000 people</option><option>1,001–5,000 people</option>
              <option>5,001+ people</option>
            </select>
          </label>
          <label>Founded<input v-model="draft.founded" inputmode="numeric" maxlength="4" placeholder="2020" /></label>
        </div>
      </section>

      <section class="form-section" aria-labelledby="company-about-fields">
        <div class="section-heading"><h4 id="company-about-fields">About the company</h4></div>
        <label class="standalone-field">
          Company description
          <textarea v-model="draft.description" rows="7" maxlength="1200" placeholder="Tell candidates what your company builds and what makes the work meaningful." />
          <small>{{ draft.description.length.toLocaleString() }} / 1,200</small>
        </label>
      </section>

      <section class="form-section" aria-labelledby="company-contact-fields">
        <div class="section-heading"><h4 id="company-contact-fields">Contact and location</h4></div>
        <div class="field-grid">
          <label>Website<input v-model="draft.website" type="url" placeholder="https://company.com" autocomplete="url" /></label>
          <label>Location<input v-model="draft.location" maxlength="100" placeholder="City, country" autocomplete="address-level2" /></label>
          <label>Public contact email<input v-model="draft.contactEmail" type="email" autocomplete="email" /></label>
          <label>Time zone
            <select v-model="draft.timezone"><option value="Asia/Phnom_Penh">Phnom Penh (UTC+7)</option><option value="Asia/Bangkok">Bangkok (UTC+7)</option><option value="Asia/Singapore">Singapore (UTC+8)</option><option value="UTC">UTC</option></select>
          </label>
        </div>
      </section>

      <p v-if="saveError" class="error-message" role="alert">{{ saveError }}</p>
      <footer class="form-actions"><button type="button" class="secondary-button" @click="cancelEditing">Discard</button><button type="submit" class="save-button">Save profile</button></footer>
    </form>

    <div v-else class="profile-layout">
      <section class="profile-card about-card" aria-labelledby="company-about-heading">
        <header class="card-heading"><h3 id="company-about-heading">About the company</h3><button type="button" @click="startEditing">Edit</button></header>
        <p v-if="settings.description">{{ settings.description }}</p>
        <div v-else class="empty-state">
          <div><strong>Add a clear company introduction</strong><p>Explain what the team builds, who it serves, and how people work together.</p></div>
          <button type="button" @click="startEditing">Add description</button>
        </div>
      </section>

      <aside class="side-column">
        <section class="profile-card details-card" aria-labelledby="company-details-heading">
          <header class="card-heading"><h3 id="company-details-heading">Company details</h3><button type="button" @click="startEditing">Edit</button></header>
          <dl>
            <div><dt>Website</dt><dd>{{ settings.website || 'Not added' }}</dd></div>
            <div><dt>Location</dt><dd>{{ settings.location || 'Not added' }}</dd></div>
            <div><dt>Public contact</dt><dd>{{ settings.contactEmail || user?.email }}</dd></div>
            <div><dt>Time zone</dt><dd>{{ settings.timezone }}</dd></div>
          </dl>
        </section>

        <section class="profile-card focus-card" aria-labelledby="hiring-focus-heading">
          <header class="card-heading"><h3 id="hiring-focus-heading">Hiring focus</h3><span class="count-chip">{{ hiringTeams.length }} teams</span></header>
          <div v-if="hiringTeams.length" class="team-chips"><span v-for="team in hiringTeams" :key="team">{{ team }}</span></div>
          <p v-else>Teams appear here when a job is published.</p>
        </section>

        <section class="profile-card status-card" aria-labelledby="company-status-heading">
          <header class="card-heading"><h3 id="company-status-heading">Company status</h3></header>
          <div class="verified-row"><span><strong>Verified company</strong><small>Identity confirmed by JobSeeker.</small></span><img :src="verifyLogo" alt="Verified" /></div>
        </section>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.company-profile-page { width: min(100%, 1500px); margin: 0 auto; color: #131b3d; }
.profile-overview, .profile-card { border: 1px solid #e8e5f2; border-radius: 12px; background: #fff; }
.profile-overview { overflow: hidden; }
.identity-row { display: flex; align-items: center; justify-content: space-between; gap: 36px; padding: 32px; }
.identity-main { display: flex; align-items: center; min-width: 0; gap: 19px; }
.logo-wrap { position: relative; width: fit-content; flex: 0 0 auto; }
.company-logo { display: grid; width: 92px; height: 92px; place-items: center; border: 1px solid #dcd6fb; border-radius: 20px; background: #eeebff; color: #4a31c7; font-size: 27px; font-weight: 700; }
.verification-mark { position: absolute; right: -4px; bottom: -3px; width: 20px; height: 20px; max-width: 20px; object-fit: contain; border: 2px solid #fff; border-radius: 50%; }
.identity-copy { min-width: 0; }
.identity-copy h2 { margin: 0; color: #101938; font-size: clamp(30px, 3vw, 39px); font-weight: 700; letter-spacing: -.04em; }
.identity-copy > p { margin: 7px 0 0; color: #505b7b; font-size: 16px; }
.identity-meta { display: flex; flex-wrap: wrap; gap: 8px 18px; margin-top: 12px; color: #737d99; font-size: 13px; }
.identity-meta span { display: inline-flex; align-items: center; gap: 6px; }
.identity-meta b { color: #543bd2; }
.edit-button, .save-button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-width: 220px; min-height: 45px; padding: 0 18px; border: 0; border-radius: 9px; background: #4930ce; color: #fff; font-size: 14px; font-weight: 700; cursor: pointer; }
.edit-button:hover, .save-button:hover { background: #3822b7; }
.fact-summary { display: grid; grid-template-columns: repeat(4, 1fr); margin: 0 26px 26px; border-radius: 10px; background: #f3f2fb; }
.fact-summary > div { display: grid; gap: 6px; min-width: 0; padding: 19px 23px; }
.fact-summary > div + div { border-left: 1px solid #dfdced; }
.fact-summary span { color: #69728d; font-size: 11px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; }
.fact-summary strong { overflow: hidden; color: #3724ba; font-size: 17px; text-overflow: ellipsis; white-space: nowrap; }
.save-message, .error-message { margin: 14px 0 0; padding: 11px 13px; border-radius: 8px; font-size: 12px; }
.save-message { background: #edf8f1; color: #367254; }
.error-message { background: #fff0f1; color: #a03f53; }
.profile-layout { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(310px, .8fr); gap: 22px; margin-top: 22px; }
.side-column { display: grid; align-content: start; gap: 22px; }
.profile-card { padding: 25px; }
.card-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; }
.card-heading h3 { margin: 0; color: #171f3e; font-size: 19px; font-weight: 700; letter-spacing: -.02em; }
.card-heading h3::before { display: inline-block; width: 5px; height: 20px; margin-right: 9px; border-radius: 9px; background: #5537df; content: ''; vertical-align: -3px; }
.card-heading button { border: 0; background: transparent; color: #402bc0; font-size: 12px; font-weight: 700; cursor: pointer; }
.about-card { min-height: 250px; }
.about-card > p { max-width: 78ch; margin: 22px 0 0; color: #36405d; font-size: 15px; line-height: 1.8; white-space: pre-line; }
.empty-state { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-top: 20px; padding: 22px; background: #f8f7fc; }
.empty-state strong { color: #2d3655; font-size: 14px; }
.empty-state p { margin: 5px 0 0; color: #78819b; font-size: 12px; line-height: 1.5; }
.empty-state button { border: 0; background: transparent; color: #402bc0; font-size: 12px; font-weight: 700; cursor: pointer; }
.details-card dl { display: grid; gap: 17px; margin: 20px 0 0; }
.details-card dl div { display: grid; gap: 5px; }
.details-card dt { color: #7e869e; font-size: 11px; }
.details-card dd { overflow-wrap: anywhere; margin: 0; color: #293250; font-size: 13px; font-weight: 600; }
.count-chip { padding: 5px 9px; border-radius: 99px; background: #efedff; color: #5039ce; font-size: 11px; font-weight: 600; }
.team-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 18px; }
.team-chips span { padding: 7px 10px; border-radius: 99px; background: #f0eeff; color: #4933c3; font-size: 11px; font-weight: 600; }
.focus-card > p { margin: 17px 0 0; color: #7a829b; font-size: 12px; }
.verified-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-top: 15px; padding: 14px; border-radius: 9px; background: #f5f3fc; }
.verified-row strong, .verified-row small { display: block; }
.verified-row strong { color: #28314f; font-size: 12px; }
.verified-row small { margin-top: 4px; color: #79819a; font-size: 10px; }
.verified-row img { width: 20px; height: 20px; max-width: 20px; object-fit: contain; }
.profile-edit-form { width: 100%; margin-top: 22px; padding: 0; overflow: hidden; }
.form-heading { padding: 25px 28px; border-bottom: 1px solid #ebe8f3; }
.form-heading h3 { margin: 0; color: #171f3e; font-size: 21px; font-weight: 700; }
.form-heading p { margin: 6px 0 0; color: #727c98; font-size: 13px; }
.form-section { display: grid; grid-template-columns: minmax(190px, .34fr) minmax(0, 1fr); gap: 34px; padding: 27px 28px; }
.form-section + .form-section { border-top: 1px solid #ebe8f3; }
.section-heading h4 { margin: 0; color: #27314f; font-size: 14px; font-weight: 700; }
.section-heading p { max-width: 220px; margin: 6px 0 0; color: #7a839d; font-size: 11px; line-height: 1.55; }
.field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 17px 19px; }
.field-grid label, .standalone-field { display: grid; gap: 7px; color: #4f5b7a; font-size: 12px; font-weight: 700; }
.field-grid input, .field-grid select, .standalone-field textarea { width: 100%; min-height: 43px; padding: 10px 12px; border: 1px solid #dcd8e9; border-radius: 8px; background: #fff; color: #252e4c; font: inherit; font-size: 13px; font-weight: 400; outline: 0; }
.standalone-field textarea { min-height: 150px; resize: vertical; line-height: 1.65; }
.standalone-field small { justify-self: end; color: #8a91a6; font-size: 10px; font-weight: 400; }
.field-grid :is(input, select):focus, .standalone-field textarea:focus { border-color: #745ee2; box-shadow: 0 0 0 3px #674cdc14; }
.form-actions { display: flex; align-items: center; justify-content: flex-end; gap: 10px; padding: 18px 28px; border-top: 1px solid #ebe8f3; background: #fcfbff; }
.secondary-button { min-height: 43px; padding: 0 17px; border: 1px solid #dcd7eb; border-radius: 8px; background: #fff; color: #4d5875; font-size: 13px; font-weight: 700; cursor: pointer; }
.save-button { min-width: 140px; }
@media (max-width: 880px) {
  .profile-layout { grid-template-columns: 1fr; }
  .side-column { grid-template-columns: repeat(2, 1fr); }
  .status-card { grid-column: 1 / -1; }
  .form-section { grid-template-columns: 1fr; gap: 18px; }
  .section-heading p { max-width: none; }
}
@media (max-width: 640px) {
  .identity-row { align-items: flex-start; flex-direction: column; padding: 22px; }
  .identity-main { align-items: flex-start; }
  .company-logo { width: 72px; height: 72px; font-size: 23px; }
  .identity-copy h2 { font-size: 29px; }
  .edit-button { width: 100%; min-width: 0; }
  .fact-summary { grid-template-columns: 1fr 1fr; margin: 0 13px 13px; }
  .fact-summary > div:nth-child(3) { border-left: 0; border-top: 1px solid #dfdced; }
  .fact-summary > div:nth-child(4) { border-top: 1px solid #dfdced; }
  .side-column, .field-grid { grid-template-columns: 1fr; }
  .status-card { grid-column: auto; }
  .profile-card { padding: 20px; }
  .profile-edit-form { padding: 0; }
  .form-heading, .form-section { padding: 21px 20px; }
  .form-actions { padding: 16px 20px; }
}
@media (max-width: 430px) {
  .identity-main { display: grid; }
  .fact-summary > div { padding: 13px; }
  .fact-summary strong { font-size: 14px; }
  .empty-state { align-items: flex-start; flex-direction: column; }
}
</style>
