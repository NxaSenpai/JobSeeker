<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import CompanyPageHeader from '@/components/company/CompanyPageHeader.vue'
import UiIcon from '@/components/company/UiIcon.vue'
import {
  companyApplicants,
  companyJobs,
  relativeApplicationDate,
  updateApplicantStatus,
  type ApplicantStatus,
} from '@/services/companyWorkspace'

type ApplicantFilter = 'All' | ApplicantStatus

const props = withDefaults(defineProps<{ search?: string }>(), { search: '' })
const selectedFilter = ref<ApplicantFilter>('All')
const selectedId = ref('')
const statuses: ApplicantStatus[] = ['New', 'Under review', 'Interview', 'Shortlisted', 'Hired', 'Rejected']

const filters = computed(() => [
  { label: 'All' as const, count: companyApplicants.value.length },
  ...statuses.map(label => ({ label, count: companyApplicants.value.filter(item => item.status === label).length })),
])

const filteredApplicants = computed(() => companyApplicants.value.filter(applicant => {
  const matchesFilter = selectedFilter.value === 'All' || applicant.status === selectedFilter.value
  const query = props.search.trim().toLocaleLowerCase()
  const job = companyJobs.value.find(item => item.id === applicant.jobId)
  const haystack = `${applicant.name} ${applicant.role} ${job?.title ?? ''} ${applicant.location} ${applicant.status} ${applicant.source}`
  return matchesFilter && (!query || haystack.toLocaleLowerCase().includes(query))
}))

const selectedApplicant = computed(() => companyApplicants.value.find(applicant => applicant.id === selectedId.value) ?? null)
const selectedJob = computed(() => companyJobs.value.find(job => job.id === selectedApplicant.value?.jobId))
const reviewCount = computed(() => companyApplicants.value.filter(applicant => applicant.status === 'New' || applicant.status === 'Under review').length)

function chooseFilter(label: ApplicantFilter) {
  selectedFilter.value = label
}

function openApplicant(id: string) {
  selectedId.value = id
}

function closeApplicant() {
  selectedId.value = ''
}

function changeStatus(event: Event) {
  const status = (event.target as HTMLSelectElement).value as ApplicantStatus
  if (selectedApplicant.value) updateApplicantStatus(selectedApplicant.value.id, status)
}

function statusClass(status: string) {
  return `status-${status.toLowerCase().replaceAll(' ', '-')}`
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape' && selectedApplicant.value) closeApplicant()
}

