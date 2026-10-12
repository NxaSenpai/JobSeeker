<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import CompanyPageHeader from '@/components/company/CompanyPageHeader.vue'
import UiIcon from '@/components/company/UiIcon.vue'
import {
  applicantAvatarColor,
  applicantInitials,
  applicantName,
  applicantStatusClass,
  applicantStatusLabel,
  applicantStatuses,
  downloadCompanyApplicantAvatar,
  fetchCompanyApplicants,
  type ApplicantStatus,
  type CompanyApplicantListItem,
} from '@/services/companyApplicants'
import {
  relativeApplicationDate,
} from '@/services/companyWorkspace'

type ApplicantFilter = 'All' | ApplicantStatus

const props = withDefaults(defineProps<{ search?: string }>(), { search: '' })
const router = useRouter()
const selectedFilter = ref<ApplicantFilter>('All')
const applicants = ref<CompanyApplicantListItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const loading = ref(true)
const error = ref('')
const reviewCount = ref(0)
const applicantAvatarUrls = ref<Record<string, string>>({})
let requestVersion = 0
let avatarRequestVersion = 0
let searchTimer: ReturnType<typeof setTimeout> | undefined
const avatarObjectUrls = new Map<string, string>()

const filters = computed(() => [
  { value: 'All' as const, label: 'All' },
  ...applicantStatuses.map(status => ({ value: status, label: applicantStatusLabel(status) })),
])
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
async function loadApplicants(targetPage = 1) {
  const version = ++requestVersion
  clearApplicantAvatars()
  page.value = targetPage
  loading.value = true
  error.value = ''
  try {
    const result = await fetchCompanyApplicants({
      page: targetPage,
      limit: pageSize,
      status: selectedFilter.value === 'All' ? undefined : selectedFilter.value,
      search: props.search,
    })
    if (version !== requestVersion) return
    applicants.value = result.applications
    total.value = result.total
    page.value = result.page
    void loadApplicantAvatars(result.applications, avatarRequestVersion)
  } catch (cause) {
    if (version === requestVersion) {
      error.value = cause instanceof Error ? cause.message : 'Unable to load applicants.'
    }
  } finally {
    if (version === requestVersion) loading.value = false
  }
}

function clearApplicantAvatars() {
  avatarRequestVersion++
  for (const url of avatarObjectUrls.values()) URL.revokeObjectURL(url)
  avatarObjectUrls.clear()
  applicantAvatarUrls.value = {}
}

async function loadApplicantAvatars(items: CompanyApplicantListItem[], version: number) {
  const candidatesWithPhotos = items.filter(applicant => applicant.candidate.profileImageUrl)
  let next = 0
  const workerCount = Math.min(4, candidatesWithPhotos.length)
  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (version === avatarRequestVersion && next < candidatesWithPhotos.length) {
      const applicant = candidatesWithPhotos[next++]
      if (!applicant) return
      try {
        const blob = await downloadCompanyApplicantAvatar(applicant.id)
        if (version !== avatarRequestVersion) return
        const url = URL.createObjectURL(blob)
        avatarObjectUrls.set(applicant.id, url)
        applicantAvatarUrls.value = { ...applicantAvatarUrls.value, [applicant.id]: url }
      } catch {
        // Candidates without an accessible photo use their initials.
      }
    }
  }))
}

async function loadReviewCount() {
  try {
    const [newApplications, inReview] = await Promise.all([
      fetchCompanyApplicants({ page: 1, limit: 1, status: 'APPLIED' }),
      fetchCompanyApplicants({ page: 1, limit: 1, status: 'UNDER_REVIEW' }),
    ])
    reviewCount.value = newApplications.total + inReview.total
  } catch {
    // The applicant list remains usable if the optional summary request fails.
  }
}

function chooseFilter(label: ApplicantFilter) {
  selectedFilter.value = label
  void loadApplicants(1)
}

function statusClass(status: ApplicantStatus) {
  return applicantStatusClass(status)
}

function reviewApplicant(applicant: CompanyApplicantListItem) {
  void router.push({ name: 'CompanyApplicantProfilePage', params: { id: applicant.id } })
}

