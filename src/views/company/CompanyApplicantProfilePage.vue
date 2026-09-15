<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UiIcon from '@/components/company/UiIcon.vue'
import {
  companyApplicants,
  companyJobs,
  relativeApplicationDate,
  updateApplicantStatus,
  type ApplicantStatus,
} from '@/services/companyWorkspace'

type CandidateBackground = {
  email: string
  availability: string
  workMode: string
  languages: string[]
  education: string
  currentCompany: string
  currentPeriod: string
  previousRole: string
  previousCompany: string
  previousPeriod: string
  resumeFile: string
  achievements: string[]
}

const backgrounds: Record<string, CandidateBackground> = {
  'ava-williams': {
    email: 'ava.williams@example.com', availability: 'Available in 4 weeks', workMode: 'Hybrid or remote', languages: ['English', 'Khmer'],
    education: 'B.A. Visual Communication · RMIT University', currentCompany: 'Northstar Labs', currentPeriod: '2022 – Present',
    previousRole: 'Product Designer', previousCompany: 'Fieldnote Studio', previousPeriod: '2019 – 2022', resumeFile: 'Ava_Williams_Product_Design.pdf',
    achievements: ['Led discovery and interaction design for two B2B products from first research through launch.', 'Built an accessible component library that shortened design handoff and review cycles.', 'Partnered with product and engineering teams to turn customer research into quarterly priorities.'],
  },
  'james-miller': {
    email: 'james.miller@example.com', availability: 'Available in 2 weeks', workMode: 'Remote', languages: ['English'],
    education: 'B.Sc. Computer Science · University of Leeds', currentCompany: 'Atlas Commerce', currentPeriod: '2021 – Present',
    previousRole: 'Frontend Engineer', previousCompany: 'Cloudline Digital', previousPeriod: '2018 – 2021', resumeFile: 'James_Miller_Frontend.pdf',
    achievements: ['Modernized a multi-market storefront using Vue and TypeScript.', 'Improved core page performance and established accessible component standards.', 'Supported frontend hiring and mentored three early-career engineers.'],
  },
  'sophia-lee': {
    email: 'sophia.lee@example.com', availability: 'Available now', workMode: 'Hybrid', languages: ['English', 'Mandarin'],
    education: 'B.B.A. Marketing · National University of Singapore', currentCompany: 'Common Ground', currentPeriod: '2022 – Present',
    previousRole: 'Growth Marketing Executive', previousCompany: 'Marigold', previousPeriod: '2020 – 2022', resumeFile: 'Sophia_Lee_Marketing.pdf',
    achievements: ['Owned lifecycle programs across onboarding, activation, and retention.', 'Connected campaign reporting with product analytics to improve weekly decisions.', 'Built a repeatable content testing process with design and commercial teams.'],
  },
  'daniel-kim': {
    email: 'daniel.kim@example.com', availability: 'Available in 4 weeks', workMode: 'On-site or hybrid', languages: ['English', 'Korean'],
    education: 'M.B.A. · Yonsei University', currentCompany: 'Relay Systems', currentPeriod: '2020 – Present',
    previousRole: 'Associate Product Manager', previousCompany: 'Brightworks', previousPeriod: '2017 – 2020', resumeFile: 'Daniel_Kim_Product.pdf',
    achievements: ['Owned a B2B workflow product from discovery through regional launch.', 'Introduced a research cadence that gave customer teams a direct route into planning.', 'Aligned product, engineering, and sales around measurable quarterly outcomes.'],
  },
  'maria-garcia': {
    email: 'maria.garcia@example.com', availability: 'Available in 2 weeks', workMode: 'Remote', languages: ['English', 'Spanish'],
    education: 'B.Sc. Software Engineering · UPC Barcelona', currentCompany: 'Juniper Works', currentPeriod: '2023 – Present',
    previousRole: 'Junior Web Developer', previousCompany: 'Nook Studio', previousPeriod: '2021 – 2023', resumeFile: 'Maria_Garcia_Frontend.pdf',
    achievements: ['Ships customer-facing Vue features in a shared TypeScript codebase.', 'Created visual regression coverage for the team’s highest-traffic journeys.', 'Works closely with design to maintain responsive, reusable components.'],
  },
  'ravi-patel': {
    email: 'ravi.patel@example.com', availability: 'Available in 6 weeks', workMode: 'Remote', languages: ['English', 'Hindi'],
    education: 'B.Tech. Information Technology · Nirma University', currentCompany: 'Harbor Data', currentPeriod: '2020 – Present',
    previousRole: 'Software Engineer', previousCompany: 'Stackbridge', previousPeriod: '2016 – 2020', resumeFile: 'Ravi_Patel_Backend.pdf',
    achievements: ['Designed APIs and data services used by high-volume customer workflows.', 'Reduced incident recovery time through clearer observability and service ownership.', 'Mentors engineers on API design, database performance, and production readiness.'],
  },
  'nita-soth': {
    email: 'nita.soth@example.com', availability: 'Available in 3 weeks', workMode: 'Hybrid', languages: ['Khmer', 'English'],
    education: 'B.A. Digital Media · Limkokwing University', currentCompany: 'Mekong Product Co.', currentPeriod: '2021 – Present',
    previousRole: 'UX Designer', previousCompany: 'Lotus Labs', previousPeriod: '2019 – 2021', resumeFile: 'Nita_Soth_Product_Design.pdf',
    achievements: ['Led research and interaction design for mobile financial tools.', 'Established a small design system shared by product teams.', 'Turns usability findings into clear product and content recommendations.'],
  },
  'david-chen': {
    email: 'david.chen@example.com', availability: 'Available now', workMode: 'Remote', languages: ['English', 'Mandarin'],
    education: 'B.Sc. Statistics · Monash University', currentCompany: 'Signal House', currentPeriod: '2022 – Present',
    previousRole: 'Business Intelligence Analyst', previousCompany: 'Northbank Retail', previousPeriod: '2020 – 2022', resumeFile: 'David_Chen_Data_Analyst.pdf',
    achievements: ['Built reporting used in weekly product and commercial planning.', 'Defined shared metrics that reduced conflicting analysis across teams.', 'Partners with product managers on experiments and decision-ready summaries.'],
  },
  'pich-sokha': {
    email: 'sokha.pich@example.com', availability: 'Available in 4 weeks', workMode: 'Hybrid', languages: ['Khmer', 'English'],
    education: 'B.Sc. Information Technology · RUPP', currentCompany: 'Kiri Software', currentPeriod: '2021 – Present',
    previousRole: 'Quality Assurance Engineer', previousCompany: 'Angkor Digital', previousPeriod: '2018 – 2021', resumeFile: 'Pich_Sokha_QA.pdf',
    achievements: ['Built browser and API suites for critical customer journeys.', 'Moved regression checks into CI and improved release confidence.', 'Works with engineers early to make requirements testable and risks visible.'],
  },
  'lina-martin': {
    email: 'lina.martin@example.com', availability: 'Available in 3 weeks', workMode: 'Remote or hybrid', languages: ['English', 'French'],
    education: 'M.Sc. Human–Computer Interaction · UCL', currentCompany: 'Kindred Research', currentPeriod: '2021 – Present',
    previousRole: 'UX Research Associate', previousCompany: 'Pattern Works', previousPeriod: '2019 – 2021', resumeFile: 'Lina_Martin_UX_Research.pdf',
    achievements: ['Plans qualitative studies across discovery and usability testing.', 'Creates concise research outputs that teams can use during planning.', 'Coaches product partners on interviewing, synthesis, and evidence quality.'],
  },
}

