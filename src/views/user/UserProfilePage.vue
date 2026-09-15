<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { apiBlob, apiRequest } from '@/services/api'
import { applicationDrafts, savedJobIds } from '@/services/activity'
import { currentUser, displayNameForUser, initialsForUser, updateAuthUser, type AuthUser } from '@/services/auth'

type ResumeRecord = { id: string; fileName: string; mimeType: string; fileSize: number; isDefault: boolean; createdAt: string }

const editing = ref(false)
const saving = ref(false)
const error = ref('')
const success = ref('')
const resumes = ref<ResumeRecord[]>([])
const resumesLoading = ref(true)
const resumeUploading = ref(false)
const resumeError = ref('')
const resumeSuccess = ref('')
const previewUrl = ref('')
const previewFileName = ref('')
const skills = ref<string[]>([])
const skillInput = ref('')
const skillsSaving = ref(false)
const skillsError = ref('')
const skillSuggestions = ['TypeScript', 'Vue.js', 'NestJS', 'PostgreSQL', 'Python', 'English', 'Khmer']
const form = reactive({ firstName: '', lastName: '', headline: '', location: '', bio: '' })

const name = computed(() => currentUser.value ? displayNameForUser(currentUser.value) : 'Your profile')
const initials = computed(() => currentUser.value ? initialsForUser(currentUser.value) : 'JS')
const headline = computed(() => currentUser.value?.headline?.trim() || 'Add a professional headline')
const location = computed(() => currentUser.value?.location?.trim() || 'Location not added')
const bio = computed(() => currentUser.value?.bio?.trim() || '')
const profileCompletion = computed(() => {
  const details = [currentUser.value?.firstName, currentUser.value?.lastName, currentUser.value?.headline, currentUser.value?.location, currentUser.value?.bio]
  const completed = details.filter(value => value?.trim()).length + (skills.value.length ? 1 : 0) + (resumes.value.length ? 1 : 0)
  return Math.round(completed / 7 * 100)
})

function syncForm(user: AuthUser | null) {
  form.firstName = user?.firstName ?? ''
  form.lastName = user?.lastName ?? ''
  form.headline = user?.headline ?? ''
  form.location = user?.location ?? ''
  form.bio = user?.bio ?? ''
}

watch(currentUser, user => { if (!editing.value) syncForm(user) }, { immediate: true })

function startEditing() { error.value = ''; success.value = ''; syncForm(currentUser.value); editing.value = true }
function cancelEditing() { error.value = ''; syncForm(currentUser.value); editing.value = false }