watch(() => props.search, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => void loadApplicants(1), 250)
})
onMounted(() => {
  void loadApplicants(1)
  void loadReviewCount()
})
onBeforeUnmount(() => {
  requestVersion++
  clearApplicantAvatars()
  if (searchTimer) clearTimeout(searchTimer)
})
</script>

<template>
  <div class="company-page applicants-page">
    <CompanyPageHeader eyebrow="Workspace / Applicants" title="Applicants" description="Review candidates and move each application forward.">
      <template #actions>
        <div class="review-summary"><strong>{{ reviewCount }}</strong><span>need review</span></div>
      </template>
    </CompanyPageHeader>

    <section class="candidate-directory" aria-labelledby="candidate-list-heading">
      <header class="directory-heading">
        <div><h3 id="candidate-list-heading">Candidate list</h3><p>Open an application to review the submitted form and CV.</p></div>
        <span>{{ total }} application{{ total === 1 ? '' : 's' }}</span>
      </header>

      <div class="applicant-filters" role="group" aria-label="Filter applicants by stage">
        <button
          v-for="filter in filters"
          :key="filter.value"
          type="button"
          :aria-pressed="selectedFilter === filter.value"
          :class="{ active: selectedFilter === filter.value }"
          @click="chooseFilter(filter.value)"
        >
          {{ filter.label }}
        </button>
      </div>

      <p v-if="loading" class="applicant-feedback" role="status">Loading applications…</p>
      <div v-else-if="error" class="applicant-feedback applicant-error" role="alert">
        <span>{{ error }}</span><button type="button" @click="loadApplicants(page)">Try again</button>
      </div>

      <div v-else-if="applicants.length" class="candidate-table">
        <div class="table-heading" aria-hidden="true">
          <span>Candidate</span><span>Applied role</span><span>Location</span><span>Applied</span><span>Stage</span><span></span>
        </div>
        <ul>
          <li v-for="applicant in applicants" :key="applicant.id">
            <button type="button" class="candidate-row" :aria-label="`Review the application from ${applicantName(applicant)}`" @click="reviewApplicant(applicant)">
              <span class="candidate-cell">
                <img v-if="applicantAvatarUrls[applicant.id]" class="candidate-avatar candidate-photo" :src="applicantAvatarUrls[applicant.id]" :alt="`${applicantName(applicant)}'s profile photo`" />
                <span v-else class="candidate-avatar" :class="`avatar-${applicantAvatarColor(applicant.id)}`" aria-hidden="true">{{ applicantInitials(applicant) }}</span>
                <span class="candidate-name"><strong>{{ applicantName(applicant) }}</strong><small>{{ applicant.candidate.headline || 'No headline provided' }}</small></span>
              </span>
              <span class="role-cell"><strong>{{ applicant.job.title }}</strong><small>{{ applicant.job.company }}</small></span>
              <span class="location-cell">{{ applicant.candidate.location || applicant.job.location || 'Not provided' }}</span>
              <span class="applied-cell">{{ relativeApplicationDate(applicant.appliedAt) }}</span>
              <span class="applicant-status" :class="statusClass(applicant.status)">{{ applicantStatusLabel(applicant.status) }}</span>
              <span class="open-profile"><span>Review application</span><UiIcon name="chevron" :size="17" /></span>
            </button>
          </li>
        </ul>
      </div>

      <div v-else class="candidate-empty">
        <strong>{{ props.search || selectedFilter !== 'All' ? 'No matching applications' : 'No applications yet' }}</strong>
        <p>{{ props.search || selectedFilter !== 'All' ? 'Try another stage or clear the search field.' : 'Applications will appear here when a candidate applies to one of your jobs.' }}</p>
        <button v-if="props.search || selectedFilter !== 'All'" type="button" @click="chooseFilter('All')">Show all applications</button>
      </div>

      <nav v-if="!loading && !error && totalPages > 1" class="applicant-pagination" aria-label="Applicant pages">
        <button type="button" :disabled="page <= 1" @click="loadApplicants(page - 1)">Previous</button>
        <span>Page {{ page }} of {{ totalPages }}</span>
        <button type="button" :disabled="page >= totalPages" @click="loadApplicants(page + 1)">Next</button>
      </nav>
    </section>

  </div>