const statuses: ApplicantStatus[] = ['New', 'Under review', 'Interview', 'Shortlisted', 'Hired', 'Rejected']
const route = useRoute()
const router = useRouter()
const applicant = computed(() => companyApplicants.value.find(item => item.id === String(route.params.id)))
const job = computed(() => companyJobs.value.find(item => item.id === applicant.value?.jobId))
const background = computed(() => applicant.value ? backgrounds[applicant.value.id] : undefined)

function changeStatus(event: Event) {
  if (applicant.value) updateApplicantStatus(applicant.value.id, (event.target as HTMLSelectElement).value as ApplicantStatus)
}

function returnToApplicants() {
  if (window.history.length > 1) router.back()
  else void router.push({ name: 'CompanyApplicantsPage' })
}

function statusClass(status: string) {
  return `status-${status.toLowerCase().replaceAll(' ', '-')}`
}
</script>

<template>
  <div v-if="applicant && background" class="candidate-profile-page">
    <button type="button" class="back-button" @click="returnToApplicants">
      <UiIcon name="chevron" :size="17" />
      Back to applicants
    </button>

    <section class="profile-overview" :aria-labelledby="`profile-name-${applicant.id}`">
      <div class="identity-row">
        <div class="identity-main">
          <div class="profile-avatar" :class="`avatar-${applicant.color}`" aria-hidden="true">{{ applicant.initials }}</div>
          <div class="identity-copy">
            <div class="name-line">
              <h1 :id="`profile-name-${applicant.id}`">{{ applicant.name }}</h1>
              <span class="status-pill" :class="statusClass(applicant.status)">{{ applicant.status }}</span>
            </div>
            <p>{{ applicant.role }}</p>
            <div class="identity-meta"><a :href="`mailto:${background.email}`"><b aria-hidden="true">@</b>{{ background.email }}</a><span><b aria-hidden="true">⌖</b>{{ applicant.location }}</span></div>
          </div>
        </div>
        <label class="stage-control">
          <span>Application stage</span>
          <select :value="applicant.status" @change="changeStatus"><option v-for="status in statuses" :key="status">{{ status }}</option></select>
        </label>
      </div>

      <dl class="profile-summary">
        <div><dt>Applied role</dt><dd>{{ job?.title ?? applicant.role }}</dd></div>
        <div><dt>Experience</dt><dd>{{ applicant.experience }}</dd></div>
        <div><dt>Applied</dt><dd>{{ relativeApplicationDate(applicant.appliedAt) }}</dd></div>
        <div><dt>Availability</dt><dd>{{ background.availability }}</dd></div>
      </dl>
    </section>

    <div class="profile-layout">
      <main class="main-column">
        <section class="profile-card about-card" aria-labelledby="candidate-about-heading">
          <header class="card-heading"><h2 id="candidate-about-heading">About</h2></header>
          <p>{{ applicant.summary }}</p>
        </section>

        <section class="profile-card experience-card" aria-labelledby="candidate-experience-heading">
          <header class="card-heading"><div><h2 id="candidate-experience-heading">Work experience</h2><p>A concise view of the candidate’s recent work.</p></div></header>
          <div class="experience-list">
            <article class="experience-item">
              <div class="company-mark">{{ background.currentCompany.charAt(0) }}</div>
              <div class="experience-copy">
                <div class="experience-heading"><div><h3>{{ applicant.role }}</h3><p>{{ background.currentCompany }} · {{ applicant.location }}</p></div><time>{{ background.currentPeriod }}</time></div>
                <ul><li v-for="achievement in background.achievements" :key="achievement">{{ achievement }}</li></ul>
                <div class="experience-skills"><span v-for="skill in applicant.skills" :key="skill">{{ skill }}</span></div>
              </div>
            </article>
            <article class="experience-item previous-role">
              <div class="company-mark muted-mark">{{ background.previousCompany.charAt(0) }}</div>
              <div class="experience-copy">
                <div class="experience-heading"><div><h3>{{ background.previousRole }}</h3><p>{{ background.previousCompany }}</p></div><time>{{ background.previousPeriod }}</time></div>
              </div>
            </article>
          </div>
        </section>

        <section class="profile-card application-card" aria-labelledby="application-note-heading">
          <header class="card-heading"><div><h2 id="application-note-heading">Application</h2><p>Information connected to this application.</p></div></header>
          <dl class="application-grid">
            <div><dt>Position</dt><dd>{{ job?.title ?? applicant.role }}</dd></div>
            <div><dt>Team</dt><dd>{{ job?.team ?? 'Hiring team' }}</dd></div>
            <div><dt>Work arrangement</dt><dd>{{ job?.arrangement ?? background.workMode }}</dd></div>
            <div><dt>Source</dt><dd>{{ applicant.source }}</dd></div>
          </dl>
        </section>
      </main>

      <aside class="side-column">
        <section class="profile-card skills-card" aria-labelledby="candidate-skills-heading">
          <header class="card-heading compact-heading"><h2 id="candidate-skills-heading">Skills</h2><span>{{ applicant.skills.length }}</span></header>
          <div class="skill-list"><span v-for="skill in applicant.skills" :key="skill">{{ skill }}</span></div>
        </section>

        <section class="profile-card preference-card" aria-labelledby="candidate-preferences-heading">
          <header class="card-heading"><h2 id="candidate-preferences-heading">Preferences</h2></header>
          <dl><div><dt>Work mode</dt><dd>{{ background.workMode }}</dd></div><div><dt>Availability</dt><dd>{{ background.availability }}</dd></div><div><dt>Languages</dt><dd>{{ background.languages.join(' · ') }}</dd></div></dl>
        </section>

        <section class="profile-card education-card" aria-labelledby="candidate-education-heading">
          <header class="card-heading"><h2 id="candidate-education-heading">Education</h2></header>
          <p>{{ background.education }}</p>
        </section>

        <section class="profile-card resume-card" aria-labelledby="candidate-resume-heading">
          <header class="card-heading"><h2 id="candidate-resume-heading">Résumé</h2></header>
          <div class="resume-row"><span class="pdf-mark">PDF</span><div><strong>{{ background.resumeFile }}</strong><small>Shared with this application</small></div></div>
        </section>
      </aside>
    </div>
  </div>

  <section v-else class="missing-profile">
    <span>Candidate profile</span>
    <h1>This profile is unavailable</h1>
    <p>The applicant may have been removed or the link is no longer valid.</p>
    <RouterLink :to="{ name: 'CompanyApplicantsPage' }">Return to applicants</RouterLink>
  </section>
