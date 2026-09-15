<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import SaveJobButton from '@/components/public/SaveJobButton.vue'
import verifyLogo from '@/assets/img/verify_logo.png'
import { companies, jobs } from '@/data/catalog'

const route = useRoute()
const company = computed(() => companies.find(item => item.id === String(route.params.id)))
const companyJobs = computed(() => company.value ? jobs.filter(job => job.company === company.value?.name) : [])
</script>

<template>
  <main v-if="company" class="company-profile-page">
    <div class="company-profile-shell">
      <div class="profile-toolbar">
        <router-link to="/companies" class="back-link"><span aria-hidden="true">←</span> Browse companies</router-link>
      </div>

      <section class="company-overview" aria-labelledby="company-name">
        <div class="identity-row">
          <div class="identity-main">
            <div class="logo-wrap">
              <div class="company-logo" :style="{ backgroundColor: company.accent }"><img :src="company.logo" :alt="company.name + ' logo'" /></div>
              <img :src="verifyLogo" class="verification-mark" alt="Verified company" />
            </div>
            <div class="identity-copy">
              <div class="name-row"><h1 id="company-name">{{ company.name }}</h1></div>
              <p>{{ company.industry }}</p>
              <div class="identity-meta"><span><b aria-hidden="true">⌖</b>{{ company.location }}</span><span><b aria-hidden="true">↗</b>{{ company.website }}</span></div>
            </div>
          </div>
          <a class="website-button" :href="'https://' + company.website" target="_blank" rel="noreferrer">Visit website <span aria-hidden="true">↗</span></a>
        </div>

        <div class="company-summary" aria-label="Company summary">
          <div><span>Industry</span><strong>{{ company.industry }}</strong></div>
          <div><span>Company size</span><strong>{{ company.size }}</strong></div>
          <div><span>Open roles</span><strong>{{ companyJobs.length || company.openRoles }}</strong></div>
          <div><span>Founded</span><strong>{{ company.founded }}</strong></div>
        </div>
      </section>

      <div class="profile-layout">
        <div class="main-column">
          <section class="profile-card about-card" aria-labelledby="about-company-heading">
            <header class="card-heading"><h2 id="about-company-heading">About {{ company.name }}</h2></header>
            <p>{{ company.about }}</p>
          </section>

          <section class="profile-card roles-card" aria-labelledby="open-roles-heading">
            <header class="card-heading">
              <div><h2 id="open-roles-heading">Open roles</h2><p>Current opportunities from {{ company.name }}.</p></div>
              <span class="count-chip">{{ companyJobs.length }} listed</span>
            </header>
            <div v-if="companyJobs.length" class="role-list">
              <article v-for="job in companyJobs" :key="job.id" class="role-row">
                <div class="role-main">
                  <div class="role-logo" :style="{ backgroundColor: company.accent }"><img :src="job.logo" alt="" /></div>
                  <div><router-link :to="'/jobs/' + job.id">{{ job.title }}</router-link><p>{{ job.location }} · {{ job.workplace }} · {{ job.type }}</p></div>
                </div>
                <div class="role-actions"><span>{{ job.salary }}</span><SaveJobButton :job-id="job.id" compact /></div>
              </article>
            </div>
            <div v-else class="empty-roles"><strong>No roles are listed today</strong><p>Follow the company directory for future openings.</p></div>
          </section>
        </div>

        <aside class="side-column">
          <section class="profile-card verified-card" aria-labelledby="verified-heading">
            <img :src="verifyLogo" alt="" />
            <div><h2 id="verified-heading">Verified employer</h2><p>Company details have been reviewed by JobSeeker.</p></div>
          </section>
          <section class="profile-card facts-card" aria-labelledby="company-facts-heading">
            <header class="card-heading"><h2 id="company-facts-heading">Company facts</h2></header>
            <dl>
              <div><dt>Headquarters</dt><dd>{{ company.location }}</dd></div>
              <div><dt>Team size</dt><dd>{{ company.size }}</dd></div>
              <div><dt>Industry</dt><dd>{{ company.industry }}</dd></div>
              <div><dt>Website</dt><dd><a :href="'https://' + company.website" target="_blank" rel="noreferrer">{{ company.website }}</a></dd></div>
            </dl>
          </section>
        </aside>
      </div>
    </div>
  </main>

  <main v-else class="company-not-found">
    <h1>Company not found</h1><p>This company profile is no longer available.</p><router-link to="/companies">Browse companies</router-link>
  </main>