watch(selectedApplicant, applicant => {
  document.body.style.overflow = applicant ? 'hidden' : ''
})
onMounted(() => window.addEventListener('keydown', handleEscape))
onBeforeUnmount(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', handleEscape)
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
        <div><h3 id="candidate-list-heading">Candidate list</h3><p>Open a candidate to review their complete profile.</p></div>
        <span>{{ filteredApplicants.length }} of {{ companyApplicants.length }}</span>
      </header>

      <div class="applicant-filters" role="group" aria-label="Filter applicants by stage">
        <button
          v-for="filter in filters"
          :key="filter.label"
          type="button"
          :aria-pressed="selectedFilter === filter.label"
          :class="{ active: selectedFilter === filter.label }"
          @click="chooseFilter(filter.label)"
        >
          {{ filter.label }} <span>{{ filter.count }}</span>
        </button>
      </div>

      <div v-if="filteredApplicants.length" class="candidate-table">
        <div class="table-heading" aria-hidden="true">
          <span>Candidate</span><span>Applied role</span><span>Location</span><span>Applied</span><span>Stage</span><span></span>
        </div>
        <ul>
          <li v-for="applicant in filteredApplicants" :key="applicant.id">
            <button type="button" class="candidate-row" :aria-label="`Review ${applicant.name}`" @click="openApplicant(applicant.id)">
              <span class="candidate-cell">
                <span class="candidate-avatar" :class="`avatar-${applicant.color}`">{{ applicant.initials }}</span>
                <span class="candidate-name"><strong>{{ applicant.name }}</strong><small>{{ applicant.experience }}</small></span>
              </span>
              <span class="role-cell"><strong>{{ companyJobs.find(job => job.id === applicant.jobId)?.title ?? applicant.role }}</strong><small>{{ applicant.source }}</small></span>
              <span class="location-cell">{{ applicant.location }}</span>
              <span class="applied-cell">{{ relativeApplicationDate(applicant.appliedAt) }}</span>
              <span class="applicant-status" :class="statusClass(applicant.status)">{{ applicant.status }}</span>
              <span class="open-profile"><span>View profile</span><UiIcon name="chevron" :size="17" /></span>
            </button>
          </li>
        </ul>
      </div>

      <div v-else class="candidate-empty">
        <strong>No matching candidates</strong>
        <p>Try another stage or clear the search field.</p>
        <button type="button" @click="chooseFilter('All')">Show all candidates</button>
      </div>
    </section>

    <Teleport to="body">
      <div v-if="selectedApplicant" class="candidate-modal-backdrop" @mousedown.self="closeApplicant">
        <section class="candidate-modal" role="dialog" aria-modal="true" :aria-labelledby="`candidate-name-${selectedApplicant.id}`">
          <header class="modal-toolbar">
            <div><span>Candidate profile</span><small>Application details</small></div>
            <button type="button" aria-label="Close candidate profile" @click="closeApplicant"><UiIcon name="close" :size="20" /></button>
          </header>

          <div class="modal-scroll">
            <div class="candidate-identity">
              <div class="identity-main">
                <span class="candidate-avatar avatar-large" :class="`avatar-${selectedApplicant.color}`">{{ selectedApplicant.initials }}</span>
                <div>
                  <h3 :id="`candidate-name-${selectedApplicant.id}`">
                    <RouterLink
                      :to="{ name: 'CompanyApplicantProfilePage', params: { id: selectedApplicant.id } }"
                      :aria-label="`Open ${selectedApplicant.name}'s full profile`"
                      @click="closeApplicant"
                    >
                      {{ selectedApplicant.name }}
                    </RouterLink>
                  </h3>
                  <p>{{ selectedApplicant.experience }}</p>
                </div>
              </div>
              <span class="applicant-status identity-status" :class="statusClass(selectedApplicant.status)">{{ selectedApplicant.status }}</span>
            </div>

            <dl class="candidate-facts">
              <div><dt>Applied for</dt><dd>{{ selectedJob?.title ?? selectedApplicant.role }}</dd></div>
              <div><dt>Location</dt><dd>{{ selectedApplicant.location }}</dd></div>
              <div><dt>Applied</dt><dd>{{ relativeApplicationDate(selectedApplicant.appliedAt) }}</dd></div>
              <div><dt>Source</dt><dd>{{ selectedApplicant.source }}</dd></div>
            </dl>

            <div class="modal-content">
              <div class="profile-main">
                <section aria-labelledby="profile-note-heading">
                  <h4 id="profile-note-heading">Profile note</h4>
                  <p>{{ selectedApplicant.summary }}</p>
                </section>
                <section aria-labelledby="application-context-heading">
                  <h4 id="application-context-heading">Application context</h4>
                  <p>{{ selectedApplicant.name }} applied for {{ selectedJob?.title ?? selectedApplicant.role }} from {{ selectedApplicant.location }}.</p>
                </section>
              </div>

              <aside class="profile-aside">
                <section aria-labelledby="candidate-skills-heading">
                  <div class="section-title-row"><h4 id="candidate-skills-heading">Relevant skills</h4><span>{{ selectedApplicant.skills.length }}</span></div>
                  <div class="skill-list"><span v-for="skill in selectedApplicant.skills" :key="skill">{{ skill }}</span></div>
                </section>
                <label class="stage-control">
                  <span>Application stage</span>
                  <select :value="selectedApplicant.status" @change="changeStatus">
                    <option v-for="status in statuses" :key="status">{{ status }}</option>
                  </select>
                </label>
              </aside>
            </div>
          </div>

          <footer class="modal-actions">
            <p>   </p>
            <button type="button" @click="closeApplicant">Done</button>
          </footer>
        </section>
      </div>
    </Teleport>
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
.avatar-coral { background: #fff0f1; color: #9b5262; }
.avatar-blue { background: #eaf1ff; color: #315eaa; }
.avatar-purple { background: #f0edff; color: #604bd0; }
.avatar-orange { background: #fff3e4; color: #91602c; }
.candidate-name, .role-cell { min-width: 0; display: grid; gap: 4px; }
.candidate-name strong, .role-cell strong { overflow: hidden; color: #172653; font-size: 13px; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
.candidate-name small, .role-cell small { overflow: hidden; color: #7b85a3; font-size: 10px; font-weight: 450; text-overflow: ellipsis; white-space: nowrap; }
.location-cell, .applied-cell { overflow: hidden; color: #526184; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.applicant-status { width: max-content; padding: 6px 9px; border-radius: 6px; font-size: 11px; font-weight: 650; white-space: nowrap; }
.status-new { background: #f2efff; color: #5b46cd; }
.status-under-review { background: #eaf1ff; color: #355b9c; }
.status-interview { background: #e7f7f4; color: #287966; }
.status-shortlisted { background: #eeeaff; color: #5540c3; }
.status-hired { background: #e9f7ef; color: #26734d; }
.status-rejected { background: #fff0f1; color: #9b5262; }
.open-profile { display: inline-flex; align-items: center; justify-content: flex-end; gap: 6px; color: #5947bc; font-size: 11px; font-weight: 650; white-space: nowrap; }
.open-profile :deep(svg) { transform: rotate(0deg); }
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
</style>