</template>

<style scoped>
.candidate-profile-page { width: min(100%, 1500px); margin: 0 auto; color: #172044; }
.back-button { margin: 0 0 18px; padding: 6px 2px; border: 0; display: inline-flex; align-items: center; gap: 7px; background: transparent; color: #58658a; font-size: 13px; font-weight: 650; cursor: pointer; }
.back-button :deep(svg) { transform: rotate(180deg); }
.back-button:hover { color: #4b34c7; }
.profile-overview, .profile-card, .missing-profile { border: 1px solid #e5e1ef; border-radius: 12px; background: #fff; }
.profile-overview { overflow: hidden; }
.identity-row { min-height: 154px; padding: 27px 30px; display: flex; align-items: center; justify-content: space-between; gap: 30px; }
.identity-main { min-width: 0; display: flex; align-items: center; gap: 19px; }
.profile-avatar { width: 82px; height: 82px; flex: 0 0 82px; border-radius: 19px; display: grid; place-items: center; font-size: 23px; font-weight: 750; }
.avatar-coral { background: #fff0f1; color: #9b5262; }.avatar-blue { background: #eaf1ff; color: #315eaa; }.avatar-purple { background: #f0edff; color: #604bd0; }.avatar-orange { background: #fff3e4; color: #91602c; }
.identity-copy { min-width: 0; }
.name-line { display: flex; align-items: center; flex-wrap: wrap; gap: 11px; }
.name-line h1 { margin: 0; color: #101a3d; font-size: clamp(29px, 3vw, 38px); font-weight: 700; letter-spacing: -.045em; line-height: 1.05; }
.identity-copy > p { margin: 8px 0 0; color: #4f5e84; font-size: 16px; }
.identity-meta { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 8px 18px; color: #7a849f; font-size: 12px; }
.identity-meta :is(a, span) { display: inline-flex; align-items: center; gap: 6px; color: inherit; text-decoration: none; }.identity-meta a:hover { color: #4d35c8; }.identity-meta b { color: #7560df; }
.status-pill { width: max-content; padding: 6px 9px; border-radius: 6px; font-size: 11px; font-weight: 700; white-space: nowrap; }
.status-new { background: #f2efff; color: #5b46cd; }.status-under-review { background: #eaf1ff; color: #355b9c; }.status-interview { background: #e7f7f4; color: #287966; }.status-shortlisted { background: #eeeaff; color: #5540c3; }.status-hired { background: #e9f7ef; color: #26734d; }.status-rejected { background: #fff0f1; color: #9b5262; }
.stage-control { width: 210px; flex: 0 0 210px; display: grid; gap: 7px; color: #344266; font-size: 11px; font-weight: 700; }.stage-control select { width: 100%; min-height: 42px; padding: 0 11px; border: 1px solid #d9d4e9; border-radius: 8px; background: #fff; color: #253257; font: inherit; font-size: 12px; outline: 0; }.stage-control select:focus { border-color: #7560e0; box-shadow: 0 0 0 3px #6d51d914; }.stage-control small { color: #8a91a6; font-size: 9px; font-weight: 450; }
.profile-summary { display: grid; grid-template-columns: repeat(4, 1fr); margin: 0 18px 18px; padding: 0; border-radius: 10px; background: #f5f3fc; }
.profile-summary div { min-width: 0; padding: 16px 20px; }.profile-summary div + div { border-left: 1px solid #e1ddec; }.profile-summary dt, .application-grid dt, .preference-card dt { color: #7b849e; font-size: 9px; font-weight: 650; letter-spacing: .035em; text-transform: uppercase; }.profile-summary dd { margin: 6px 0 0; overflow: hidden; color: #26335a; font-size: 13px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.profile-layout { margin-top: 22px; display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(300px, .75fr); align-items: start; gap: 22px; }.main-column, .side-column { min-width: 0; display: grid; gap: 18px; }
.profile-card { padding: 25px 27px; }.card-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }.card-heading h2 { margin: 0; padding-left: 12px; position: relative; color: #192348; font-size: 17px; font-weight: 700; letter-spacing: -.025em; }.card-heading h2::before { position: absolute; top: 2px; bottom: 2px; left: 0; width: 4px; border-radius: 99px; background: #6950e1; content: ''; }.card-heading p { margin: 6px 0 0; color: #7b849d; font-size: 11px; }.about-card > p { max-width: 78ch; margin: 18px 0 0; color: #505d7e; font-size: 14px; line-height: 1.8; }
.experience-list { margin-top: 19px; display: grid; }.experience-item { display: grid; grid-template-columns: 45px minmax(0, 1fr); gap: 14px; padding: 19px 0; border-top: 1px solid #ebe8f2; }.company-mark { width: 45px; height: 45px; border-radius: 10px; display: grid; place-items: center; background: #e9e5ff; color: #4e36c9; font-size: 15px; font-weight: 750; }.muted-mark { background: #f0f1f5; color: #65708b; }.experience-heading { display: flex; justify-content: space-between; gap: 20px; }.experience-heading h3 { margin: 1px 0 0; color: #202a4c; font-size: 14px; font-weight: 700; }.experience-heading p { margin: 5px 0 0; color: #6f7894; font-size: 11px; }.experience-heading time { flex: 0 0 auto; padding: 5px 8px; border-radius: 6px; background: #f5f3fc; color: #586385; font-size: 9px; white-space: nowrap; }.experience-copy ul { margin: 15px 0 0; padding-left: 17px; color: #56617e; font-size: 12px; line-height: 1.65; }.experience-copy li + li { margin-top: 7px; }.experience-skills, .skill-list { display: flex; flex-wrap: wrap; gap: 7px; }.experience-skills { margin-top: 14px; }.experience-skills span, .skill-list span { padding: 6px 9px; border-radius: 6px; background: #f1effa; color: #4f5d82; font-size: 10px; font-weight: 600; }.previous-role { padding-bottom: 0; }
.application-grid { margin: 19px 0 0; display: grid; grid-template-columns: 1fr 1fr; gap: 0; border-top: 1px solid #ebe8f2; border-left: 1px solid #ebe8f2; }.application-grid div { padding: 15px; border-right: 1px solid #ebe8f2; border-bottom: 1px solid #ebe8f2; }.application-grid dd, .preference-card dd { margin: 6px 0 0; color: #273358; font-size: 12px; font-weight: 650; }
.compact-heading { align-items: center; }.compact-heading > span { display: grid; width: 24px; height: 24px; place-items: center; border-radius: 50%; background: #f0edff; color: #5742c7; font-size: 10px; font-weight: 700; }.skill-list { margin-top: 17px; }.preference-card dl { margin: 18px 0 0; display: grid; gap: 15px; }.education-card > p { margin: 17px 0 0; color: #53607f; font-size: 12px; line-height: 1.65; }.resume-row { margin-top: 17px; display: flex; align-items: center; min-width: 0; gap: 11px; }.pdf-mark { width: 39px; height: 43px; flex: 0 0 39px; border-radius: 7px; display: grid; place-items: center; background: #ece8ff; color: #5138cc; font-size: 8px; font-weight: 800; }.resume-row > div { min-width: 0; }.resume-row strong, .resume-row small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.resume-row strong { color: #273154; font-size: 11px; }.resume-row small { margin-top: 5px; color: #858ca2; font-size: 9px; }
.missing-profile { min-height: 440px; padding: 48px; display: grid; place-content: center; justify-items: center; text-align: center; }.missing-profile > span { color: #6853d8; font-size: 11px; font-weight: 700; text-transform: uppercase; }.missing-profile h1 { margin: 10px 0 0; color: #182248; font-size: 29px; }.missing-profile p { margin: 10px 0 0; color: #6d7898; font-size: 13px; }.missing-profile a { margin-top: 20px; padding: 11px 16px; border-radius: 8px; background: #4d34d3; color: #fff; font-size: 12px; font-weight: 700; text-decoration: none; }
@media (max-width: 980px) { .profile-layout { grid-template-columns: 1fr; }.side-column { grid-template-columns: repeat(2, minmax(0, 1fr)); }.skills-card, .resume-card { grid-column: auto; } }
@media (max-width: 700px) { .identity-row { align-items: flex-start; flex-direction: column; padding: 22px; }.stage-control { width: 100%; flex-basis: auto; }.profile-summary { grid-template-columns: 1fr 1fr; margin: 0 12px 12px; }.profile-summary div:nth-child(3) { border-top: 1px solid #e1ddec; border-left: 0; }.profile-summary div:nth-child(4) { border-top: 1px solid #e1ddec; }.profile-layout { margin-top: 14px; gap: 14px; }.side-column { grid-template-columns: 1fr; gap: 14px; }.profile-card { padding: 21px; } }
@media (max-width: 460px) { .identity-main { align-items: flex-start; }.profile-avatar { width: 64px; height: 64px; flex-basis: 64px; border-radius: 15px; font-size: 19px; }.name-line { align-items: flex-start; flex-direction: column; gap: 8px; }.name-line h1 { font-size: 27px; }.identity-copy > p { font-size: 14px; }.identity-meta { align-items: flex-start; flex-direction: column; }.profile-summary { grid-template-columns: 1fr; }.profile-summary div + div { border-top: 1px solid #e1ddec; border-left: 0; }.experience-heading { align-items: flex-start; flex-direction: column; gap: 9px; }.application-grid { grid-template-columns: 1fr; }.missing-profile { padding: 28px 20px; } }
</style>