</template>

<style scoped>
.company-profile-page { min-height: 80vh; padding: 24px 24px 80px; background: #f8f7fc; color: #131b3d; }
.company-profile-shell { width: min(1180px, 100%); margin: 0 auto; }
.profile-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 18px; margin-bottom: 20px; }
.back-link { display: inline-flex; align-items: center; gap: 7px; color: #33406a; font-size: 13px; font-weight: 600; }
.back-link:hover { color: #553bd2; }
.view-label, .hiring-badge { display: inline-flex; align-items: center; gap: 6px; padding: 5px 9px; border-radius: 999px; background: #efedff; color: #4f38cf; font-size: 11px; font-weight: 600; }
.view-label i, .hiring-badge i { width: 6px; height: 6px; border-radius: 50%; background: #6b55ee; }
.company-overview, .profile-card { border: 1px solid #ebe8f3; border-radius: 15px; background: #fff; }
.company-overview { overflow: hidden; }
.identity-row { display: flex; align-items: center; justify-content: space-between; gap: 34px; padding: 30px; }
.identity-main { display: flex; align-items: center; min-width: 0; gap: 20px; }
.logo-wrap { position: relative; width: fit-content; flex: 0 0 auto; }
.company-logo { display: grid; width: 92px; height: 92px; place-items: center; border: 1px solid #e4e0f1; border-radius: 20px; }
.company-logo img { width: 52px; height: 52px; object-fit: contain; }
.verification-mark { position: absolute; right: -4px; bottom: -3px; width: 19px; height: 19px; max-width: 19px; object-fit: contain; border: 2px solid #fff; border-radius: 50%; }
.identity-copy { min-width: 0; }
.name-row { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
.name-row h1 { margin: 0; color: #101938; font-size: clamp(28px, 3vw, 38px); font-weight: 700; letter-spacing: -.045em; line-height: 1.08; }
.identity-copy > p { margin: 7px 0 0; color: #35405f; font-size: 16px; }
.identity-meta { display: flex; flex-wrap: wrap; gap: 8px 18px; margin-top: 10px; color: #6f7895; font-size: 12px; }
.identity-meta span { display: inline-flex; align-items: center; gap: 6px; }.identity-meta b { color: #5a43d8; }
.website-button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 42px; padding: 0 16px; border-radius: 9px; background: #4930ce; color: #fff; font-size: 13px; font-weight: 700; }
.website-button:hover { background: #3822b7; }
.company-summary { display: grid; grid-template-columns: repeat(4, 1fr); margin: 0 24px 24px; border-radius: 10px; background: #f3f2fb; }
.company-summary > div { display: grid; gap: 4px; padding: 16px 22px; }.company-summary > div + div { border-left: 1px solid #dfdced; }
.company-summary span { color: #69728d; font-size: 10px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; }.company-summary strong { overflow: hidden; color: #3724ba; font-size: 15px; text-overflow: ellipsis; white-space: nowrap; }
.profile-layout { display: grid; grid-template-columns: minmax(0, 1.65fr) minmax(285px, .8fr); gap: 22px; margin-top: 22px; }
.main-column, .side-column { display: grid; align-content: start; gap: 22px; }.profile-card { padding: 22px; }
.card-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; }.card-heading h2 { margin: 0; color: #151d3c; font-size: 17px; font-weight: 700; letter-spacing: -.02em; }
.card-heading h2::before { display: inline-block; width: 5px; height: 18px; margin-right: 9px; border-radius: 9px; background: #5537df; content: ''; vertical-align: -3px; }
.card-heading p { margin: 5px 0 0 14px; color: #727b96; font-size: 12px; }.about-card > p { margin: 18px 0 0; color: #343d5b; font-size: 14px; line-height: 1.8; }
.count-chip { padding: 4px 8px; border-radius: 999px; background: #efedff; color: #5039ce; font-size: 10px; font-weight: 600; }
.role-list { display: grid; margin-top: 17px; border-top: 1px solid #ece9f3; }
.role-row { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 15px 0; border-bottom: 1px solid #ece9f3; }
.role-main { display: flex; align-items: center; min-width: 0; gap: 12px; }.role-logo { display: grid; width: 42px; height: 42px; flex: 0 0 42px; place-items: center; border-radius: 9px; }.role-logo img { width: 25px; height: 25px; object-fit: contain; }
.role-main > div:last-child { min-width: 0; }.role-main a { display: block; overflow: hidden; color: #202a4a; font-size: 13px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }.role-main a:hover { color: #4e35ce; }.role-main p { margin: 4px 0 0; overflow: hidden; color: #78819a; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.role-actions { display: flex; align-items: center; flex: 0 0 auto; gap: 10px; }.role-actions > span { color: #4a5677; font-size: 11px; font-weight: 600; white-space: nowrap; }.role-actions :deep(.save-control.compact > button) { width: 36px; height: 36px; }
.empty-roles { margin-top: 17px; padding: 28px; border: 1px dashed #d8d2e9; border-radius: 9px; text-align: center; }.empty-roles strong { color: #313a58; font-size: 13px; }.empty-roles p { margin: 5px 0 0; color: #7c849b; font-size: 11px; }
.facts-card dl { display: grid; gap: 14px; margin: 18px 0 0; }.facts-card dl div { display: grid; gap: 4px; }.facts-card dt { color: #7b839d; font-size: 10px; }.facts-card dd { margin: 0; color: #293250; font-size: 12px; font-weight: 600; }.facts-card a { color: #4930c8; }
.benefits-card ul { display: grid; gap: 10px; margin: 17px 0 0; padding: 0; list-style: none; }.benefits-card li { display: flex; align-items: center; gap: 9px; color: #394360; font-size: 12px; }.benefits-card li span { display: grid; width: 20px; height: 20px; place-items: center; border-radius: 50%; background: #efedff; color: #4c34cb; font-size: 10px; font-weight: 800; }
.verified-card { display: flex; align-items: center; gap: 12px; background: #f7f5ff; }.verified-card > img { width: 22px; height: 22px; max-width: 22px; object-fit: contain; }.verified-card h2 { margin: 0; color: #2a3352; font-size: 12px; font-weight: 700; }.verified-card p { margin: 4px 0 0; color: #78809a; font-size: 10px; line-height: 1.45; }
.company-not-found { display: grid; min-height: 70vh; place-content: center; justify-items: center; padding: 30px; background: #f8f7fc; text-align: center; }.company-not-found h1 { color: #171f3f; font-size: 30px; }.company-not-found p { margin: 8px 0 18px; color: #717a95; }.company-not-found a { padding: 11px 15px; border-radius: 8px; background: #4930ce; color: #fff; font-size: 13px; font-weight: 700; }
@media (max-width: 860px) { .profile-layout { grid-template-columns: 1fr; }.side-column { grid-template-columns: repeat(2, 1fr); }.verified-card { grid-column: 1 / -1; } }
@media (max-width: 680px) { .company-profile-page { padding: 18px 14px 60px; }.identity-row { align-items: flex-start; flex-direction: column; padding: 21px; }.identity-main { align-items: flex-start; }.company-logo { width: 70px; height: 70px; }.company-logo img { width: 40px; height: 40px; }.name-row h1 { font-size: 26px; }.website-button { align-self: stretch; }.company-summary { grid-template-columns: 1fr 1fr; margin: 0 14px 14px; }.company-summary > div:nth-child(3) { border-left: 0; border-top: 1px solid #dfdced; }.company-summary > div:nth-child(4) { border-top: 1px solid #dfdced; }.profile-card { padding: 18px; }.side-column { grid-template-columns: 1fr; }.verified-card { grid-column: auto; }.role-row { align-items: flex-start; }.role-actions { align-items: flex-end; flex-direction: column; } }
@media (max-width: 430px) { .profile-toolbar { align-items: flex-start; flex-direction: column; }.identity-main { display: grid; }.company-summary > div { padding: 13px; }.role-row { flex-direction: column; }.role-actions { width: 100%; align-items: center; flex-direction: row; justify-content: space-between; } }
</style>
