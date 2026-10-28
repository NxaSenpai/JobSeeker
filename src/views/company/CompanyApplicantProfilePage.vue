<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UiIcon from '@/components/company/UiIcon.vue'
import InterviewScheduleForm from '@/components/company/InterviewScheduleForm.vue'
import {
  allowedApplicantStatusChanges,
  applicantAvatarColor,
  applicantInitials,
  applicantName,
  applicantStatusClass,
  applicantStatusLabel,
  downloadCompanyApplicantAvatar,
  downloadCompanyApplicantResume,
  fetchCompanyApplicant,
  saveCompanyApplicantStatus,
  type ApplicantStatus,
  type CompanyApplicantDetails,
} from '@/services/companyApplicants'
import {
  relativeApplicationDate,
} from '@/services/companyWorkspace'

const route = useRoute()
const router = useRouter()
const application = ref<CompanyApplicantDetails | null>(null)
const loading = ref(true)
const loadError = ref('')
const statusError = ref('')
const statusMessage = ref('')
const statusSaving = ref(false)
const interviewScheduleOpen = ref(false)
const resumeError = ref('')
const resumeLoading = ref(false)
const resumePreviewUrl = ref('')
const candidateAvatarUrl = ref('')
const resumePreviewLoading = ref(false)
const resumePreviewError = ref('')
const showCandidateProfile = ref(route.query.view === 'profile')
let loadSequence = 0
let resumePreviewSequence = 0
let candidateAvatarSequence = 0

const statusOptions = computed(() => application.value
  ? [application.value.status, ...allowedApplicantStatusChanges(application.value.status)]
  : [])
const fullName = computed(() => application.value ? applicantName(application.value) : 'Candidate')
const initials = computed(() => application.value ? applicantInitials(application.value) : '')
const avatarColor = computed(() => application.value ? applicantAvatarColor(application.value.id) : 'blue')
const location = computed(() => application.value?.candidate.location || application.value?.job.location || 'Not provided')
const candidateSkills = computed(() => application.value?.candidate.skills ?? [])
const candidateExperiences = computed(() => application.value?.candidate.experience ?? [])
const candidateEducation = computed(() => application.value?.candidate.education ?? [])
const candidateLanguages = computed(() => application.value?.candidate.languages ?? [])
const candidateLinks = computed(() => {
  const candidate = application.value?.candidate
  return [
    { label: 'Website', url: candidate?.websiteUrl },
    { label: 'LinkedIn', url: candidate?.linkedinUrl },
    { label: 'GitHub', url: candidate?.githubUrl },
  ].filter((link): link is { label: string; url: string } => typeof link.url === 'string' && Boolean(link.url.trim()))
})

async function loadApplication() {
  const sequence = ++loadSequence
  const id = String(route.params.id ?? '')
  showCandidateProfile.value = route.query.view === 'profile'
  clearResumePreview()
  clearCandidateAvatar()
  application.value = null
  loading.value = true
  loadError.value = ''
  statusError.value = ''
  statusMessage.value = ''
  try {
    const result = await fetchCompanyApplicant(id)
    if (sequence !== loadSequence) return
    application.value = result
    void loadCandidateAvatar(result)
    void loadResumePreview(result.id)
  } catch (cause) {
    if (sequence === loadSequence) {
      loadError.value = cause instanceof Error ? cause.message : 'Unable to load this application.'
    }
  } finally {
    if (sequence === loadSequence) loading.value = false
  }
}

watch(() => route.params.id, () => void loadApplication(), { immediate: true })
watch(() => route.query.view, value => { showCandidateProfile.value = value === 'profile' })

function clearResumePreview() {
  resumePreviewSequence++
  if (resumePreviewUrl.value) URL.revokeObjectURL(resumePreviewUrl.value)
  resumePreviewUrl.value = ''
  resumePreviewLoading.value = false
  resumePreviewError.value = ''
}

function clearCandidateAvatar() {
  candidateAvatarSequence++
  if (candidateAvatarUrl.value) URL.revokeObjectURL(candidateAvatarUrl.value)
  candidateAvatarUrl.value = ''
}

async function loadCandidateAvatar(result: CompanyApplicantDetails) {
  const sequence = ++candidateAvatarSequence
  if (!result.candidate.profileImageUrl) return
  try {
    const blob = await downloadCompanyApplicantAvatar(result.id)
    if (sequence !== candidateAvatarSequence || application.value?.id !== result.id) return
    candidateAvatarUrl.value = URL.createObjectURL(blob)
  } catch {
    // Some candidates have no photo. Keep the generated initials as the fallback.
  }
}

async function loadResumePreview(applicationId: string) {
  const sequence = ++resumePreviewSequence
  resumePreviewLoading.value = true
  resumePreviewError.value = ''
  try {
    const blob = await downloadCompanyApplicantResume(applicationId)
    if (sequence !== resumePreviewSequence || application.value?.id !== applicationId) return
    const previewBlob = blob.type.toLowerCase().includes('pdf')
      ? blob
      : new Blob([blob], { type: 'application/pdf' })
    resumePreviewUrl.value = URL.createObjectURL(previewBlob)
  } catch (cause) {
    if (sequence === resumePreviewSequence) {
      resumePreviewError.value = cause instanceof Error ? cause.message : 'Unable to preview this CV.'
    }
  } finally {
    if (sequence === resumePreviewSequence) resumePreviewLoading.value = false
  }
}

async function viewCandidateProfile() {
  if (!application.value) return
  showCandidateProfile.value = true
  if (route.query.view === 'profile') return
  try {
    await router.push({ name: 'CompanyApplicantProfilePage', params: { id: application.value.id }, query: { ...route.query, view: 'profile' } })
  } catch {
    // The profile is already visible locally; keep that interaction working if URL sync fails.
  }
}

function viewApplication() {
  showCandidateProfile.value = false
  const query = { ...route.query }
  delete query.view
  void router.replace({ name: 'CompanyApplicantProfilePage', params: { id: route.params.id }, query })
}

