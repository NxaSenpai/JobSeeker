<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import AccountPageFrame from '@/components/public/AccountPageFrame.vue'
import type { Job } from '@/data/catalog'
import { currentUser, displayNameForUser } from '@/services/auth'
import { apiRequest } from '@/services/api'
import { applicationDrafts, activityError, loadActivity, saveApplicationDraft } from '@/services/activity'
import { fileSize, type ApplicationRecord, type CandidateProfile, type ResumeRecord } from '@/services/candidate'
import { getPublicJob } from '@/services/publicCatalog'

const route = useRoute(); const router = useRouter()
const job = ref<Job | null>(null)
const resumes = ref<ResumeRecord[]>([])
const form = reactive({ description: '', coverLetter: '', resumeUrl: '', resumeId: '', phone: '', portfolioUrl: '', consent: false })
const dirty = ref(false); const loading = ref(true); const busy = ref(false); const uploading = ref(false)
const formReady = ref(false)
const error = ref(''); const success = ref(''); const existingApplication = ref<ApplicationRecord | null>(null)
const expired = computed(() => !!job.value?.deadline && new Date(job.value.deadline).getTime() <= Date.now())
let generation = 0
async function load() {
  const version = ++generation
  const jobId = String(route.params.id)
  loading.value = true; error.value = ''; success.value = ''; job.value = null; formReady.value = false; existingApplication.value = null; dirty.value = false
  try {
    const jobData = await getPublicJob(jobId)
    if (version !== generation) return
    job.value = jobData
    const [resumeData, profileData, applications] = await Promise.all([
      apiRequest<{ resumes: ResumeRecord[] }>('/account/resumes'),
      apiRequest<{ profile: CandidateProfile }>('/account/profile'),
      apiRequest<{ applications: ApplicationRecord[] }>(`/applications/me?jobId=${encodeURIComponent(jobId)}`),
      loadActivity(),
    ])
    if (version !== generation) return
    if (activityError.value) throw new Error(activityError.value)
    resumes.value = resumeData.resumes
    existingApplication.value = applications.applications.find(item => item.jobId === jobId) ?? null
    const draft = applicationDrafts.value.find(item => item.jobId === jobId)
    Object.assign(form, { description: draft?.description ?? '', coverLetter: draft?.coverLetter ?? '', resumeUrl: draft?.resumeUrl ?? '', resumeId: resumes.value.find(item => item.id === draft?.resumeId)?.id ?? resumes.value.find(item => item.isDefault)?.id ?? '', phone: draft?.phone ?? profileData.profile?.phone ?? '', portfolioUrl: draft?.portfolioUrl ?? profileData.profile?.websiteUrl ?? '', consent: false })
    formReady.value = true
  } catch (cause) { if (version === generation) error.value = cause instanceof Error ? cause.message : 'Unable to load the application form.' }
  finally { if (version === generation) loading.value = false }
}
watch(() => route.params.id, load, { immediate: true })
async function upload(event: Event) {
  const input = event.target as HTMLInputElement; const file = input.files?.[0]
  if (!file) return
  error.value = ''; success.value = ''
  if (file.type !== 'application/pdf' || file.size > 10 * 1024 * 1024) { error.value = 'Choose a PDF résumé up to 10 MB.'; input.value = ''; return }
  uploading.value = true
  try {
    const body = new FormData(); body.append('file', file)
    const { resume } = await apiRequest<{ resume: ResumeRecord }>('/account/resumes', { method: 'POST', body })
    resumes.value.unshift(resume); form.resumeId = resume.id; dirty.value = true; success.value = 'Résumé uploaded and selected. Submit the form when you are ready.'
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Unable to upload your résumé.' }
  finally { uploading.value = false; input.value = '' }
}
async function save() {
  if (!job.value || busy.value) return
  busy.value = true; error.value = ''; success.value = ''
  try {
    const { consent: _consent, ...draft } = form
    await saveApplicationDraft(job.value.id, { ...draft, resumeId: form.resumeId || null })
    dirty.value = false; success.value = 'Draft saved to your account. Nothing has been sent to the employer.'
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Unable to save your draft.' }
  finally { busy.value = false }
}
async function submit() {
  if (!job.value || busy.value || uploading.value) return
  busy.value = true; error.value = ''; success.value = ''
  try {
    const { resumeUrl: _link, ...data } = form
    const { application } = await apiRequest<{ application: ApplicationRecord }>(`/jobs/${encodeURIComponent(job.value.id)}/applications`, { method: 'POST', body: JSON.stringify(data) })
    dirty.value = false
    applicationDrafts.value = applicationDrafts.value.filter(item => item.jobId !== job.value?.id)
    await router.push({ path: `/applications/${application.id}`, query: { submitted: '1' } })
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Unable to submit your application.' }
  finally { busy.value = false }
}
function beforeUnload(event: BeforeUnloadEvent) { if (dirty.value) { event.preventDefault(); event.returnValue = '' } }
window.addEventListener('beforeunload', beforeUnload)
onBeforeUnmount(() => { generation++; window.removeEventListener('beforeunload', beforeUnload) })
onBeforeRouteLeave(() => !currentUser.value || !dirty.value || window.confirm('Leave without saving your application changes?'))
</script>

<template>
  <AccountPageFrame :title="loading ? 'Loading application…' : job ? 'Make your next move.' : 'Job not found'" description="Introduce yourself, choose your CV, and review your application before submitting.">
      <p v-if="loading" class="account-muted" role="status">Loading the current job and your application details…</p>
      <section v-else-if="!job" class="account-empty"><h2>This job is no longer available</h2><p>{{ error || 'The listing may have expired or been removed.' }}</p><button type="button" class="account-secondary mt-4" @click="load">Try again</button><router-link to="/jobs" class="account-primary mt-5">Browse jobs</router-link></section>
      <div v-else-if="!formReady" class="account-feedback account-error" role="alert">{{ error || 'We could not load your application details.' }} <button type="button" class="underline" @click="load">Try again</button></div>
      <section v-else-if="existingApplication" class="account-panel"><h2>You have already applied for this role</h2><p class="account-muted my-4">Your application and submitted CV are saved in your account.</p><router-link :to="`/applications/${existingApplication.id}`" class="account-primary">View application</router-link></section>
      <div v-else-if="job" class="application-layout">
        <aside class="account-panel role-summary">
          <img v-if="job.logo" :src="job.logo" :alt="`${job.company} logo`" class="mb-5 size-12 object-contain" loading="lazy" referrerpolicy="no-referrer" />
          <div v-else class="mb-5 grid size-12 place-items-center rounded-xl bg-[#f1efff] font-semibold text-[#6d58dd]" aria-hidden="true">{{ job.company.slice(0, 1).toUpperCase() }}</div>
          <p class="account-muted">{{ job.company }}</p><h2 class="mt-2">{{ job.title }}</h2><p class="account-muted mt-3">{{ job.location }} · {{ job.workplace }}</p>
          <router-link :to="`/jobs/${job.id}`" class="back-link mt-5 !mb-0">View job details →</router-link>
          <div v-if="currentUser" class="mt-6 border-t border-[#e6e1fa] pt-5"><p class="account-muted">Applying as</p><p class="mt-1 font-medium">{{ displayNameForUser(currentUser) }}</p><p class="account-muted break-all">{{ currentUser.email }}</p><router-link to="/profile" class="mt-3 inline-block text-sm text-[#6b58d4]">Update your profile</router-link></div>
          <p v-if="job.isDemo" class="account-notice mt-6">Sample listing. Your application is saved for testing; it is not sent to {{ job.company }}.</p>
          <p v-if="expired" class="account-feedback account-error mt-6">The application deadline has passed.</p>
        </aside>
        <form class="account-panel account-form" @submit.prevent="submit" @input="dirty = true; success = ''">
          <fieldset :disabled="busy || uploading || expired" class="application-fields">
            <div class="section-heading"><span>01</span><div><h2>Your introduction</h2><p class="account-muted">Tell the hiring team why this role fits you.</p></div></div>
            <label class="account-field">Application description <span class="required-label">Required</span><textarea v-model="form.description" rows="5" required minlength="20" maxlength="3000" placeholder="Describe your relevant experience, strengths, and interest in this role." /><small>{{ form.description.length }} / 3,000 characters · at least 20</small></label>
            <div class="account-form-row"><label class="account-field">Phone number<input v-model="form.phone" type="tel" autocomplete="tel" maxlength="40" placeholder="Optional" /></label><label class="account-field">Portfolio or website<input v-model="form.portfolioUrl" type="url" maxlength="2048" placeholder="https://…" /><small>Optional HTTPS link</small></label></div>
            <div class="section-heading"><span>02</span><div><h2>Your CV / résumé</h2><p class="account-muted">Select a saved document or upload a new version.</p></div></div>
            <label class="account-field">Select a résumé<select v-model="form.resumeId" required><option value="" disabled>Choose your PDF résumé</option><option v-for="resume in resumes" :key="resume.id" :value="resume.id">{{ resume.fileName }} · {{ fileSize(resume.fileSize) }}{{ resume.isDefault ? ' · Primary' : '' }}</option></select></label>
            <label class="upload-area"><strong>{{ uploading ? 'Uploading your CV…' : 'Upload a PDF résumé' }}</strong><span>PDF up to 10 MB. Also saved to your profile for future applications.</span><input type="file" accept="application/pdf,.pdf" @change="upload" /></label>
            <details v-if="form.resumeUrl" class="account-muted"><summary>Previous draft résumé link</summary><p class="mt-2 break-all">{{ form.resumeUrl }}</p><p>Upload a PDF above to include it in this application.</p></details>
            <div class="section-heading"><span>03</span><div><h2>A little more about you</h2><p class="account-muted">An optional cover letter can add useful context.</p></div></div>
            <label class="account-field">Cover letter<textarea v-model="form.coverLetter" rows="7" maxlength="10000" placeholder="Share an achievement, explain your career goals, or describe what you would bring to the team." /><small>{{ form.coverLetter.length.toLocaleString() }} / 10,000 characters</small></label>
            <label class="consent-field"><input v-model="form.consent" type="checkbox" required /><span>I confirm these details are accurate and agree to share my profile and selected CV for this application.</span></label>
          </fieldset>
          <p v-if="error" role="alert" class="account-feedback account-error">{{ error }}</p><p v-if="success" role="status" class="account-feedback">{{ success }}</p>
          <div class="application-actions"><button type="submit" class="account-primary" :disabled="busy || uploading || expired">{{ busy ? 'Saving…' : 'Submit application' }}</button><button type="button" class="account-secondary" :disabled="busy || uploading" @click="save">Save draft</button><span v-if="dirty" class="account-muted">Unsaved changes</span></div>
          <router-link to="/applications" class="text-sm text-[#6b58d4]">View applications and drafts →</router-link>
        </form>
      </div>
  </AccountPageFrame>
</template>

<style scoped>
.application-layout { display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 32px; align-items: start; }
.role-summary { background: #faf9ff; }.application-fields { display: grid; grid-template-columns: minmax(0, 1fr); min-width: 0; gap: 24px; border: 0; padding: 0; }
.section-heading { display: flex; gap: 14px; align-items: start; padding-top: 14px; }.section-heading > span { display: grid; place-items: center; width: 36px; height: 36px; flex-shrink: 0; border-radius: 10px; background: #eeeafa; color: #5c44cb; font-size: 12px; font-weight: 700; }.section-heading h2 { font-size: 20px; }
.required-label { color: #787390; font-size: 12px; font-weight: 400; }.upload-area { display: grid; gap: 10px; padding: 22px; border: 1px dashed #bcb1df; border-radius: 10px; background: #fcfbff; }.upload-area strong { font-size: 14px; }.upload-area span { font-size: 12px; color: #68759d; }.upload-area input { max-width: 100%; font-size: 13px; }
.consent-field { display: flex; gap: 12px; align-items: start; font-size: 13px; line-height: 1.7; color: #596484; }.consent-field input { margin-top: 5px; width: 17px; height: 17px; accent-color: #705aef; }.application-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; border-top: 1px solid #ece8f5; padding-top: 24px; }
@media(max-width: 800px) { .application-layout { grid-template-columns: 1fr; gap: 20px; } }
</style>