</template>

<style scoped>
.company-page { color: var(--ink); }
.review-summary { min-width: 142px; padding: 10px 14px; border-left: 2px solid var(--accent); display: grid; gap: 4px; }
.review-summary strong { color: var(--ink); font-size: 25px; font-weight: 650; line-height: 1; font-variant-numeric: tabular-nums; }
.review-summary span { color: var(--muted); font-size: 13px; }
.candidate-directory { overflow: hidden; border: 1px solid var(--line); border-radius: 12px; background: #fff; box-shadow: 0 8px 24px rgb(11 43 130 / 4%); }
.directory-heading { min-height: 86px; padding: 18px 24px; border-bottom: 1px solid var(--line); display: flex; align-items: center; justify-content: space-between; gap: 20px; }
.directory-heading h3 { margin: 0; color: var(--ink); font-size: 20px; font-weight: 650; letter-spacing: -.02em; }
.directory-heading p { margin: 5px 0 0; color: var(--muted); font-size: 13px; }
.directory-heading > span { color: #6f7a9a; font-size: 13px; font-variant-numeric: tabular-nums; white-space: nowrap; }
.applicant-filters { padding: 12px 18px; border-bottom: 1px solid var(--line); display: flex; gap: 7px; overflow-x: auto; scrollbar-width: thin; }
.applicant-filters button { min-height: 35px; padding: 0 11px; border: 1px solid transparent; border-radius: 7px; display: inline-flex; align-items: center; gap: 7px; background: transparent; color: #667397; font-size: 12px; font-weight: 550; white-space: nowrap; cursor: pointer; }
.applicant-filters button:hover { background: #f7f5fc; color: #40377e; }
.applicant-filters button.active { border-color: #dcd6fa; background: #f2efff; color: #5038c6; }
.applicant-filters button span { display: grid; min-width: 20px; height: 20px; place-items: center; padding: 0 5px; border-radius: 5px; background: #fff; font-size: 10px; font-variant-numeric: tabular-nums; }
.candidate-table { min-width: 0; }
.table-heading, .candidate-row { display: grid; grid-template-columns: minmax(220px, 1.25fr) minmax(180px, 1fr) minmax(145px, .8fr) 105px 125px 110px; align-items: center; gap: 16px; }
.table-heading { min-height: 44px; padding: 0 24px; border-bottom: 1px solid #ebe9f3; background: #fbfaff; color: #7b849f; font-size: 10px; font-weight: 700; letter-spacing: .055em; text-transform: uppercase; }
.candidate-table ul { margin: 0; padding: 0; list-style: none; }
.candidate-table li + li { border-top: 1px solid #efedf6; }
.candidate-row { width: 100%; min-height: 76px; padding: 12px 24px; border: 0; background: #fff; color: inherit; text-align: left; cursor: pointer; transition: background 150ms ease; }
.candidate-row:hover { background: #faf9ff; }
.candidate-row:focus-visible { position: relative; z-index: 1; outline: 2px solid #7661e4; outline-offset: -2px; }
.candidate-cell { display: flex; align-items: center; min-width: 0; gap: 12px; }
.candidate-avatar { width: 42px; height: 42px; flex: 0 0 42px; border-radius: 10px; display: grid; place-items: center; font-size: 12px; font-weight: 700; }
.candidate-photo { border: 1px solid #dce1eb; display: block; object-fit: cover; }
.avatar-coral { background: #fff0f1; color: #9b5262; }
.avatar-blue { background: #eaf1ff; color: #315eaa; }
.avatar-purple { background: #f0edff; color: #604bd0; }
.avatar-orange { background: #fff3e4; color: #91602c; }
.candidate-name, .role-cell { min-width: 0; display: grid; gap: 4px; }
.candidate-name strong, .role-cell strong { overflow: hidden; color: #172653; font-size: 13px; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
.candidate-name small, .role-cell small { overflow: hidden; color: #7b85a3; font-size: 10px; font-weight: 450; text-overflow: ellipsis; white-space: nowrap; }
.location-cell, .applied-cell { overflow: hidden; color: #526184; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.applicant-status { width: max-content; min-height: 28px; padding: 5px 10px; border: 1px solid; border-radius: 999px; display: inline-flex; align-items: center; font-size: 11px; font-weight: 650; letter-spacing: .01em; line-height: 1; white-space: nowrap; }
.status-new { border-color: #b6d5ef; background: #f1f7ff; color: #21649f; }
.status-under-review { border-color: #c6d4ed; background: #f5f8ff; color: #45628e; }
.status-interview { border-color: #b5e1d5; background: #effaf7; color: #227565; }
.status-shortlisted { border-color: #d0c4f2; background: #f7f3ff; color: #5b46c6; }
.status-offer-sent { border-color: #f0d5a7; background: #fff9eb; color: #8b6420; }
.status-hired { border-color: #b8e1c5; background: #f0faf3; color: #2f7b4e; }
.status-rejected { border-color: #ebc3ca; background: #fff4f5; color: #a04e5b; }
.status-withdrawn { border-color: #d8dbe5; background: #f5f6f9; color: #65708a; }
.open-profile { display: inline-flex; align-items: center; justify-content: flex-end; gap: 6px; color: #5947bc; font-size: 11px; font-weight: 650; white-space: nowrap; }
.open-profile :deep(svg) { transform: rotate(0deg); }
.applicant-feedback { min-height: 220px; margin: 0; padding: 28px; display: grid; place-content: center; justify-items: center; gap: 12px; color: #677391; font-size: 13px; text-align: center; }
.applicant-error { color: #9b4653; }
.applicant-error button { min-height: 36px; padding: 0 13px; border: 1px solid #d8c9f1; border-radius: 7px; background: #fff; color: #5541bc; font-size: 12px; font-weight: 650; cursor: pointer; }
.applicant-pagination { min-height: 64px; padding: 12px 20px; border-top: 1px solid #efedf6; display: flex; align-items: center; justify-content: center; gap: 18px; color: #697492; font-size: 12px; }
.applicant-pagination button { min-height: 34px; padding: 0 12px; border: 1px solid #ddd9eb; border-radius: 7px; background: #fff; color: #5143a2; font: inherit; font-weight: 650; cursor: pointer; }
.applicant-pagination button:disabled { color: #a3a8b8; cursor: not-allowed; }
.candidate-empty { min-height: 300px; padding: 40px; display: grid; place-content: center; justify-items: center; text-align: center; }
.candidate-empty strong { color: var(--ink); font-size: 17px; }
.candidate-empty p { margin: 7px 0 0; color: var(--muted); font-size: 13px; }
.candidate-empty button { margin-top: 14px; border: 0; background: transparent; color: #5945c9; font-size: 13px; font-weight: 650; cursor: pointer; }
.candidate-modal-backdrop { position: fixed; z-index: 120; inset: 0; display: grid; place-items: center; padding: 28px; background: rgb(15 20 46 / 58%); backdrop-filter: blur(3px); }
.candidate-modal { width: min(900px, 100%); max-height: min(820px, calc(100vh - 56px)); max-height: min(820px, calc(100dvh - 56px)); overflow: hidden; display: grid; grid-template-rows: auto minmax(0, 1fr) auto; border: 1px solid #ded9ed; border-radius: 16px; background: #fff; color: #152044; box-shadow: 0 28px 80px rgb(10 15 44 / 28%); }
.modal-scroll { min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
.modal-toolbar { min-height: 66px; padding: 13px 18px 13px 24px; border-bottom: 1px solid #ebe8f3; display: flex; align-items: center; justify-content: space-between; gap: 18px; }
.modal-toolbar > div { display: grid; gap: 3px; }
.modal-toolbar span { color: #1c294f; font-size: 14px; font-weight: 700; }
.modal-toolbar small { color: #7d869f; font-size: 10px; }
.modal-toolbar button { width: 38px; height: 38px; border: 1px solid #e1ddec; border-radius: 8px; display: grid; place-items: center; background: #fff; color: #536184; cursor: pointer; }
.modal-toolbar button:hover { border-color: #cfc7ee; background: #f8f6ff; color: #4934bd; }
.candidate-identity { padding: 25px 26px; display: flex; align-items: center; justify-content: space-between; gap: 22px; }
.identity-main { display: flex; align-items: center; min-width: 0; gap: 15px; }
.avatar-large { width: 64px; height: 64px; flex-basis: 64px; border-radius: 15px; font-size: 17px; }
.identity-main h3 { margin: 0; color: #101a3d; font-size: 28px; font-weight: 700; letter-spacing: -.035em; }
.identity-main h3 a { width: fit-content; display: inline-flex; align-items: center; gap: 6px; color: inherit; text-decoration: none; }
.identity-main h3 a :deep(svg) { color: #7560df; transition: transform 150ms ease; }
.identity-main h3 a:hover { color: #4934bd; }
.identity-main h3 a:hover :deep(svg) { transform: translateX(3px); }
.identity-main h3 a:focus-visible { border-radius: 4px; outline: 3px solid rgb(123 102 255 / 25%); outline-offset: 4px; }
.identity-main p { margin: 6px 0 0; color: #65718f; font-size: 13px; }
.identity-status { flex: 0 0 auto; }
.candidate-facts { display: grid; grid-template-columns: repeat(4, 1fr); margin: 0 26px; padding: 17px 0; border-top: 1px solid #ebe8f3; border-bottom: 1px solid #ebe8f3; }
.candidate-facts div { min-width: 0; padding: 0 16px; }
.candidate-facts div + div { border-left: 1px solid #ebe8f3; }
.candidate-facts dt { color: #8089a1; font-size: 10px; }
.candidate-facts dd { margin: 5px 0 0; overflow: hidden; color: #2b375c; font-size: 12px; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
.modal-content { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(250px, .65fr); gap: 0; padding: 24px 26px 26px; }
.profile-main { padding-right: 26px; }
.profile-main section + section { margin-top: 24px; padding-top: 22px; border-top: 1px solid #ebe8f3; }
.profile-main h4, .profile-aside h4 { margin: 0; color: #1e294e; font-size: 14px; font-weight: 700; }
.profile-main p { margin: 9px 0 0; color: #5e6986; font-size: 13px; line-height: 1.75; }
.profile-aside { padding-left: 25px; border-left: 1px solid #ebe8f3; }
.section-title-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.section-title-row > span { display: grid; width: 22px; height: 22px; place-items: center; border-radius: 50%; background: #f0edff; color: #5742c7; font-size: 10px; font-weight: 700; }
.skill-list { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 12px; }
.skill-list span { padding: 6px 9px; border-radius: 6px; background: #f2f0fb; color: #4f5e85; font-size: 10px; font-weight: 600; }
.stage-control { display: grid; gap: 7px; margin-top: 23px; padding-top: 21px; border-top: 1px solid #ebe8f3; color: #344266; font-size: 11px; font-weight: 700; }
.stage-control select { width: 100%; min-height: 41px; padding: 0 10px; border: 1px solid #dcd7ed; border-radius: 8px; background: #fff; color: #263458; font: inherit; font-size: 12px; outline: 0; }
.stage-control select:focus { border-color: #7560e0; box-shadow: 0 0 0 3px #6d51d914; }
.stage-control small { color: #8a91a6; font-size: 9px; font-weight: 450; }
.status-feedback { margin: 10px 0 0; color: #347553; font-size: 11px; line-height: 1.5; }
.status-error { color: #a34d59; }
.modal-actions { min-height: 69px; padding: 13px 22px 13px 26px; border-top: 1px solid #ebe8f3; display: flex; align-items: center; justify-content: space-between; gap: 18px; background: #fcfbff; }
.modal-actions p { margin: 0; color: #7a839b; font-size: 10px; }
.modal-actions button { min-width: 104px; min-height: 40px; padding: 0 15px; border: 0; border-radius: 8px; background: #4930ce; color: #fff; font-size: 12px; font-weight: 700; cursor: pointer; }
.modal-actions button:hover { background: #3822b7; }
@media (max-width: 1180px) {
  .table-heading, .candidate-row { grid-template-columns: minmax(210px, 1.3fr) minmax(170px, 1fr) minmax(130px, .8fr) 95px 120px 24px; }
  .open-profile span { display: none; }
}
@media (max-width: 900px) {
  .table-heading { display: none; }
  .candidate-table li + li { border-top: 0; }
  .candidate-table ul { display: grid; gap: 10px; padding: 12px; background: #f8f7fc; }
  .candidate-row { grid-template-columns: minmax(0, 1fr) auto; gap: 9px 16px; min-height: 0; padding: 16px; border: 1px solid #e7e3f0; border-radius: 10px; }
  .candidate-cell { grid-column: 1; }
  .role-cell { grid-column: 1; padding-left: 54px; }
  .location-cell, .applied-cell { grid-column: 1; padding-left: 54px; }
  .location-cell::before { content: 'Location  '; color: #8a92a8; font-size: 9px; text-transform: uppercase; }
  .applied-cell::before { content: 'Applied  '; color: #8a92a8; font-size: 9px; text-transform: uppercase; }
  .applicant-status { grid-column: 2; grid-row: 1; align-self: start; }
  .open-profile { grid-column: 2; grid-row: 2 / 5; align-self: center; }
  .modal-content { grid-template-columns: 1fr; }
  .profile-main { padding-right: 0; }
  .profile-aside { margin-top: 23px; padding: 23px 0 0; border-top: 1px solid #ebe8f3; border-left: 0; }
}
@media (max-width: 620px) {
  .review-summary { min-width: 0; }
  .directory-heading { align-items: flex-start; padding: 17px; }
  .directory-heading p { max-width: 230px; line-height: 1.5; }
  .applicant-filters { padding-inline: 12px; }
  .candidate-modal-backdrop { align-items: end; padding: 0; }
  .candidate-modal { width: 100%; max-height: 92vh; max-height: 92dvh; border-radius: 16px 16px 0 0; }
  .candidate-identity { align-items: flex-start; padding: 21px 19px; }
  .identity-main { align-items: flex-start; }
  .avatar-large { width: 54px; height: 54px; flex-basis: 54px; border-radius: 13px; }
  .identity-main h3 { font-size: 23px; }
  .candidate-facts { grid-template-columns: 1fr 1fr; margin: 0 19px; padding: 0; }
  .candidate-facts div { padding: 14px 10px; }
  .candidate-facts div:nth-child(3) { border-top: 1px solid #ebe8f3; border-left: 0; }
  .candidate-facts div:nth-child(4) { border-top: 1px solid #ebe8f3; }
  .modal-content { padding: 21px 19px 23px; }
  .modal-actions { align-items: stretch; flex-direction: column; padding: 14px 19px; }
  .modal-actions button { width: 100%; }
}
@media (max-width: 430px) {
  .candidate-row { grid-template-columns: minmax(0, 1fr); }
  .applicant-status { grid-column: 1; grid-row: auto; margin-left: 54px; }
  .open-profile { display: none; }
  .candidate-identity { flex-direction: column; gap: 14px; }
  .identity-status { display: inline-flex; margin-left: 69px; }
}

:global(.company-shell.theme-dark) .candidate-directory { background: var(--surface-raised); box-shadow: 0 8px 24px rgb(0 0 0 / 16%); }
:global(.company-shell.theme-dark) .directory-heading > span,
:global(.company-shell.theme-dark) .applicant-filters button,
:global(.company-shell.theme-dark) .candidate-name small,
:global(.company-shell.theme-dark) .role-cell small,
:global(.company-shell.theme-dark) .location-cell,
:global(.company-shell.theme-dark) .applied-cell,
:global(.company-shell.theme-dark) .applicant-feedback,
:global(.company-shell.theme-dark) .applicant-pagination { color: var(--muted); }
:global(.company-shell.theme-dark) .directory-heading,
:global(.company-shell.theme-dark) .applicant-filters,
:global(.company-shell.theme-dark) .candidate-table li + li,
:global(.company-shell.theme-dark) .applicant-pagination { border-color: var(--line); }
:global(.company-shell.theme-dark) .applicant-filters button:hover,
:global(.company-shell.theme-dark) .candidate-row:hover { background: var(--surface); color: var(--ink); }
:global(.company-shell.theme-dark) .applicant-filters button.active { border-color: #554a82; background: var(--accent-soft); color: var(--accent-dark); }
:global(.company-shell.theme-dark) .applicant-filters button span { background: #222b3a; color: var(--ink-soft); }
:global(.company-shell.theme-dark) .table-heading { border-color: var(--line); background: var(--surface); color: var(--muted); }
:global(.company-shell.theme-dark) .candidate-row { background: var(--surface-raised); }
:global(.company-shell.theme-dark) .candidate-name strong,
:global(.company-shell.theme-dark) .role-cell strong { color: var(--ink); }
:global(.company-shell.theme-dark) .avatar-coral { background: #432a35; color: #f1a7b5; }
:global(.company-shell.theme-dark) .avatar-blue { background: #263753; color: #9dc4ff; }
:global(.company-shell.theme-dark) .avatar-purple { background: #302a4e; color: #c4b6ff; }
:global(.company-shell.theme-dark) .avatar-orange { background: #473726; color: #f0bd7a; }
:global(.company-shell.theme-dark) .status-new { border-color: #315a79; background: #1c3346; color: #91c7ee; }
:global(.company-shell.theme-dark) .status-under-review { border-color: #3c506e; background: #222e43; color: #b6c7e6; }
:global(.company-shell.theme-dark) .status-interview { border-color: #2d6459; background: #1d3b36; color: #9be0ce; }
:global(.company-shell.theme-dark) .status-shortlisted { border-color: #51457e; background: #30294b; color: #c4b2ff; }
:global(.company-shell.theme-dark) .status-offer-sent { border-color: #725d36; background: #3c3220; color: #e7c582; }
:global(.company-shell.theme-dark) .status-hired { border-color: #366348; background: #21392b; color: #a9dfb9; }
:global(.company-shell.theme-dark) .status-rejected { border-color: #713d49; background: #402730; color: #f0adb8; }
:global(.company-shell.theme-dark) .status-withdrawn { border-color: #40495a; background: #272f3c; color: #b0bbce; }
:global(.company-shell.theme-dark) .open-profile,
:global(.company-shell.theme-dark) .candidate-empty button { color: var(--accent-dark); }
:global(.company-shell.theme-dark) .applicant-feedback.applicant-error,
:global(.company-shell.theme-dark) .applicant-error { color: #f0a5b2; }
:global(.company-shell.theme-dark) .applicant-error button,
:global(.company-shell.theme-dark) .applicant-pagination button { border-color: var(--line-strong); background: var(--surface); color: var(--accent-dark); }
:global(.company-shell.theme-dark) .applicant-pagination button:disabled { color: #a0abc0; }
:global(.company-shell.theme-dark) .candidate-table ul { background: var(--surface); }
:global(.company-shell.theme-dark) .candidate-row { border-color: var(--line); }
:global(.company-shell.theme-dark) .location-cell::before,
:global(.company-shell.theme-dark) .applied-cell::before { color: var(--muted); }

:global(.company-shell.theme-dark .applicants-page .directory-heading h3),
:global(.company-shell.theme-dark .applicants-page .candidate-name strong),
:global(.company-shell.theme-dark .applicants-page .role-cell strong) { color: #edf1f7 !important; }
:global(.company-shell.theme-dark .applicants-page :is(.directory-heading p, .directory-heading > span, .applicant-filters button, .candidate-name small, .role-cell small, .location-cell, .applied-cell, .table-heading, .applicant-feedback, .applicant-pagination, .candidate-empty p)) { color: #b9c4d6 !important; }
:global(.company-shell.theme-dark .applicants-page .candidate-directory),
:global(.company-shell.theme-dark .applicants-page .candidate-row) { border-color: #2c3545; background-color: #1c2533; }
:global(.company-shell.theme-dark .applicants-page .candidate-table li + li),
:global(.company-shell.theme-dark .applicants-page .directory-heading),
:global(.company-shell.theme-dark .applicants-page .applicant-filters),
:global(.company-shell.theme-dark .applicants-page .applicant-pagination) { border-color: #2c3545; }
:global(.company-shell.theme-dark .applicants-page .applicant-filters button.active) { border-color: #51478a; background: #2b2744; color: #cfc6ff !important; }
:global(.company-shell.theme-dark .applicants-page .candidate-row:hover) { background: #171e2a; }
:global(.company-shell.theme-dark .applicants-page .candidate-photo) { border-color: #455268; }
</style>