async function saveProfile() {
  if (saving.value) return
  error.value = ''; success.value = ''; saving.value = true
  try {
    const { user } = await apiRequest<{ user: AuthUser }>('/account/profile', {
      method: 'PATCH',
      body: JSON.stringify({ firstName: form.firstName.trim(), lastName: form.lastName.trim(), headline: form.headline.trim(), location: form.location.trim(), bio: form.bio.trim() }),
    })
    updateAuthUser(user); syncForm(user); editing.value = false; success.value = 'Profile updated.'
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Unable to update your profile.' }
  finally { saving.value = false }
}

async function loadProfile() {
  try {
    const { user, profile } = await apiRequest<{ user: AuthUser; profile?: { skills?: string[] } }>('/account/profile')
    updateAuthUser(user); skills.value = profile?.skills ?? []
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Unable to load your profile.' }
}

async function saveSkills(nextSkills: string[]) {
  if (skillsSaving.value) return
  skillsSaving.value = true; skillsError.value = ''
  try {
    const response = await apiRequest<{ profile?: { skills?: string[] } }>('/account/profile', { method: 'PATCH', body: JSON.stringify({ skills: nextSkills }) })
    skills.value = response.profile?.skills ?? nextSkills
  } catch (cause) { skillsError.value = cause instanceof Error ? cause.message : 'Unable to update your skills.' }
  finally { skillsSaving.value = false }
}

function addSkill(value = skillInput.value) {
  const skill = value.trim()
  if (!skill) return
  if (skills.value.some(item => item.toLocaleLowerCase() === skill.toLocaleLowerCase())) { skillInput.value = ''; return }
  if (skills.value.length >= 30) { skillsError.value = 'You can add up to 30 skills.'; return }
  skillInput.value = ''; void saveSkills([...skills.value, skill])
}
function removeSkill(skill: string) { void saveSkills(skills.value.filter(item => item !== skill)) }

async function loadResumes() {
  resumesLoading.value = true; resumeError.value = ''
  try { resumes.value = (await apiRequest<{ resumes: ResumeRecord[] }>('/account/resumes')).resumes }
  catch (cause) { resumeError.value = cause instanceof Error ? cause.message : 'Unable to load your résumés.' }
  finally { resumesLoading.value = false }
}

async function uploadResume(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  resumeError.value = ''; resumeSuccess.value = ''
  if (file.type !== 'application/pdf') { resumeError.value = 'Choose a PDF file.'; input.value = ''; return }
  if (file.size > 10 * 1024 * 1024) { resumeError.value = 'Your PDF must be 10 MB or smaller.'; input.value = ''; return }
  resumeUploading.value = true
  const body = new FormData(); body.append('file', file)
  try {
    const { resume } = await apiRequest<{ resume: ResumeRecord }>('/account/resumes', { method: 'POST', body })
    resumes.value = [resume, ...resumes.value]; resumeSuccess.value = 'Résumé uploaded.'
  } catch (cause) { resumeError.value = cause instanceof Error ? cause.message : 'Unable to upload your résumé.' }
  finally { resumeUploading.value = false; input.value = '' }
}

async function previewResume(resume: ResumeRecord) {
  resumeError.value = ''; closePreview()
  try { const blob = await apiBlob(`/account/resumes/${resume.id}/preview`); previewUrl.value = URL.createObjectURL(blob); previewFileName.value = resume.fileName }
  catch (cause) { resumeError.value = cause instanceof Error ? cause.message : 'Unable to preview your résumé.' }
}
function closePreview() { if (previewUrl.value) URL.revokeObjectURL(previewUrl.value); previewUrl.value = ''; previewFileName.value = '' }

async function downloadResume(resume: ResumeRecord) {
  resumeError.value = ''
  try { const blob = await apiBlob(`/account/resumes/${resume.id}/download`); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = resume.fileName; link.click(); URL.revokeObjectURL(url) }
  catch (cause) { resumeError.value = cause instanceof Error ? cause.message : 'Unable to download your résumé.' }
}

async function makeDefault(resume: ResumeRecord) {
  resumeError.value = ''
  try { await apiRequest(`/account/resumes/${resume.id}/default`, { method: 'PATCH' }); resumes.value = resumes.value.map(item => ({ ...item, isDefault: item.id === resume.id })); resumeSuccess.value = 'Default résumé updated.' }
  catch (cause) { resumeError.value = cause instanceof Error ? cause.message : 'Unable to update your default résumé.' }
}

async function removeResume(resume: ResumeRecord) {
  if (!window.confirm(`Delete ${resume.fileName}?`)) return
  resumeError.value = ''; resumeSuccess.value = ''
  try { await apiRequest(`/account/resumes/${resume.id}`, { method: 'DELETE' }); resumes.value = resumes.value.filter(item => item.id !== resume.id); if (resume.isDefault && resumes.value[0]) resumes.value[0].isDefault = true; resumeSuccess.value = 'Résumé deleted.' }
  catch (cause) { resumeError.value = cause instanceof Error ? cause.message : 'Unable to delete your résumé.' }
}

function fileSize(value: number) { return value < 1024 * 1024 ? `${Math.max(1, Math.round(value / 1024))} KB` : `${(value / 1024 / 1024).toFixed(1)} MB` }

onMounted(() => { void loadProfile(); void loadResumes() })
onBeforeUnmount(closePreview)
</script>

<template>
  <main class="profile-page">
    <div v-if="currentUser" class="profile-shell">
      <router-link to="/jobs" class="back-link"><span aria-hidden="true">←</span> Back to jobs</router-link>

      <section class="profile-overview" aria-labelledby="profile-name">
        <div class="identity-row">
          <div class="identity-main">
            <div class="avatar-wrap">
              <div class="profile-avatar" aria-hidden="true">{{ initials }}</div>
            </div>
            <div class="identity-copy">
              <div class="name-row"><h1 id="profile-name">{{ name }}</h1></div>
              <p class="headline">{{ headline }}</p>
              <div class="identity-meta"><span><b aria-hidden="true">@</b>{{ currentUser.email }}</span><span><b aria-hidden="true">⌖</b>{{ location }}</span></div>
            </div>
          </div>
          <div class="overview-actions">
            <button type="button" class="edit-profile-button" @click="editing ? cancelEditing() : startEditing()">{{ editing ? 'Cancel' : 'Edit profile' }}</button>
          </div>
        </div>
        <nav class="profile-shortcuts" aria-label="Profile navigation">
          <div><span>Profile complete</span><strong>{{ profileCompletion }}%</strong></div>
          <router-link to="/saved-jobs"><span>Saved jobs</span><strong>{{ savedJobIds.length }}</strong></router-link>
          <router-link to="/applications"><span>Application drafts</span><strong>{{ applicationDrafts.length }}</strong></router-link>
          <div><span>Skills</span><strong>{{ skills.length }}</strong></div>
        </nav>
      </section>

      <p v-if="success" class="feedback success-feedback" role="status">{{ success }}</p>
      <p v-if="error && !editing" class="feedback error-feedback" role="alert">{{ error }}</p>

      <form v-if="editing" class="profile-card edit-card" @submit.prevent="saveProfile">
        <header class="card-heading"><div><h2>Edit profile</h2><p>Keep the details concise and useful to recruiters.</p></div></header>
        <div class="edit-fields">
          <label>First name<input v-model="form.firstName" required maxlength="100" autocomplete="given-name" /></label>
          <label>Last name<input v-model="form.lastName" required maxlength="100" autocomplete="family-name" /></label>
          <label class="wide-field">Professional headline<input v-model="form.headline" maxlength="160" placeholder="Product designer, frontend developer, student" /></label>
          <label class="wide-field">Location<input v-model="form.location" maxlength="160" autocomplete="address-level2" placeholder="City, country" /></label>
          <label class="wide-field">About you<textarea v-model="form.bio" rows="6" maxlength="2000" placeholder="Share your experience, strengths, and the work you want to explore." /><small>{{ form.bio.length.toLocaleString() }} / 2,000</small></label>
        </div>
        <p v-if="error" class="feedback error-feedback" role="alert">{{ error }}</p>
        <footer class="edit-actions"><button type="button" class="secondary-button" @click="cancelEditing">Discard</button><button type="submit" class="primary-button" :disabled="saving">{{ saving ? 'Saving…' : 'Save profile' }}</button></footer>
      </form>

      <div v-else class="profile-layout">
        <div class="main-column">
          <section class="profile-card about-card" aria-labelledby="about-heading">
            <header class="card-heading"><h2 id="about-heading">About me</h2><button type="button" class="quiet-button" @click="startEditing">Edit bio</button></header>
            <p v-if="bio" class="about-copy">{{ bio }}</p>
            <div v-else class="empty-state"><div><strong>Tell recruiters what you do best</strong><p>A focused introduction makes the rest of your profile easier to understand.</p></div><button type="button" class="text-link" @click="startEditing">Add an introduction</button></div>
          </section>

          <section class="profile-card search-card" aria-labelledby="search-heading">
            <header class="card-heading"><div><h2 id="search-heading">Your job search</h2><p>Resume your work without searching through account menus.</p></div></header>
            <div class="search-links">
              <router-link to="/saved-jobs"><span class="square-icon" aria-hidden="true">♡</span><span><strong>Saved jobs</strong><small>Review roles you want to compare.</small></span><b>{{ savedJobIds.length }}</b></router-link>
              <router-link to="/applications"><span class="square-icon" aria-hidden="true">✎</span><span><strong>Application drafts</strong><small>Continue an application you started.</small></span><b>{{ applicationDrafts.length }}</b></router-link>
            </div>
          </section>

          <section class="profile-card resume-card" aria-labelledby="resume-heading">
            <header class="card-heading resume-heading"><div><h2 id="resume-heading">Your résumés</h2><p>Choose the PDF used for direct job applications.</p></div><label class="primary-button upload-button" :class="{ disabled: resumeUploading }">{{ resumeUploading ? 'Uploading…' : 'Upload PDF' }}<input type="file" accept="application/pdf,.pdf" :disabled="resumeUploading" @change="uploadResume" /></label></header>
            <p v-if="resumeSuccess" class="feedback success-feedback" role="status">{{ resumeSuccess }}</p><p v-if="resumeError" class="feedback error-feedback" role="alert">{{ resumeError }}</p>
            <p v-if="resumesLoading" class="resume-empty">Loading your résumés…</p>
            <div v-else-if="resumes.length" class="resume-list"><article v-for="resume in resumes" :key="resume.id" class="resume-row"><span class="pdf-icon" aria-hidden="true">PDF</span><div class="resume-copy"><strong>{{ resume.fileName }}</strong><span>{{ fileSize(resume.fileSize) }}<b v-if="resume.isDefault">Default</b></span></div><div class="resume-actions"><button type="button" @click="previewResume(resume)">Preview</button><button type="button" @click="downloadResume(resume)">Download</button><button v-if="!resume.isDefault" type="button" @click="makeDefault(resume)">Set default</button><button type="button" class="danger-action" @click="removeResume(resume)">Delete</button></div></article></div>
            <label v-else class="resume-dropzone">Drag and drop is available from your browser, or <span>browse for a PDF</span><input type="file" accept="application/pdf,.pdf" :disabled="resumeUploading" @change="uploadResume" /></label>
          </section>
        </div>

        <aside class="side-column">
          <section class="profile-card skills-card" aria-labelledby="skills-heading">
            <header class="card-heading"><h2 id="skills-heading">Skills &amp; tech</h2><span class="count-chip">{{ skills.length }} added</span></header>
            <div class="skill-input-row"><label class="sr-only" for="skill-input">Add a skill, technology, or language</label><input id="skill-input" v-model="skillInput" maxlength="50" placeholder="Add a language or tool" :disabled="skillsSaving" @keydown.enter.prevent="addSkill()" /><button type="button" :disabled="skillsSaving || !skillInput.trim()" @click="addSkill()">Add</button></div>
            <p v-if="skillsError" class="feedback error-feedback" role="alert">{{ skillsError }}</p>
            <div v-if="skills.length" class="skill-chips" aria-label="Your skills"><span v-for="skill in skills" :key="skill"><span>{{ skill }}</span><button type="button" :aria-label="`Remove ${skill}`" :disabled="skillsSaving" @click="removeSkill(skill)">×</button></span></div><p v-else class="skills-empty">Add the tools and languages you use confidently.</p>
            <div class="suggestions"><small>Suggested</small><div><button v-for="suggestion in skillSuggestions" :key="suggestion" type="button" :disabled="skillsSaving || skills.some(skill => skill.toLocaleLowerCase() === suggestion.toLocaleLowerCase())" @click="addSkill(suggestion)">+ {{ suggestion }}</button></div></div>
          </section>

          <section class="profile-card preference-card" aria-labelledby="preference-heading">
            <header class="card-heading"><h2 id="preference-heading">Job preferences</h2><button type="button" class="quiet-button" @click="startEditing">Edit</button></header>
            <dl><div><dt>Desired role</dt><dd>{{ headline }}</dd></div><div><dt>Preferred location</dt><dd>{{ location }}</dd></div><div><dt>Availability</dt><dd><span class="ready-chip">Open to opportunities</span></dd></div></dl>
          </section>
        </aside>
      </div>
    </div>
    <div v-else class="profile-loading" role="status">Loading your profile…</div>
    <div v-if="previewUrl" class="preview-backdrop" role="dialog" aria-modal="true" :aria-label="`Preview ${previewFileName}`" @click.self="closePreview"><section class="preview-panel"><header><strong>{{ previewFileName }}</strong><button type="button" aria-label="Close résumé preview" @click="closePreview">×</button></header><iframe :src="previewUrl" :title="`Preview ${previewFileName}`"></iframe></section></div>
  </main>
</template>

<style scoped>
.profile-page { min-height: 80vh; padding: 24px 24px 80px; background: #f8f7fc; color: #131b3d; }
.profile-shell { width: min(1180px, 100%); margin: 0 auto; }
.back-link { display: inline-flex; align-items: center; gap: 7px; margin-bottom: 20px; color: #33406a; font-size: 13px; font-weight: 600; }
.back-link:hover { color: #553bd2; }
.profile-overview, .profile-card { border: 1px solid #ebe8f3; border-radius: 15px; background: #fff; }
.profile-overview { overflow: hidden; }
.identity-row { display: flex; align-items: center; justify-content: space-between; gap: 34px; padding: 30px; }
.identity-main { display: flex; align-items: center; min-width: 0; gap: 20px; }
.avatar-wrap { position: relative; width: fit-content; flex: 0 0 auto; }
.profile-avatar { display: grid; width: 92px; height: 92px; place-items: center; border: 1px solid #d8d1fb; border-radius: 50%; background: #ede9ff; color: #4c32c7; font-size: 27px; font-weight: 700; }
.identity-copy { min-width: 0; }
.name-row { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
.name-row h1 { margin: 0; color: #101938; font-size: clamp(28px, 3vw, 38px); font-weight: 700; letter-spacing: -.045em; line-height: 1.08; }
.availability { display: inline-flex; align-items: center; gap: 6px; padding: 5px 9px; border-radius: 999px; background: #efedff; color: #4f38cf; font-size: 11px; font-weight: 600; }
.availability i { width: 6px; height: 6px; border-radius: 50%; background: #6b55ee; }
.headline { margin: 7px 0 0; color: #35405f; font-size: 16px; line-height: 1.5; }
.identity-meta { display: flex; flex-wrap: wrap; gap: 8px 18px; margin-top: 10px; color: #6f7895; font-size: 12px; }
.identity-meta span { display: inline-flex; align-items: center; gap: 6px; }.identity-meta b { color: #5a43d8; }
.overview-actions { display: grid; min-width: 205px; gap: 11px; }
.edit-profile-button, .primary-button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 42px; padding: 0 15px; border: 0; border-radius: 9px; background: #4930ce; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; }
.edit-profile-button:hover, .primary-button:hover { background: #3822b7; }
.profile-shortcuts { display: grid; grid-template-columns: repeat(4, 1fr); margin: 0 24px 24px; border-radius: 10px; background: #f3f2fb; }
.profile-shortcuts > * { display: grid; gap: 4px; padding: 16px 22px; color: inherit; }.profile-shortcuts > * + * { border-left: 1px solid #dfdced; }
.profile-shortcuts span { color: #69728d; font-size: 10px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; }.profile-shortcuts strong { color: #3724ba; font-size: 17px; }.profile-shortcuts a:hover { background: #eeebff; }
.profile-layout { display: grid; grid-template-columns: minmax(0, 1.65fr) minmax(285px, .8fr); gap: 22px; margin-top: 22px; }
.main-column, .side-column { display: grid; align-content: start; gap: 22px; }.profile-card { padding: 22px; }
.card-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; }.card-heading h2 { margin: 0; color: #151d3c; font-size: 17px; font-weight: 700; letter-spacing: -.02em; }
.card-heading h2::before { display: inline-block; width: 5px; height: 18px; margin-right: 9px; border-radius: 9px; background: #5537df; content: ''; vertical-align: -3px; }.card-heading p { margin: 5px 0 0 14px; color: #727b96; font-size: 12px; line-height: 1.55; }
.quiet-button, .text-link { padding: 4px; border: 0; background: transparent; color: #3927b4; font-size: 11px; font-weight: 700; cursor: pointer; }
.about-copy { margin: 18px 0 0; color: #343d5b; font-size: 14px; line-height: 1.75; white-space: pre-line; }
.empty-state { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-top: 17px; padding: 17px; background: #f8f7fc; }.empty-state strong { color: #27304f; font-size: 13px; }.empty-state p { margin: 4px 0 0; color: #747d98; font-size: 12px; }
.search-links { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 17px; }.search-links a { display: grid; grid-template-columns: 36px minmax(0, 1fr) auto; align-items: center; gap: 11px; padding: 13px; border: 1px solid #ebe8f3; border-radius: 10px; }.search-links a:hover { border-color: #cfc7f7; background: #faf9ff; }
.square-icon { display: grid; width: 36px; height: 36px; place-items: center; border-radius: 8px; background: #eeebff; color: #4f35d4; font-size: 17px; }.search-links strong { display: block; color: #222b4a; font-size: 12px; }.search-links small { display: block; margin-top: 3px; color: #7a829b; font-size: 10px; }.search-links b { color: #4d35cd; font-size: 18px; }
.count-chip, .ready-chip { padding: 4px 8px; border-radius: 999px; background: #efedff; color: #5039ce; font-size: 10px; font-weight: 600; }
.skill-input-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; margin-top: 17px; border-radius: 8px; background: #f2f0fb; }.skill-input-row input { min-width: 0; padding: 10px 11px; border: 0; background: transparent; color: #242c4b; font-size: 12px; outline: 0; }.skill-input-row button { margin: 5px; padding: 0 10px; border: 0; border-radius: 6px; background: #4930ce; color: #fff; font-size: 11px; font-weight: 700; cursor: pointer; }
.skill-input-row button:disabled, .primary-button:disabled { cursor: not-allowed; opacity: .55; }.skill-chips { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 14px; }.skill-chips > span { display: inline-flex; align-items: center; gap: 5px; padding: 5px 8px; border-radius: 999px; background: #f0eeff; color: #4933c3; font-size: 10px; font-weight: 600; }.skill-chips button { border: 0; background: transparent; color: #6958c6; cursor: pointer; }
.skills-empty { margin: 14px 0 0; color: #7a829d; font-size: 11px; }.suggestions { margin-top: 18px; }.suggestions small { color: #8a91a6; font-size: 9px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }.suggestions div { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 8px; }.suggestions button { padding: 5px 8px; border: 0; border-radius: 999px; background: #f5f4fa; color: #5d6681; font-size: 10px; cursor: pointer; }.suggestions button:disabled { display: none; }
.preference-card dl { display: grid; gap: 15px; margin: 18px 0 0; }.preference-card dl div { display: grid; gap: 4px; }.preference-card dt { color: #777f99; font-size: 10px; }.preference-card dd { margin: 0; color: #262f4d; font-size: 12px; line-height: 1.5; }
.status-row { display: flex; align-items: center; justify-content: space-between; gap: 13px; margin-top: 12px; padding: 12px; border-radius: 9px; background: #f5f3fc; }.status-row strong, .status-row small { display: block; }.status-row strong { color: #28314f; font-size: 11px; }.status-row small { margin-top: 3px; color: #79819a; font-size: 9px; }.status-row > i { position: relative; width: 31px; height: 18px; flex: 0 0 31px; border-radius: 99px; background: #4f34da; }.status-row > i::after { position: absolute; top: 3px; right: 3px; width: 12px; height: 12px; border-radius: 50%; background: #fff; content: ''; }
.resume-heading { align-items: center; }.primary-button { min-height: 37px; }.upload-button { position: relative; flex: 0 0 auto; }.upload-button input, .resume-dropzone input { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }.resume-list { display: grid; gap: 10px; margin-top: 17px; }.resume-row { display: grid; grid-template-columns: 42px minmax(0, 1fr) auto; align-items: center; gap: 12px; padding: 13px; border-radius: 10px; background: #f4f3fb; }.pdf-icon { display: grid; width: 42px; height: 42px; place-items: center; border-radius: 8px; background: #e9e5ff; color: #4d34cf; font-size: 9px; font-weight: 800; }.resume-copy { min-width: 0; }.resume-copy strong { display: block; overflow: hidden; color: #232c4a; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }.resume-copy span { display: flex; align-items: center; gap: 7px; margin-top: 5px; color: #7b839c; font-size: 10px; }.resume-copy b { padding: 3px 6px; border-radius: 999px; background: #e9e5ff; color: #4c34c8; }.resume-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 5px; }.resume-actions button { padding: 6px; border: 0; background: transparent; color: #34405f; font-size: 10px; font-weight: 600; cursor: pointer; }.resume-actions .danger-action { color: #a44b61; }
.resume-empty { margin: 17px 0 0; padding: 20px; border: 1px dashed #d7d2e6; color: #7b829a; font-size: 12px; text-align: center; }.resume-dropzone { position: relative; display: block; margin-top: 12px; padding: 14px; border: 1px dashed #d8d2ef; border-radius: 9px; background: #faf9ff; color: #777f99; font-size: 11px; text-align: center; cursor: pointer; }.resume-dropzone span { color: #4630c7; text-decoration: underline; }
.edit-card { width: 100%; margin-top: 22px; }.edit-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px; }.edit-fields label { display: grid; gap: 7px; color: #4f5978; font-size: 11px; font-weight: 700; }.edit-fields .wide-field { grid-column: 1 / -1; }.edit-fields input, .edit-fields textarea { width: 100%; padding: 11px 12px; border: 1px solid #ddd9e9; border-radius: 8px; color: #222b4a; font: inherit; font-size: 12px; outline: 0; }.edit-fields textarea { resize: vertical; line-height: 1.6; }.edit-fields :is(input, textarea):focus { border-color: #7762e6; box-shadow: 0 0 0 3px #6a50dd14; }.edit-fields small { justify-self: end; color: #8a91a7; font-size: 9px; }.edit-actions { display: flex; justify-content: flex-end; gap: 9px; margin-top: 18px; padding-top: 16px; border-top: 1px solid #ece9f3; }.secondary-button { min-height: 37px; padding: 0 14px; border: 1px solid #ddd8ec; border-radius: 8px; background: #fff; color: #4a5472; font-size: 12px; font-weight: 700; cursor: pointer; }
.feedback { margin: 12px 0 0; padding: 10px 12px; border-radius: 8px; font-size: 11px; }.success-feedback { background: #edf8f1; color: #367254; }.error-feedback { background: #fff0f1; color: #a03f53; }.profile-loading { display: grid; min-height: 420px; place-items: center; color: #6f7892; }
.preview-backdrop { position: fixed; z-index: 100; inset: 0; display: grid; place-items: center; padding: 24px; background: #10162db8; }.preview-panel { width: min(960px, 100%); height: min(780px, 90vh); overflow: hidden; border-radius: 14px; background: #fff; }.preview-panel header { display: flex; align-items: center; justify-content: space-between; height: 54px; padding: 0 17px; border-bottom: 1px solid #e6e3ed; color: #232c4a; font-size: 12px; }.preview-panel header button { border: 0; background: transparent; color: #5d6680; font-size: 24px; cursor: pointer; }.preview-panel iframe { width: 100%; height: calc(100% - 54px); border: 0; }.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; }
@media (max-width: 900px) { .identity-row { align-items: flex-start; }.profile-layout { grid-template-columns: 1fr; }.overview-actions { min-width: 190px; }.side-column { grid-template-columns: repeat(2, 1fr); }.skills-card { grid-column: 1 / -1; } }
@media (max-width: 680px) { .profile-page { padding: 18px 14px 60px; }.identity-row { display: grid; padding: 21px; }.identity-main { align-items: flex-start; }.profile-avatar { width: 70px; height: 70px; font-size: 21px; }.name-row h1 { font-size: 26px; }.headline { font-size: 14px; }.overview-actions { width: 100%; grid-template-columns: 1fr; }.profile-shortcuts { grid-template-columns: 1fr 1fr; margin: 0 14px 14px; }.profile-shortcuts > *:nth-child(3) { border-left: 0; border-top: 1px solid #dfdced; }.profile-shortcuts > *:nth-child(4) { border-top: 1px solid #dfdced; }.profile-card { padding: 18px; }.search-links, .side-column, .edit-fields { grid-template-columns: 1fr; }.edit-fields .wide-field { grid-column: auto; }.resume-row { grid-template-columns: 42px minmax(0, 1fr); }.resume-actions { grid-column: 1 / -1; justify-content: flex-start; padding-top: 8px; border-top: 1px solid #e4e0ef; } }
@media (max-width: 430px) { .identity-main { display: grid; }.overview-actions { grid-template-columns: 1fr; }.profile-shortcuts > * { padding: 13px; }.resume-heading { align-items: flex-start; flex-direction: column; }.empty-state { align-items: flex-start; flex-direction: column; } }
</style>
