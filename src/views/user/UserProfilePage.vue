<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { apiRequest } from '@/services/api'
import { applicationDrafts, savedJobIds } from '@/services/activity'
import {
  currentUser,
  displayNameForUser,
  initialsForUser,
  updateAuthUser,
  type AuthUser,
} from '@/services/auth'

const editing = ref(false)
const saving = ref(false)
const error = ref('')
const success = ref('')

const form = reactive({
  firstName: '',
  lastName: '',
  headline: '',
  location: '',
  bio: '',
})

const name = computed(() => currentUser.value ? displayNameForUser(currentUser.value) : 'Your profile')
const initials = computed(() => currentUser.value ? initialsForUser(currentUser.value) : 'JS')
const headline = computed(() => currentUser.value?.headline?.trim() || 'Add a headline to tell people what you do.')
const location = computed(() => currentUser.value?.location?.trim() || 'Location not added yet')
const bio = computed(() => currentUser.value?.bio?.trim() || '')
const profileSignals = computed(() => [
  { label: 'Your name', complete: Boolean(currentUser.value?.firstName?.trim() && currentUser.value?.lastName?.trim()) },
  { label: 'A professional headline', complete: Boolean(currentUser.value?.headline?.trim()) },
  { label: 'A short introduction', complete: Boolean(currentUser.value?.bio?.trim()) },
])
const profileProgress = computed(() => Math.round((profileSignals.value.filter(item => item.complete).length / profileSignals.value.length) * 100))

function syncForm(user: AuthUser | null) {
  form.firstName = user?.firstName ?? ''
  form.lastName = user?.lastName ?? ''
  form.headline = user?.headline ?? ''
  form.location = user?.location ?? ''
  form.bio = user?.bio ?? ''
}

watch(currentUser, (user) => {
  if (!editing.value) syncForm(user)
}, { immediate: true })

function startEditing() {
  error.value = ''
  success.value = ''
  syncForm(currentUser.value)
  editing.value = true
}

function cancelEditing() {
  error.value = ''
  syncForm(currentUser.value)
  editing.value = false
}