function formatMonth(value?: string) {
  if (!value) return ''
  const date = new Date(`${value.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(date)
}

function experiencePeriod(startDate?: string, endDate?: string, current?: boolean) {
  const start = formatMonth(startDate)
  const end = current ? 'Present' : formatMonth(endDate)
  return [start, end].filter(Boolean).join(' – ') || 'Dates not provided'
}

async function changeStatus(event: Event) {
  if (!application.value || statusSaving.value) return
  const status = (event.target as HTMLSelectElement).value as ApplicantStatus
  if (status === application.value.status) return
  if (status === 'INTERVIEW') {
    statusError.value = ''
    statusMessage.value = ''
    interviewScheduleOpen.value = true
    return
  }
  interviewScheduleOpen.value = false
  statusSaving.value = true
  statusError.value = ''
  statusMessage.value = ''
  try {
    application.value = await saveCompanyApplicantStatus(application.value.id, status)
    statusMessage.value = 'Application stage saved.'
  } catch (cause) {
    statusError.value = cause instanceof Error ? cause.message : 'Unable to update the application stage.'
  } finally {
    statusSaving.value = false
  }
}

function cancelInterviewSchedule() {
  interviewScheduleOpen.value = false
}

function onInterviewScheduled(status: ApplicantStatus) {
  if (!application.value) return
  if (application.value.status !== status) {
    application.value.status = status
    application.value.history = [
      ...(application.value.history ?? []),
      { status, at: new Date().toISOString(), changedBy: 'COMPANY' },
    ]
  }
  interviewScheduleOpen.value = false
  statusError.value = ''
  statusMessage.value = status === 'INTERVIEW'
    ? 'Interview scheduled. The application stage is now Interview, and the candidate has been notified.'
    : `Interview scheduled. The application stage is ${applicantStatusLabel(status)}.`
}

async function downloadResume() {
  if (!application.value || resumeLoading.value) return
  resumeLoading.value = true
  resumeError.value = ''
  try {
    const blob = await downloadCompanyApplicantResume(application.value.id)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = application.value.resume.fileName
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (cause) {
    resumeError.value = cause instanceof Error ? cause.message : 'Unable to download this résumé.'
  } finally {
    resumeLoading.value = false
  }
}

function returnToApplicants() {
  void router.push({ name: 'CompanyApplicantsPage' })
}

function statusClass(status: ApplicantStatus) {
  return applicantStatusClass(status)
}

onBeforeUnmount(() => {
  loadSequence++
  clearResumePreview()
  clearCandidateAvatar()
})
</script>

<template>
  <section v-if="loading" class="missing-profile candidate-profile-page" role="status">
    <span>Candidate application</span>
    <h1>Loading application…</h1>
    <p>Fetching the latest application and profile details.</p>
  </section>

  <section v-else-if="loadError" class="missing-profile candidate-profile-page" role="alert">
    <span>Candidate application</span>
    <h1>This application is unavailable</h1>
    <p>{{ loadError }}</p>
    <button type="button" class="profile-retry" @click="loadApplication">Try again</button>
    <RouterLink :to="{ name: 'CompanyApplicantsPage' }">Return to applicants</RouterLink>
  </section>

  <div v-else-if="application" class="candidate-profile-page">
    <button type="button" class="back-button" @click="returnToApplicants">
      <UiIcon name="chevron" :size="17" />
      Back to applicants
    </button>

    <template v-if="showCandidateProfile">
    <button type="button" class="back-button back-to-application" @click="viewApplication">
      <UiIcon name="chevron" :size="17" />
      Back to application review
    </button>

    <section class="profile-overview" :aria-labelledby="`profile-name-${application.id}`">
      <div class="identity-row">
        <div class="identity-main">
          <img v-if="candidateAvatarUrl" class="profile-avatar profile-photo" :src="candidateAvatarUrl" :alt="`${fullName}'s profile photo`" />
          <div v-else class="profile-avatar" :class="`avatar-${avatarColor}`" aria-hidden="true">{{ initials }}</div>
          <div class="identity-copy">
            <div class="name-line">
              <h1 :id="`profile-name-${application.id}`">{{ fullName }}</h1>
              <span class="status-pill" :class="statusClass(application.status)">{{ applicantStatusLabel(application.status) }}</span>
              <span v-if="application.candidate.isOpenToWork" class="open-to-work-pill">Open to work</span>
            </div>
            <p>{{ application.candidate.headline || 'Candidate profile' }}</p>
            <div class="identity-meta">
              <a v-if="application.candidate.email" :href="`mailto:${application.candidate.email}`"><b aria-hidden="true">@</b>{{ application.candidate.email }}</a>
              <span v-else>Email not shared</span>
              <span><b aria-hidden="true">⌖</b>{{ location }}</span>
              <span v-if="application.candidate.phone">{{ application.candidate.phone }}</span>
            </div>
          </div>
        </div>
        <label class="stage-control">
          <span>Application stage</span>
          <select :value="interviewScheduleOpen ? 'INTERVIEW' : application.status" :disabled="statusSaving || statusOptions.length === 1" aria-label="Application stage" @change="changeStatus">
            <option v-for="status in statusOptions" :key="status" :value="status">{{ applicantStatusLabel(status) }}</option>
          </select>
        </label>
      </div>

      <p v-if="statusError" class="status-feedback status-error" role="alert">{{ statusError }}</p>
      <p v-else-if="statusMessage" class="status-feedback" role="status">{{ statusMessage }}</p>

      <dl class="profile-summary">
        <div><dt>Applied role</dt><dd>{{ application.job.title }}</dd></div>
        <div><dt>Experience</dt><dd>{{ candidateExperiences.length ? `${candidateExperiences.length} role${candidateExperiences.length === 1 ? '' : 's'} shared` : 'Not provided' }}</dd></div>
        <div><dt>Applied</dt><dd>{{ relativeApplicationDate(application.appliedAt) }}</dd></div>
        <div><dt>Résumé</dt><dd>{{ application.resume.fileName }}</dd></div>
      </dl>
    </section>

    <InterviewScheduleForm
      :application-id="application.id"
      :job-title="application.job.title"
      :open="interviewScheduleOpen"
      class="profile-interview-form"
      @cancel="cancelInterviewSchedule"
      @scheduled="onInterviewScheduled"
    />

    <div class="profile-layout">
      <main class="main-column">
        <section class="profile-card about-card" aria-labelledby="candidate-about-heading">
          <header class="card-heading"><h2 id="candidate-about-heading">About</h2></header>
          <p>{{ application.candidate.bio || 'The candidate has not added a profile summary.' }}</p>
        </section>

        <section v-if="candidateLinks.length" class="profile-card profile-links-card" aria-labelledby="candidate-links-heading">
          <header class="card-heading"><h2 id="candidate-links-heading">Links</h2></header>
          <div class="profile-links-list">
            <a v-for="link in candidateLinks" :key="link.label" :href="link.url" target="_blank" rel="noopener noreferrer">{{ link.label }} <UiIcon name="chevron" :size="14" /></a>
          </div>
        </section>

        <section class="profile-card experience-card" aria-labelledby="candidate-experience-heading">
          <header class="card-heading"><div><h2 id="candidate-experience-heading">Work experience</h2><p>Experience shared with this application.</p></div></header>
          <div class="experience-list">
            <article v-for="(experience, index) in candidateExperiences" :key="`${experience.company}-${experience.position}-${index}`" class="experience-item">
              <div class="company-mark">{{ (experience.company || experience.position || 'R').charAt(0).toUpperCase() }}</div>
              <div class="experience-copy">
                <div class="experience-heading"><div><h3>{{ experience.position || 'Position not provided' }}</h3><p>{{ experience.company || 'Employer not provided' }}<template v-if="experience.employmentType"> · {{ experience.employmentType }}</template></p></div><time>{{ experiencePeriod(experience.startDate, experience.endDate, experience.current) }}</time></div>
                <p v-if="experience.description" class="experience-description">{{ experience.description }}</p>
              </div>
            </article>
            <p v-if="!candidateExperiences.length" class="profile-empty">No work experience was shared.</p>
          </div>
        </section>

        <section class="profile-card application-card" aria-labelledby="application-note-heading">
          <header class="card-heading"><div><h2 id="application-note-heading">Application</h2><p>Information connected to this application.</p></div></header>
          <dl class="application-grid">
            <div><dt>Position</dt><dd>{{ application.job.title }}</dd></div>
            <div><dt>Company</dt><dd>{{ application.job.company }}</dd></div>
            <div class="application-text"><dt>Introduction</dt><dd>{{ application.description || 'Not provided' }}</dd></div>
            <div class="application-text"><dt>Cover letter</dt><dd>{{ application.coverLetter || 'Not provided' }}</dd></div>
            <div v-if="application.portfolioUrl"><dt>Portfolio</dt><dd><a :href="application.portfolioUrl" target="_blank" rel="noopener noreferrer">Open portfolio</a></dd></div>
          </dl>
        </section>
      </main>

      <aside class="side-column">
        <section class="profile-card skills-card" aria-labelledby="candidate-skills-heading">
          <header class="card-heading compact-heading"><h2 id="candidate-skills-heading">Skills</h2><span>{{ candidateSkills.length }}</span></header>
          <div class="skill-list"><span v-for="skill in candidateSkills" :key="skill">{{ skill }}</span><p v-if="!candidateSkills.length" class="profile-empty">No skills listed.</p></div>
        </section>

        <section class="profile-card preference-card" aria-labelledby="candidate-languages-heading">
          <header class="card-heading"><h2 id="candidate-languages-heading">Languages</h2></header>
          <dl><div v-for="(language, index) in candidateLanguages" :key="`${language.name}-${index}`"><dt>{{ language.name || 'Language' }}</dt><dd>{{ language.proficiency || 'Proficiency not provided' }}</dd></div></dl>
          <p v-if="!candidateLanguages.length" class="profile-empty">No languages were shared.</p>
        </section>

        <section class="profile-card education-card" aria-labelledby="candidate-education-heading">
          <header class="card-heading"><h2 id="candidate-education-heading">Education</h2></header>
          <article v-for="(education, index) in candidateEducation" :key="`${education.school}-${education.degree}-${index}`" class="education-entry">
            <strong>{{ education.degree || education.fieldOfStudy || 'Education' }}</strong>
            <span>{{ education.school || 'School not provided' }}</span>
            <small>{{ experiencePeriod(education.startDate, education.endDate) }}</small>
          </article>
          <p v-if="!candidateEducation.length" class="profile-empty">No education details were shared.</p>
        </section>

        <section class="profile-card resume-card" aria-labelledby="candidate-resume-heading">
          <header class="card-heading"><h2 id="candidate-resume-heading">Résumé</h2></header>
          <div class="resume-row"><span class="pdf-mark" aria-hidden="true">PDF</span><div><strong>{{ application.resume.fileName }}</strong><small>{{ (application.resume.fileSize / 1024).toFixed(0) }} KB</small></div></div>
          <button type="button" class="resume-download" :disabled="resumeLoading" @click="downloadResume">{{ resumeLoading ? 'Preparing download…' : 'Download résumé' }}</button>
          <p v-if="resumeError" class="status-feedback status-error" role="alert">{{ resumeError }}</p>
        </section>
      </aside>
    </div>
    </template>

    <div v-else class="application-review-page">
      <section class="profile-overview application-review-overview" :aria-labelledby="`application-review-name-${application.id}`">
        <div class="identity-row">
          <div class="identity-main">
            <img v-if="candidateAvatarUrl" class="profile-avatar profile-photo" :src="candidateAvatarUrl" :alt="`${fullName}'s profile photo`" />
            <div v-else class="profile-avatar" :class="`avatar-${avatarColor}`" aria-hidden="true">{{ initials }}</div>
            <div class="identity-copy">
              <div class="name-line">
                <button type="button" class="profile-name-button" :id="`application-review-name-${application.id}`" @click="viewCandidateProfile">{{ fullName }}</button>
                <span class="status-pill" :class="statusClass(application.status)">{{ applicantStatusLabel(application.status) }}</span>
              </div>
              <p>Application for {{ application.job.title }}</p>
              <div class="identity-meta">
                <a v-if="application.contact.email" :href="`mailto:${application.contact.email}`"><b aria-hidden="true">@</b>{{ application.contact.email }}</a>
                <span v-else>Email not shared</span>
                <span><b aria-hidden="true">⌖</b>{{ location }}</span>
              </div>
              <button type="button" class="inline-profile-link" @click="viewCandidateProfile">View candidate profile <UiIcon name="chevron" :size="14" /></button>
            </div>
          </div>
          <span class="application-review-label">Submitted application</span>
        </div>
        <dl class="profile-summary">
          <div><dt>Applied role</dt><dd>{{ application.job.title }}</dd></div>
          <div><dt>Company</dt><dd>{{ application.job.company }}</dd></div>
          <div><dt>Applied</dt><dd>{{ relativeApplicationDate(application.appliedAt) }}</dd></div>
          <div><dt>Attached CV</dt><dd>{{ application.resume.fileName }}</dd></div>
        </dl>
      </section>

      <p v-if="statusError" class="status-feedback status-error" role="alert">{{ statusError }}</p>
      <p v-else-if="statusMessage" class="status-feedback" role="status">{{ statusMessage }}</p>

      <InterviewScheduleForm
        :application-id="application.id"
        :job-title="application.job.title"
        :open="interviewScheduleOpen"
        class="profile-interview-form"
        @cancel="cancelInterviewSchedule"
        @scheduled="onInterviewScheduled"
      />

      <div class="profile-layout application-review-layout">
        <main class="main-column">
          <section class="profile-card application-card" aria-labelledby="application-form-heading">
            <header class="card-heading"><div><h2 id="application-form-heading">Application form</h2><p>Submitted answers and contact details from this application.</p></div></header>
            <dl class="application-grid">
              <div><dt>Position</dt><dd>{{ application.job.title }}</dd></div>
              <div><dt>Email</dt><dd>{{ application.contact.email || 'Not shared' }}</dd></div>
              <div><dt>Phone</dt><dd>{{ application.contact.phone || 'Not provided' }}</dd></div>
              <div><dt>Portfolio or website</dt><dd><a v-if="application.portfolioUrl" :href="application.portfolioUrl" target="_blank" rel="noopener noreferrer">{{ application.portfolioUrl }}</a><span v-else>Not provided</span></dd></div>
              <div class="application-text"><dt>Application description</dt><dd>{{ application.description || 'Not provided' }}</dd></div>
              <div class="application-text"><dt>Cover letter</dt><dd>{{ application.coverLetter || 'Not provided' }}</dd></div>
            </dl>
          </section>

          <section class="profile-card cv-preview-card" aria-labelledby="application-cv-heading">
            <header class="card-heading cv-preview-heading">
              <div><h2 id="application-cv-heading">Attached CV / résumé</h2><p>{{ application.resume.fileName }} · {{ (application.resume.fileSize / 1024).toFixed(0) }} KB</p></div>
              <button type="button" class="resume-download" :disabled="resumeLoading" @click="downloadResume">{{ resumeLoading ? 'Preparing…' : 'Download CV' }}</button>
            </header>
            <p v-if="resumeError" class="status-feedback status-error" role="alert">{{ resumeError }}</p>
            <p v-if="resumePreviewLoading" class="cv-preview-state" role="status">Loading the submitted CV…</p>
            <div v-else-if="resumePreviewError" class="cv-preview-state cv-preview-error" role="alert">
              <span>{{ resumePreviewError }}</span><button type="button" @click="loadResumePreview(application.id)">Try preview again</button>
            </div>
            <div v-else-if="resumePreviewUrl" class="cv-preview-frame-wrap">
              <iframe class="cv-preview-frame" :src="resumePreviewUrl" :title="`Preview of ${application.resume.fileName}`"></iframe>
              <a class="cv-open-link" :href="resumePreviewUrl" target="_blank" rel="noopener noreferrer">Open CV in a new tab</a>
            </div>
          </section>
        </main>

        <aside class="side-column">
          <section class="profile-card review-tools-card" aria-labelledby="application-stage-heading">
            <header class="card-heading"><div><h2 id="application-stage-heading">Review stage</h2><p>Update the current hiring stage.</p></div></header>
            <label class="stage-control">
              <span>Application stage</span>
              <select :value="interviewScheduleOpen ? 'INTERVIEW' : application.status" :disabled="statusSaving || statusOptions.length === 1" aria-label="Application stage" @change="changeStatus">
                <option v-for="status in statusOptions" :key="status" :value="status">{{ applicantStatusLabel(status) }}</option>
              </select>
            </label>
            <p v-if="statusSaving" class="profile-empty" role="status">Saving stage…</p>
            <button v-if="application.status === 'INTERVIEW' && !interviewScheduleOpen" type="button" class="schedule-another-interview" @click="interviewScheduleOpen = true">Schedule an interview</button>
          </section>
          <section class="profile-card review-contact-card" aria-labelledby="application-contact-heading">
            <header class="card-heading"><h2 id="application-contact-heading">Applicant contact</h2></header>
            <dl class="review-contact-list"><div><dt>Email</dt><dd>{{ application.contact.email || 'Not shared' }}</dd></div><div><dt>Phone</dt><dd>{{ application.contact.phone || 'Not provided' }}</dd></div><div><dt>Location</dt><dd>{{ location }}</dd></div></dl>
            <button type="button" class="profile-action-button" @click="viewCandidateProfile">Open full profile</button>
          </section>
        </aside>
      </div>
    </div>
  </div>

  <p v-else class="missing-profile candidate-profile-page" role="status">Application not found.</p>
</template>

<style scoped>
.candidate-profile-page { width: min(100%, 1500px); margin: 0 auto; color: #172044; }
.profile-interview-form { margin: 18px 0 24px; }
.schedule-another-interview { width: 100%; min-height: 39px; margin-top: 14px; padding: 0 12px; border: 1px solid #e0daf4; border-radius: 8px; background: #f7f5ff; color: #5c49c5; font-size: 12px; font-weight: 700; cursor: pointer; transition: background 150ms ease, border-color 150ms ease; }
.schedule-another-interview:hover { border-color: #cfc5f0; background: #f0edff; }
.schedule-another-interview:focus-visible { outline: 3px solid rgb(123 102 255 / 30%); outline-offset: 2px; }
.back-button { margin: 0 0 18px; padding: 6px 2px; border: 0; display: inline-flex; align-items: center; gap: 7px; background: transparent; color: #58658a; font-size: 13px; font-weight: 650; cursor: pointer; }
.back-button :deep(svg) { transform: rotate(180deg); }
.back-button:hover { color: #4b34c7; }
.profile-overview, .profile-card, .missing-profile { border: 1px solid #e5e1ef; border-radius: 12px; background: #fff; }
.profile-overview { overflow: hidden; }
.identity-row { min-height: 154px; padding: 27px 30px; display: flex; align-items: center; justify-content: space-between; gap: 30px; }
.identity-main { min-width: 0; display: flex; align-items: center; gap: 19px; }
.profile-avatar { width: 82px; height: 82px; flex: 0 0 82px; border-radius: 19px; display: grid; place-items: center; font-size: 23px; font-weight: 750; }
.profile-photo { border: 1px solid #dce1eb; display: block; object-fit: cover; }
.avatar-coral { background: #fff0f1; color: #9b5262; }.avatar-blue { background: #eaf1ff; color: #315eaa; }.avatar-purple { background: #f0edff; color: #604bd0; }.avatar-orange { background: #fff3e4; color: #91602c; }
.identity-copy { min-width: 0; }
.name-line { display: flex; align-items: center; flex-wrap: wrap; gap: 11px; }
.name-line h1 { margin: 0; color: #101a3d; font-size: clamp(29px, 3vw, 38px); font-weight: 700; letter-spacing: -.045em; line-height: 1.05; }
.identity-copy > p { margin: 8px 0 0; color: #4f5e84; font-size: 16px; }
.identity-meta { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 8px 18px; color: #7a849f; font-size: 12px; }
.identity-meta :is(a, span) { display: inline-flex; align-items: center; gap: 6px; color: inherit; text-decoration: none; }.identity-meta a:hover { color: #4d35c8; }.identity-meta b { color: #7560df; }
.status-feedback { margin: 14px 24px 0; color: #347553; font-size: 11px; line-height: 1.5; }.status-error { color: #a34d59; }
.back-to-application { margin-top: -8px; }
.profile-name-button { max-width: 100%; padding: 0; border: 0; background: transparent; color: #101a3d; font: inherit; font-size: clamp(29px, 3vw, 38px); font-weight: 700; letter-spacing: -.045em; line-height: 1.05; text-align: left; cursor: pointer; }
.profile-name-button:hover { color: #4d35c8; }
.profile-name-button:focus-visible, .inline-profile-link:focus-visible, .profile-action-button:focus-visible { outline: 3px solid rgb(123 102 255 / 30%); outline-offset: 3px; }
.inline-profile-link { margin-top: 10px; padding: 0; border: 0; display: inline-flex; align-items: center; gap: 3px; background: transparent; color: #4d35c8; font-size: 11px; font-weight: 700; cursor: pointer; }
.application-review-label { padding: 8px 11px; border-radius: 6px; background: #f2efff; color: #5945c9; font-size: 10px; font-weight: 750; letter-spacing: .04em; text-transform: uppercase; white-space: nowrap; }
.cv-preview-heading { align-items: center; }
.cv-preview-heading .resume-download { width: auto; min-width: 110px; margin-top: 0; }
.cv-preview-frame-wrap { margin-top: 20px; }
.cv-preview-frame { width: 100%; height: min(78vh, 900px); min-height: 620px; border: 1px solid #dfe2e8; border-radius: 8px; display: block; background: #f5f6f8; }
.cv-open-link { display: inline-flex; margin-top: 10px; color: #4d35c8; font-size: 11px; font-weight: 650; text-decoration: none; }
.cv-open-link:hover { text-decoration: underline; }
.cv-preview-state { min-height: 220px; margin: 18px 0 0; border: 1px dashed #d9d4e6; border-radius: 9px; display: grid; place-content: center; justify-items: center; gap: 10px; color: #707b96; font-size: 12px; text-align: center; }
.cv-preview-error button { border: 0; background: transparent; color: #4d35c8; font-size: 12px; font-weight: 700; text-decoration: underline; cursor: pointer; }
.review-contact-list { margin: 18px 0 0; display: grid; gap: 13px; }
.review-contact-list div { min-width: 0; }
.review-contact-list dt { color: #7b849e; font-size: 9px; font-weight: 650; letter-spacing: .035em; text-transform: uppercase; }
.review-contact-list dd { margin: 5px 0 0; overflow-wrap: anywhere; color: #273358; font-size: 12px; font-weight: 600; }
.profile-action-button { width: 100%; min-height: 39px; margin-top: 18px; border: 1px solid #d9d4eb; border-radius: 7px; background: #fff; color: #4d35c8; font-size: 11px; font-weight: 700; cursor: pointer; }
.profile-action-button:hover { background: #f5f2ff; }
.profile-links-list { margin-top: 16px; display: flex; flex-wrap: wrap; gap: 10px; }
.profile-links-list a { min-height: 36px; padding: 0 12px; border: 1px solid #e1ddef; border-radius: 7px; display: inline-flex; align-items: center; gap: 6px; color: #4d35c8; font-size: 12px; font-weight: 650; text-decoration: none; }
.profile-links-list a:hover { background: #f5f2ff; }
.status-pill { width: max-content; min-height: 28px; padding: 5px 10px; border: 1px solid; border-radius: 999px; display: inline-flex; align-items: center; font-size: 11px; font-weight: 700; letter-spacing: .01em; line-height: 1; white-space: nowrap; }
.open-to-work-pill { padding: 6px 9px; border: 1px solid #b7dfc5; border-radius: 999px; background: #eff9f2; color: #267044; font-size: 10px; font-weight: 700; white-space: nowrap; }
.status-new { border-color: #b6d5ef; background: #f1f7ff; color: #21649f; }.status-under-review { border-color: #c6d4ed; background: #f5f8ff; color: #45628e; }.status-interview { border-color: #b5e1d5; background: #effaf7; color: #227565; }.status-shortlisted { border-color: #d0c4f2; background: #f7f3ff; color: #5b46c6; }.status-offer-sent { border-color: #f0d5a7; background: #fff9eb; color: #8b6420; }.status-hired { border-color: #b8e1c5; background: #f0faf3; color: #2f7b4e; }.status-rejected { border-color: #ebc3ca; background: #fff4f5; color: #a04e5b; }.status-withdrawn { border-color: #d8dbe5; background: #f5f6f9; color: #65708a; }
.stage-control { width: 210px; flex: 0 0 210px; display: grid; gap: 7px; color: #344266; font-size: 11px; font-weight: 700; }.stage-control select { width: 100%; min-height: 42px; padding: 0 11px; border: 1px solid #d9d4e9; border-radius: 8px; background: #fff; color: #253257; font: inherit; font-size: 12px; outline: 0; }.stage-control select:focus { border-color: #7560e0; box-shadow: 0 0 0 3px #6d51d914; }.stage-control small { color: #8a91a6; font-size: 9px; font-weight: 450; }
.profile-summary { display: grid; grid-template-columns: repeat(4, 1fr); margin: 0 18px 18px; padding: 0; border-radius: 10px; background: #f5f3fc; }
.profile-summary div { min-width: 0; padding: 16px 20px; }.profile-summary div + div { border-left: 1px solid #e1ddec; }.profile-summary dt, .application-grid dt, .preference-card dt { color: #7b849e; font-size: 9px; font-weight: 650; letter-spacing: .035em; text-transform: uppercase; }.profile-summary dd { margin: 6px 0 0; overflow: hidden; color: #26335a; font-size: 13px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.profile-layout { margin-top: 22px; display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(300px, .75fr); align-items: start; gap: 22px; }.main-column, .side-column { min-width: 0; display: grid; gap: 18px; }
.profile-card { padding: 25px 27px; }.card-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }.card-heading h2 { margin: 0; padding-left: 12px; position: relative; color: #192348; font-size: 17px; font-weight: 700; letter-spacing: -.025em; }.card-heading h2::before { position: absolute; top: 2px; bottom: 2px; left: 0; width: 4px; border-radius: 99px; background: #6950e1; content: ''; }.card-heading p { margin: 6px 0 0; color: #7b849d; font-size: 11px; }.about-card > p { max-width: 78ch; margin: 18px 0 0; color: #505d7e; font-size: 14px; line-height: 1.8; }
.experience-list { margin-top: 19px; display: grid; }.experience-item { display: grid; grid-template-columns: 45px minmax(0, 1fr); gap: 14px; padding: 19px 0; border-top: 1px solid #ebe8f2; }.company-mark { width: 45px; height: 45px; border-radius: 10px; display: grid; place-items: center; background: #e9e5ff; color: #4e36c9; font-size: 15px; font-weight: 750; }.muted-mark { background: #f0f1f5; color: #65708b; }.experience-heading { display: flex; justify-content: space-between; gap: 20px; }.experience-heading h3 { margin: 1px 0 0; color: #202a4c; font-size: 14px; font-weight: 700; }.experience-heading p { margin: 5px 0 0; color: #6f7894; font-size: 11px; }.experience-heading time { flex: 0 0 auto; padding: 5px 8px; border-radius: 6px; background: #f5f3fc; color: #586385; font-size: 9px; white-space: nowrap; }.experience-copy ul { margin: 15px 0 0; padding-left: 17px; color: #56617e; font-size: 12px; line-height: 1.65; }.experience-copy li + li { margin-top: 7px; }.experience-skills, .skill-list { display: flex; flex-wrap: wrap; gap: 7px; }.experience-skills { margin-top: 14px; }.experience-skills span, .skill-list span { padding: 6px 9px; border-radius: 6px; background: #f1effa; color: #4f5d82; font-size: 10px; font-weight: 600; }.previous-role { padding-bottom: 0; }
.application-grid { margin: 19px 0 0; display: grid; grid-template-columns: 1fr 1fr; gap: 0; border-top: 1px solid #ebe8f2; border-left: 1px solid #ebe8f2; }.application-grid div { padding: 15px; border-right: 1px solid #ebe8f2; border-bottom: 1px solid #ebe8f2; }.application-grid dd, .preference-card dd { margin: 6px 0 0; color: #273358; font-size: 12px; font-weight: 650; }
.compact-heading { align-items: center; }.compact-heading > span { display: grid; width: 24px; height: 24px; place-items: center; border-radius: 50%; background: #f0edff; color: #5742c7; font-size: 10px; font-weight: 700; }.skill-list { margin-top: 17px; }.preference-card dl { margin: 18px 0 0; display: grid; gap: 15px; }.education-card > p { margin: 17px 0 0; color: #53607f; font-size: 12px; line-height: 1.65; }.resume-row { margin-top: 17px; display: flex; align-items: center; min-width: 0; gap: 11px; }.pdf-mark { width: 39px; height: 43px; flex: 0 0 39px; border-radius: 7px; display: grid; place-items: center; background: #ece8ff; color: #5138cc; font-size: 8px; font-weight: 800; }.resume-row > div { min-width: 0; }.resume-row strong, .resume-row small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.resume-row strong { color: #273154; font-size: 11px; }.resume-row small { margin-top: 5px; color: #858ca2; font-size: 9px; }
.missing-profile { min-height: 440px; padding: 48px; display: grid; place-content: center; justify-items: center; text-align: center; }.missing-profile > span { color: #6853d8; font-size: 11px; font-weight: 700; text-transform: uppercase; }.missing-profile h1 { margin: 10px 0 0; color: #182248; font-size: 29px; }.missing-profile p { margin: 10px 0 0; color: #6d7898; font-size: 13px; }.missing-profile a, .profile-retry { margin-top: 20px; padding: 11px 16px; border: 0; border-radius: 8px; background: #4d34d3; color: #fff; font-size: 12px; font-weight: 700; text-decoration: none; cursor: pointer; }
.profile-empty { margin: 12px 0 0; color: #7a849f; font-size: 11px; line-height: 1.5; }.experience-description { margin: 12px 0 0; color: #56617e; font-size: 12px; line-height: 1.65; }.education-entry { padding: 13px 0; display: grid; gap: 5px; border-bottom: 1px solid #efedf4; }.education-entry:first-of-type { margin-top: 8px; }.education-entry strong { color: #273154; font-size: 11px; }.education-entry span { color: #65708b; font-size: 11px; }.education-entry small { color: #8990a5; font-size: 9px; }.application-text { grid-column: 1 / -1; }.application-text dd { color: #596582; font-size: 11px; font-weight: 450; line-height: 1.65; white-space: pre-wrap; }.resume-download { width: 100%; min-height: 39px; margin-top: 16px; border: 0; border-radius: 7px; background: #4d34d3; color: white; font-size: 11px; font-weight: 700; cursor: pointer; }.resume-download:disabled { opacity: .65; cursor: wait; }
@media (max-width: 980px) { .profile-layout { grid-template-columns: 1fr; }.side-column { grid-template-columns: repeat(2, minmax(0, 1fr)); }.skills-card, .resume-card { grid-column: auto; } }
@media (max-width: 700px) { .identity-row { align-items: flex-start; flex-direction: column; padding: 22px; }.stage-control { width: 100%; flex-basis: auto; }.profile-summary { grid-template-columns: 1fr 1fr; margin: 0 12px 12px; }.profile-summary div:nth-child(3) { border-top: 1px solid #e1ddec; border-left: 0; }.profile-summary div:nth-child(4) { border-top: 1px solid #e1ddec; }.profile-layout { margin-top: 14px; gap: 14px; }.side-column { grid-template-columns: 1fr; gap: 14px; }.profile-card { padding: 21px; } }
@media (max-width: 460px) { .identity-main { align-items: flex-start; }.profile-avatar { width: 64px; height: 64px; flex-basis: 64px; border-radius: 15px; font-size: 19px; }.name-line { align-items: flex-start; flex-direction: column; gap: 8px; }.name-line h1 { font-size: 27px; }.identity-copy > p { font-size: 14px; }.identity-meta { align-items: flex-start; flex-direction: column; }.profile-summary { grid-template-columns: 1fr; }.profile-summary div + div { border-top: 1px solid #e1ddec; border-left: 0; }.experience-heading { align-items: flex-start; flex-direction: column; gap: 9px; }.application-grid { grid-template-columns: 1fr; }.missing-profile { padding: 28px 20px; } }

:global(.company-shell.theme-dark) .candidate-profile-page { color: var(--ink); }
:global(.company-shell.theme-dark) .candidate-profile-page :is(.profile-overview, .profile-card, .missing-profile) { border-color: var(--line); background: var(--surface-raised); color: var(--ink); }
:global(.company-shell.theme-dark) .candidate-profile-page :is(.back-button, .identity-copy > p, .identity-meta, .card-heading p, .experience-heading p, .experience-heading time, .profile-empty, .experience-description, .education-entry span, .education-entry small, .resume-row small, .missing-profile p, .review-contact-list dt, .cv-preview-state) { color: var(--muted); }
:global(.company-shell.theme-dark) .candidate-profile-page :is(.name-line h1, .profile-name-button, .card-heading h2, .experience-heading h3, .education-entry strong, .resume-row strong, .missing-profile h1, .review-contact-list dd, .application-grid dd, .preference-card dd, .profile-summary dd) { color: var(--ink); }
:global(.company-shell.theme-dark) .candidate-profile-page .profile-name-button { color: var(--ink); }
:global(.company-shell.theme-dark) .candidate-profile-page .profile-name-button:hover,
:global(.company-shell.theme-dark) .candidate-profile-page .back-button:hover { color: var(--accent-dark); }
:global(.company-shell.theme-dark) .candidate-profile-page :is(.identity-meta, .identity-meta a, .identity-meta span) { color: var(--muted); }
:global(.company-shell.theme-dark) .candidate-profile-page :is(.identity-meta b, .inline-profile-link, .cv-open-link) { color: var(--accent-dark); }
:global(.company-shell.theme-dark) .candidate-profile-page .profile-summary { background: var(--surface); }
:global(.company-shell.theme-dark) .candidate-profile-page :is(.profile-summary div + div, .experience-item, .education-entry) { border-color: var(--line); }
:global(.company-shell.theme-dark) .candidate-profile-page :is(.application-grid, .application-grid div) { border-color: var(--line); }
:global(.company-shell.theme-dark) .candidate-profile-page .application-grid a { color: var(--accent-dark); }
:global(.company-shell.theme-dark) .candidate-profile-page .profile-links-list a { border-color: var(--line-strong); color: var(--accent-dark); }
:global(.company-shell.theme-dark) .candidate-profile-page .profile-links-list a:hover { background: var(--accent-soft); }
:global(.company-shell.theme-dark) .candidate-profile-page :is(.about-card > p, .experience-copy ul, .application-text dd) { color: var(--ink-soft); }
:global(.company-shell.theme-dark) .candidate-profile-page :is(.experience-heading time, .resume-row, .skill-list span) { background: var(--surface); }
:global(.company-shell.theme-dark) .candidate-profile-page :is(.experience-skills span, .skill-list span) { color: var(--ink-soft); }
:global(.company-shell.theme-dark) .candidate-profile-page .company-mark { background: #302a4e; color: #c4b6ff; }
:global(.company-shell.theme-dark) .candidate-profile-page .muted-mark { background: #27303e; color: #aeb9cd; }
:global(.company-shell.theme-dark) .candidate-profile-page .compact-heading > span { background: #302a4e; color: #c4b6ff; }
:global(.company-shell.theme-dark) .candidate-profile-page .pdf-mark { background: #302a4e; color: #c4b6ff; }
:global(.company-shell.theme-dark) .candidate-profile-page :is(.profile-summary dt, .application-grid dt, .preference-card dt, .review-contact-list dt) { color: #b9c4d6; font-size: 10px; }
:global(.company-shell.theme-dark) .candidate-profile-page .stage-control { color: var(--ink-soft); }
:global(.company-shell.theme-dark) .candidate-profile-page .stage-control select { border-color: var(--line-strong); background: var(--surface); color: var(--ink); }
:global(.company-shell.theme-dark) .candidate-profile-page .stage-control select:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgb(154 136 241 / 15%); }
:global(.company-shell.theme-dark) .candidate-profile-page .application-review-label { background: var(--accent-soft); color: var(--accent-dark); }
:global(.company-shell.theme-dark) .candidate-profile-page .profile-action-button { border-color: var(--line-strong); background: var(--surface); color: var(--accent-dark); }
:global(.company-shell.theme-dark) .candidate-profile-page .profile-action-button:hover { background: var(--accent-soft); }
:global(.company-shell.theme-dark) .candidate-profile-page .cv-preview-frame { border-color: var(--line-strong); background: #fff; }
:global(.company-shell.theme-dark) .candidate-profile-page .cv-preview-state { border-color: var(--line-strong); }
:global(.company-shell.theme-dark) .candidate-profile-page .status-error { color: #f0a5b2; }
:global(.company-shell.theme-dark) .candidate-profile-page .status-feedback:not(.status-error) { color: #91d5ae; }
:global(.company-shell.theme-dark) .candidate-profile-page .open-to-work-pill { border-color: #477258; background: #20382b; color: #aee0bd; }
:global(.company-shell.theme-dark) .candidate-profile-page .status-new { border-color: #315a79; background: #1c3346; color: #91c7ee; }
:global(.company-shell.theme-dark) .candidate-profile-page .status-under-review { border-color: #3c506e; background: #222e43; color: #b6c7e6; }
:global(.company-shell.theme-dark) .candidate-profile-page .status-interview { border-color: #2d6459; background: #1d3b36; color: #9be0ce; }
:global(.company-shell.theme-dark) .candidate-profile-page .status-shortlisted { border-color: #51457e; background: #30294b; color: #c4b2ff; }
:global(.company-shell.theme-dark) .candidate-profile-page .status-offer-sent { border-color: #725d36; background: #3c3220; color: #e7c582; }
:global(.company-shell.theme-dark) .candidate-profile-page .status-hired { border-color: #366348; background: #21392b; color: #a9dfb9; }
:global(.company-shell.theme-dark) .candidate-profile-page .status-rejected { border-color: #713d49; background: #402730; color: #f0adb8; }
:global(.company-shell.theme-dark) .candidate-profile-page .status-withdrawn { border-color: #40495a; background: #272f3c; color: #b0bbce; }

/* Keep nested review content readable when it is mounted inside the dashboard shell. */
:global(.company-shell.theme-dark .candidate-profile-page .name-line h1),
:global(.company-shell.theme-dark .candidate-profile-page .profile-name-button),
:global(.company-shell.theme-dark .candidate-profile-page .card-heading h2),
:global(.company-shell.theme-dark .candidate-profile-page .review-contact-list dd),
:global(.company-shell.theme-dark .candidate-profile-page .application-grid dd),
:global(.company-shell.theme-dark .candidate-profile-page .profile-summary dd),
:global(.company-shell.theme-dark .candidate-profile-page .stage-control) { color: #edf1f7 !important; }
:global(.company-shell.theme-dark .candidate-profile-page :is(.back-button, .identity-copy > p, .identity-meta, .identity-meta a, .identity-meta span, .card-heading p, .review-contact-list dt, .profile-summary dt, .application-grid dt, .application-text dd, .cv-preview-heading p, .experience-heading p, .experience-heading time, .experience-description, .profile-empty, .education-entry span, .education-entry small, .resume-row small, .missing-profile p, .cv-preview-state)) { color: #b9c4d6 !important; }
:global(.company-shell.theme-dark .candidate-profile-page .profile-action-button) { border-color: #455268 !important; background: #171e2a !important; color: #cfc6ff !important; }
:global(.company-shell.theme-dark .candidate-profile-page .profile-action-button:hover) { background: #2b2744 !important; }
:global(.company-shell.theme-dark .candidate-profile-page .profile-links-list a) { border-color: #455268 !important; color: #cfc6ff !important; }
:global(.company-shell.theme-dark .candidate-profile-page .profile-links-list a:hover) { background: #2b2744 !important; }
:global(.company-shell.theme-dark .candidate-profile-page .application-review-label) { background: #2b2744 !important; color: #d4ccff !important; }
:global(.company-shell.theme-dark .candidate-profile-page .application-grid a),
:global(.company-shell.theme-dark .candidate-profile-page .inline-profile-link),
:global(.company-shell.theme-dark .candidate-profile-page .cv-open-link) { color: #cfc6ff !important; }
@media (max-width: 700px) {
  .cv-preview-heading { align-items: flex-start; flex-direction: column; }
  .cv-preview-frame { min-height: 480px; height: 68vh; }
  .application-review-label { white-space: normal; }
}
</style>