async function saveProfile() {
  if (saving.value) return
  error.value = ''
  success.value = ''
  saving.value = true

  try {
    const { user } = await apiRequest<{ user: AuthUser }>('/account/profile', {
      method: 'PATCH',
      body: JSON.stringify({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        headline: form.headline.trim(),
        location: form.location.trim(),
        bio: form.bio.trim(),
      }),
    })
    updateAuthUser(user)
    syncForm(user)
    editing.value = false
    success.value = 'Profile updated.'
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Unable to update your profile.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <main class="social-profile-page">
    <div v-if="currentUser" class="social-profile-shell">
      <router-link to="/jobs" class="profile-back-link">← Back to jobs</router-link>

      <section class="profile-header-shell">
        <div class="profile-cover">
          <div class="cover-orbit cover-orbit-one" aria-hidden="true"></div>
          <div class="cover-orbit cover-orbit-two" aria-hidden="true"></div>
          <div class="cover-grid" aria-hidden="true"></div>
          <div class="cover-copy">
            <span class="cover-kicker">Your profile</span>
          </div>
        </div>

        <section class="identity-card" aria-labelledby="profile-name">
          <div class="identity-main">
            <div class="profile-avatar" aria-hidden="true">{{ initials }}</div>
            <div class="identity-copy">
              <div class="identity-title-row">
                <h1 id="profile-name">{{ name }}</h1>
              </div>
              <p>{{ headline }}</p>
              <div class="identity-meta">
                <span>✉ {{ currentUser.email }}</span>
                <span>⌖ {{ location }}</span>
              </div>
            </div>
          </div>
          <button type="button" class="edit-profile-button" @click="editing ? cancelEditing() : startEditing()">
            {{ editing ? 'Cancel' : 'Edit profile' }}
          </button>
        </section>
      </section>

      <p v-if="success" class="profile-feedback success-feedback" role="status">{{ success }}</p>
      <p v-if="error && !editing" class="profile-feedback error-feedback" role="alert">{{ error }}</p>

      <div v-if="editing" class="profile-content edit-content">
        <form class="social-card edit-card" @submit.prevent="saveProfile">
          <div class="card-heading">
            <div>
              <span class="section-label">Profile details</span>
              <h2>Edit your profile</h2>
              <p>Keep it short and useful. These details help you present yourself clearly.</p>
            </div>
            <span class="edit-mark" aria-hidden="true">✎</span>
          </div>

          <div class="edit-fields">
            <label>First name<input v-model="form.firstName" required maxlength="100" autocomplete="given-name" /></label>
            <label>Last name<input v-model="form.lastName" required maxlength="100" autocomplete="family-name" /></label>
            <label class="wide-field">Professional headline<input v-model="form.headline" maxlength="160" placeholder="Product designer · Frontend developer · Student" /></label>
            <label class="wide-field">Location<input v-model="form.location" maxlength="160" autocomplete="address-level2" placeholder="City, country" /></label>
            <label class="wide-field">About you<textarea v-model="form.bio" rows="7" maxlength="2000" placeholder="Share a little about your experience, strengths, or the work you want to explore." /><small>{{ form.bio.length.toLocaleString() }} / 2,000 characters</small></label>
          </div>

          <p v-if="error" class="profile-feedback error-feedback" role="alert">{{ error }}</p>
          <div class="edit-actions">
            <button type="button" class="text-button" @click="cancelEditing">Discard changes</button>
            <button type="submit" class="primary-profile-button" :disabled="saving">{{ saving ? 'Saving…' : 'Save profile' }}</button>
          </div>
        </form>
      </div>

      <div v-else class="profile-content">
        <div class="profile-main-column">
          <section class="social-card about-card" aria-labelledby="about-heading">
            <div class="card-heading">
              <div><h2 id="about-heading">A little more about you</h2></div>
              <button type="button" class="small-edit-button" @click="startEditing">Edit</button>
            </div>
            <p v-if="bio" class="about-copy">{{ bio }}</p>
            <div v-else class="empty-about">
              <span class="empty-icon" aria-hidden="true">+</span>
              <div><strong>Your introduction is waiting</strong><p>Add a short introduction so your profile feels more like you.</p></div>
              <button type="button" class="text-link" @click="startEditing">Add introduction →</button>
            </div>
          </section>

          <section class="social-card activity-card" aria-labelledby="activity-heading">
            <div class="card-heading">
              <div><h2 id="activity-heading">Keep your search moving</h2></div>
              <span class="activity-pulse" aria-hidden="true"></span>
            </div>
            <div class="activity-list">
              <router-link to="/saved-jobs" class="activity-row">
                <span class="activity-icon bookmark-icon" aria-hidden="true">♡</span>
                <span><strong>Saved jobs</strong><small>Keep promising roles close while you decide.</small></span>
                <b>{{ savedJobIds.length }}</b>
              </router-link>
              <router-link to="/applications" class="activity-row">
                <span class="activity-icon draft-icon" aria-hidden="true">✎</span>
                <span><strong>Application drafts</strong><small>Pick up your private preparation whenever you’re ready.</small></span>
                <b>{{ applicationDrafts.length }}</b>
              </router-link>
            </div>
          </section>
        </div>

        <aside class="profile-side-column">
          <section class="social-card progress-card" aria-labelledby="progress-heading">
            <div class="progress-heading">
              <div><h2 id="progress-heading">{{ profileProgress }}% ready</h2></div>
              <div class="progress-ring" :style="{ '--progress': profileProgress * 3.6 + 'deg' }"><span>{{ profileProgress }}</span></div>
            </div>
            <p>Small details make it easier to remember what you bring to the table.</p>
            <ul class="profile-checklist">
              <li v-for="item in profileSignals" :key="item.label" :class="{ complete: item.complete }"><span aria-hidden="true">{{ item.complete ? '✓' : '○' }}</span>{{ item.label }}</li>
            </ul>
            <button type="button" class="text-link" @click="startEditing">Update profile →</button>
          </section>

          <section class="social-card account-card">
            <h2>Ready when you are</h2>
            <p>Your profile, saved jobs, and drafts are private to your account.</p>
            <router-link to="/companies" class="side-link">Explore company profiles <span>→</span></router-link>
            <router-link to="/jobs" class="side-link">Find your next role <span>→</span></router-link>
          </section>
        </aside>
      </div>
    </div>
    <div v-else class="profile-loading" role="status">Loading your profile…</div>
  </main>
</template>

<style scoped>
.social-profile-page { min-height: 78vh; background: #f5f4f8; padding: 34px 24px 86px; color: #17265a; }
.social-profile-shell { width: min(1120px, 100%); margin: 0 auto; }
.profile-back-link { display: inline-flex; margin: 0 0 22px; color: #6d5bd3; font-size: 14px; font-weight: 600; }
.profile-header-shell { overflow: hidden; border: 1px solid #e1deeb; border-radius: 22px; background: #fff; box-shadow: 0 14px 38px #17265a12; }
.profile-cover { position: relative; height: 244px; overflow: hidden; border-radius: 21px 21px 0 0; background: #132a73; }
.cover-grid { position: absolute; inset: 0; opacity: .18; background-image: linear-gradient(#aab9f4 1px, transparent 1px), linear-gradient(90deg, #aab9f4 1px, transparent 1px); background-size: 34px 34px; mask-image: linear-gradient(90deg, black, transparent 82%); }
.cover-orbit { position: absolute; border: 1px solid #aebcff; border-radius: 50%; opacity: .5; }
.cover-orbit-one { width: 420px; height: 420px; right: -70px; top: -200px; box-shadow: 0 0 0 26px #4864b633, 0 0 0 52px #4864b622; }
.cover-orbit-two { width: 250px; height: 250px; left: 45%; bottom: -205px; border-color: #7666ef; box-shadow: 0 0 0 18px #7666ef33, 0 0 0 36px #7666ef22; }
.cover-copy { position: absolute; bottom: 34px; left: 38px; color: #fff; }
.cover-kicker, .section-label { color: #7766ec; font-size: 11px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }
.cover-kicker { color: #c4c9ff; }
.cover-copy p { max-width: 290px; margin-top: 8px; color: #d5ddff; font-size: 14px; line-height: 1.6; }
.identity-card { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 24px; margin: -34px 24px 0; padding: 24px 28px 24px 22px; border-radius: 14px; background: #fff; }
.identity-main { min-width: 0; display: flex; align-items: center; gap: 18px; }
.profile-avatar { width: 96px; height: 96px; flex: 0 0 96px; display: grid; place-items: center; border: 6px solid #fff; border-radius: 50%; background: #e8e3ff; color: #5f4bd2; font-size: 26px; font-weight: 700; box-shadow: 0 6px 18px #17265a1a; }
.identity-copy { min-width: 0; }
.identity-title-row { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; }
.identity-title-row h1 { color: #12296f; font-size: clamp(25px, 4vw, 34px); font-weight: 700; letter-spacing: -.045em; line-height: 1.15; }
.identity-copy > p { margin-top: 7px; overflow: hidden; color: #68749b; font-size: 14px; text-overflow: ellipsis; white-space: nowrap; }
.verified-label { display: inline-flex; align-items: center; gap: 5px; padding: 5px 9px; border-radius: 6px; background: #eaf7f0; color: #317554; font-size: 11px; font-weight: 700; }
.verified-label span { display: grid; place-items: center; width: 14px; height: 14px; border-radius: 50%; background: #54a87a; color: white; font-size: 9px; }
.identity-meta { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 12px; color: #7b85a3; font-size: 12px; }
.edit-profile-button, .small-edit-button, .primary-profile-button, .text-button, .text-link { cursor: pointer; }
.edit-profile-button { flex: 0 0 auto; min-height: 42px; padding: 10px 17px; border: 1px solid #d8d2ee; border-radius: 8px; background: #fff; color: #5f4bd2; font-size: 13px; font-weight: 700; transition: background .18s, border-color .18s, transform .18s; }
.edit-profile-button:hover, .small-edit-button:hover { border-color: #9b8ce7; background: #f7f5ff; transform: translateY(-1px); }
.profile-navigation { display: flex; gap: 30px; min-height: 60px; padding: 0 30px; border-top: 1px solid #eeecf3; background: #fff; }
.profile-navigation a { display: inline-flex; align-items: center; gap: 7px; border-bottom: 2px solid transparent; color: #7a84a0; font-size: 13px; font-weight: 600; }
.profile-navigation a.active, .profile-navigation a.router-link-exact-active { border-color: #705aef; color: #5e4acc; }
.profile-navigation span { display: grid; min-width: 20px; height: 20px; place-items: center; padding: 0 5px; border-radius: 5px; background: #f0edff; color: #6d5bd3; font-size: 10px; }
.profile-content { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(260px, .65fr); gap: 22px; padding: 24px 0; }
.profile-main-column, .profile-side-column { display: grid; align-content: start; gap: 22px; }
.social-card { padding: 26px; border: 1px solid #e3e0eb; border-radius: 15px; background: #fff; box-shadow: 0 6px 20px #17265a08; }
.card-heading, .progress-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; }
.card-heading h2, .progress-heading h2 { margin-top: 0; color: #172b72; font-size: 20px; font-weight: 700; letter-spacing: -.025em; }
.card-heading p { max-width: 480px; margin-top: 8px; color: #77819f; font-size: 13px; line-height: 1.7; }
.small-edit-button { padding: 5px 7px; border: 0; border-radius: 5px; background: transparent; color: #6d5bd3; font-size: 12px; font-weight: 700; }
.about-copy { max-width: 640px; margin-top: 25px; color: #5f6d96; font-size: 15px; line-height: 1.9; white-space: pre-line; }
.empty-about { display: flex; align-items: center; gap: 14px; margin-top: 24px; padding: 16px; border-radius: 10px; background: #faf9ff; }
.empty-icon { display: grid; width: 34px; height: 34px; place-items: center; border: 1px dashed #bfb4f4; border-radius: 8px; color: #725fe0; font-size: 20px; }
.empty-about strong { color: #384678; font-size: 13px; }
.empty-about p { margin-top: 3px; color: #7b85a2; font-size: 12px; line-height: 1.5; }
.empty-about .text-link { margin-left: auto; }
.text-link { border: 0; background: transparent; color: #6d5bd3; font-size: 12px; font-weight: 700; white-space: nowrap; }
.text-link:hover, .side-link:hover { color: #3f2bb6; text-decoration: underline; }
.activity-pulse { width: 9px; height: 9px; margin: 5px 4px; border-radius: 50%; background: #6cb187; box-shadow: 0 0 0 5px #e5f5eb; }
.activity-list { display: grid; margin-top: 22px; }
.activity-row { display: grid; grid-template-columns: 38px minmax(0, 1fr) auto; align-items: center; gap: 14px; padding: 16px 0; border-top: 1px solid #eeecf3; }
.activity-row:hover strong { color: #6d5bd3; }
.activity-icon { display: grid; width: 38px; height: 38px; place-items: center; border-radius: 9px; background: #f0edff; color: #705be3; font-size: 21px; }
.draft-icon { font-size: 17px; }
.activity-row strong { display: block; color: #29396f; font-size: 14px; font-weight: 700; transition: color .15s; }
.activity-row small { display: block; margin-top: 4px; color: #7d87a3; font-size: 12px; line-height: 1.5; }
.activity-row b { color: #624cd4; font-size: 19px; font-weight: 700; font-variant-numeric: tabular-nums; }
.progress-card { background: #fbfaff; }
.progress-heading h2 { font-size: 23px; }
.progress-card > p { margin-top: 13px; color: #75809e; font-size: 12px; line-height: 1.7; }
.progress-ring { --progress: 0deg; position: relative; width: 54px; height: 54px; display: grid; place-items: center; border-radius: 50%; background: conic-gradient(#705aef var(--progress), #e7e3f4 0); }
.progress-ring::before { position: absolute; inset: 5px; border-radius: 50%; background: #fbfaff; content: ''; }
.progress-ring span { position: relative; color: #5f4bd2; font-size: 12px; font-weight: 700; }
.profile-checklist { display: grid; gap: 11px; margin: 20px 0; padding-top: 17px; border-top: 1px solid #e7e3f2; }
.profile-checklist li { display: flex; align-items: center; gap: 9px; color: #8490aa; font-size: 12px; }
.profile-checklist li span { color: #aab2c4; font-size: 16px; }
.profile-checklist li.complete { color: #3e6f58; }
.profile-checklist li.complete span { color: #4a9a70; }
.account-card h2 { margin-top: 0; color: #26376e; font-size: 18px; font-weight: 700; }
.account-card > p { margin-top: 9px; color: #7c86a3; font-size: 12px; line-height: 1.7; }
.side-link { display: flex; justify-content: space-between; gap: 15px; margin-top: 18px; padding-top: 14px; border-top: 1px solid #eeecf3; color: #6653c9; font-size: 12px; font-weight: 700; }
.side-link + .side-link { margin-top: 10px; }
.profile-feedback { margin-top: 20px; padding: 12px 15px; border-radius: 8px; font-size: 13px; line-height: 1.5; }
.success-feedback { background: #edf8f1; color: #357352; }
.error-feedback { background: #fff1f4; color: #a13d55; }
.edit-content { display: block; }
.edit-card { max-width: 830px; }
.edit-mark { display: grid; width: 35px; height: 35px; place-items: center; border-radius: 9px; background: #f0edff; color: #6d5bd3; font-size: 17px; }
.edit-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 27px; }
.edit-fields label { display: grid; gap: 8px; color: #394878; font-size: 12px; font-weight: 700; }
.edit-fields .wide-field { grid-column: 1 / -1; }
.edit-fields input, .edit-fields textarea { width: 100%; min-height: 45px; padding: 11px 13px; border: 1px solid #ded9ed; border-radius: 8px; background: #fff; color: #26396f; font-size: 14px; font-weight: 400; outline: 0; transition: border-color .18s, box-shadow .18s; }
.edit-fields textarea { resize: vertical; }
.edit-fields input:focus, .edit-fields textarea:focus { border-color: #8b7ce1; box-shadow: 0 0 0 4px #7b66ff14; }
.edit-fields small { color: #8891aa; font-size: 11px; font-weight: 400; }
.edit-actions { display: flex; align-items: center; justify-content: flex-end; gap: 22px; margin-top: 26px; padding-top: 20px; border-top: 1px solid #eeecf3; }
.text-button { border: 0; background: transparent; color: #7c86a2; font-size: 13px; }
.text-button:hover { color: #4f5e89; text-decoration: underline; }
.primary-profile-button { min-height: 43px; padding: 11px 19px; border: 0; border-radius: 8px; background: #705aef; color: white; font-size: 13px; font-weight: 700; transition: background .18s, transform .18s; }
.primary-profile-button:hover { background: #5f49d3; transform: translateY(-1px); }
.primary-profile-button:disabled { opacity: .6; cursor: wait; }
.profile-loading { min-height: 50vh; display: grid; place-items: center; color: #6f7b9c; font-size: 14px; }
:is(button, a, input, textarea):focus-visible { outline: 2px solid #7b66ff; outline-offset: 3px; }
@media (max-width: 780px) {
  .social-profile-page { padding: 24px 16px 64px; }
  .profile-cover { height: 190px; }
  .cover-copy { bottom: 24px; left: 24px; }
  .identity-card { align-items: flex-start; flex-direction: column; margin: -28px 14px 0; padding: 18px 8px 20px; }
  .profile-avatar { width: 78px; height: 78px; flex-basis: 78px; margin-top: -46px; font-size: 21px; }
  .identity-main { align-items: flex-start; gap: 13px; }
  .identity-copy > p { white-space: normal; }
  .edit-profile-button { align-self: stretch; }
  .profile-navigation { gap: 22px; padding: 0 20px; overflow-x: auto; }
  .profile-navigation a { min-height: 56px; white-space: nowrap; }
  .profile-content { grid-template-columns: 1fr; padding-top: 18px; }
}
@media (max-width: 500px) {
  .identity-meta { display: grid; gap: 6px; }
  .social-card { padding: 21px 18px; }
  .edit-fields { grid-template-columns: 1fr; gap: 17px; }
  .edit-fields .wide-field { grid-column: auto; }
  .empty-about { align-items: flex-start; flex-wrap: wrap; }
  .empty-about .text-link { width: 100%; margin-left: 48px; text-align: left; }
  .edit-actions { justify-content: space-between; gap: 12px; }
  .activity-row { gap: 10px; }
  .activity-row small { max-width: 190px; }
}
@media (prefers-reduced-motion: reduce) { .edit-profile-button, .primary-profile-button { transition: none; } }
</style>
