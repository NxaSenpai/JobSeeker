<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import SaveJobButton from '@/components/public/SaveJobButton.vue'
import { companies, jobs } from '@/data/catalog'

const route = useRoute()
const company = computed(() => companies.find(item => item.id === String(route.params.id)))
const companyJobs = computed(() => {
  const selectedCompany = company.value
  return selectedCompany ? jobs.filter(job => job.company === selectedCompany.name) : []
})

function scrollToSection(id: string) {
  const section = document.getElementById(id)
  if (!section) return
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  section.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' })
}
</script>

<template>
  <main v-if="company" class="public-company-page">
    <div class="company-page-shell">
      <router-link to="/companies" class="company-back-link">← Browse companies</router-link>

      <section class="company-header-shell">
        <div class="company-cover">
          <div class="company-cover-grid" aria-hidden="true"></div>
          <div class="company-orbit company-orbit-one" aria-hidden="true"></div>
          <div class="company-orbit company-orbit-two" aria-hidden="true"></div>
          <div class="company-cover-copy">
            <span>Candidate view</span>
            <p>Meet the team behind the work.</p>
          </div>
        </div>

        <section class="company-identity-card" aria-labelledby="company-name">
          <div class="company-identity-main">
            <div class="company-logo" :style="{ backgroundColor: company.accent }"><img :src="company.logo" :alt="company.name + ' logo'" /></div>
            <div class="company-identity-copy">
              <div class="company-title-row">
                <h1 id="company-name">{{ company.name }}</h1>
                <span class="company-verified"><span aria-hidden="true">✓</span> Verified</span>
              </div>
              <p>{{ company.industry }}</p>
              <div class="company-meta"><span>⌖ {{ company.location }}</span><span>◌ {{ companyJobs.length }} open roles</span></div>
            </div>
          </div>
          <a class="company-website-button" :href="'https://' + company.website" target="_blank" rel="noreferrer">Visit website ↗</a>
        </section>

        <nav class="company-profile-nav" aria-label="Company profile navigation">
          <a href="#about" @click.prevent="scrollToSection('about')">About</a>
          <a href="#roles" @click.prevent="scrollToSection('roles')">Open roles <span>{{ companyJobs.length }}</span></a>
          <a href="#culture" @click.prevent="scrollToSection('culture')">What they offer</a>
        </nav>
      </section>

      <div class="company-content">
        <div class="company-main-column">
          <section id="about" class="company-social-card" aria-labelledby="about-company-heading">
            <h2 id="about-company-heading">About {{ company.name }}</h2>
            <p class="company-about-copy">{{ company.about }}</p>
          </section>

          <section id="roles" class="company-social-card roles-card" aria-labelledby="open-roles-heading">
            <div class="company-card-heading">
              <div><h2 id="open-roles-heading">Open roles</h2><p>Explore the roles currently listed for {{ company.name }}.</p></div>
              <span class="roles-count">{{ companyJobs.length }} roles</span>
            </div>
            <div v-if="companyJobs.length" class="company-role-list">
              <article v-for="job in companyJobs" :key="job.id" class="company-role-row">
                <div class="company-role-main">
                  <div class="company-role-logo"><img :src="job.logo" :alt="job.company + ' logo'" /></div>
                  <div class="company-role-copy">
                    <router-link :to="'/jobs/' + job.id" class="company-role-title">{{ job.title }}</router-link>
                    <p>{{ job.location }} / {{ job.workplace }}</p>
                  </div>
                </div>
                <div class="company-role-actions">
                  <span class="company-role-salary">{{ job.salary }}</span>
                  <SaveJobButton :job-id="job.id" compact />
                </div>
              </article>
            </div>
            <div v-else class="company-empty">There are no listed openings today. Check back soon.</div>
          </section>
        </div>

        <aside class="company-side-column">
          <section class="company-social-card facts-card" aria-labelledby="company-facts-heading">
            <h2 id="company-facts-heading">Company facts</h2>
            <dl>
              <div><dt>Industry</dt><dd>{{ company.industry }}</dd></div>
              <div><dt>Company size</dt><dd>{{ company.size }}</dd></div>
              <div><dt>Founded</dt><dd>{{ company.founded }}</dd></div>
              <div><dt>Headquarters</dt><dd>{{ company.location }}</dd></div>
            </dl>
          </section>

          <section id="culture" class="company-social-card offer-card" aria-labelledby="offer-heading">
            <h2 id="offer-heading">What they offer</h2>
            <ul><li v-for="benefit in company.benefits" :key="benefit"><span aria-hidden="true">✓</span>{{ benefit }}</li></ul>
          </section>
          <router-link to="/companies" class="company-directory-link">See more company profiles <span>→</span></router-link>
        </aside>
      </div>
    </div>
  </main>
  <main v-else class="company-not-found"><h1>Company not found</h1><p>This company profile is no longer available.</p><router-link to="/companies" class="company-primary-link">Browse companies</router-link></main>
</template>

<style scoped>
.public-company-page { min-height: 78vh; padding: 34px 24px 86px; background: #f5f4f8; color: #17265a; }
.company-page-shell { width: min(1120px, 100%); margin: 0 auto; }
.company-back-link { display: inline-flex; margin-bottom: 22px; color: #6d5bd3; font-size: 14px; font-weight: 600; }
.company-header-shell { overflow: hidden; border: 1px solid #e1deeb; border-radius: 22px; background: white; box-shadow: 0 14px 38px #17265a12; }
.company-cover { position: relative; height: 244px; overflow: hidden; border-radius: 22px 22px 0 0; background: #122966; }
.company-cover-grid { position: absolute; inset: 0; opacity: .18; background-image: linear-gradient(#aab9f4 1px, transparent 1px), linear-gradient(90deg, #aab9f4 1px, transparent 1px); background-size: 34px 34px; mask-image: linear-gradient(90deg, transparent, black 22%, black 80%, transparent); }
.company-orbit { position: absolute; border: 1px solid #afbdf7; border-radius: 50%; opacity: .5; }
.company-orbit-one { width: 430px; height: 430px; right: -80px; top: -215px; box-shadow: 0 0 0 26px #4864b633, 0 0 0 52px #4864b622; }
.company-orbit-two { width: 230px; height: 230px; left: 40%; bottom: -190px; border-color: #7666ef; box-shadow: 0 0 0 18px #7666ef33; }
.company-cover-copy { position: absolute; bottom: 34px; left: 38px; color: white; }
.company-cover-copy span, .company-section-label { color: #7766ec; font-size: 11px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }
.company-cover-copy span { color: #c6ceff; }
.company-cover-copy p { margin-top: 8px; color: #d6deff; font-size: 14px; }
.company-identity-card { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 24px; margin: -34px 24px 0; padding: 24px 28px 24px 22px; border-radius: 14px; background: white; }
.company-identity-main { display: flex; align-items: center; min-width: 0; gap: 18px; }
.company-logo { width: 94px; height: 94px; flex: 0 0 94px; display: grid; place-items: center; margin-top: -54px; border: 6px solid white; border-radius: 20px; box-shadow: 0 6px 18px #17265a1a; }
.company-logo img { width: 54px; height: 54px; object-fit: contain; }
.company-identity-copy { min-width: 0; }
.company-title-row { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; }
.company-title-row h1 { color: #12296f; font-size: clamp(27px, 4vw, 36px); font-weight: 700; letter-spacing: -.045em; line-height: 1.15; }
.company-identity-copy > p { margin-top: 7px; color: #68749b; font-size: 14px; }
.company-meta { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 12px; color: #7b85a3; font-size: 12px; }
.company-verified { display: inline-flex; align-items: center; gap: 5px; padding: 5px 9px; border-radius: 6px; background: #eaf7f0; color: #317554; font-size: 11px; font-weight: 700; }
.company-verified span { display: grid; width: 14px; height: 14px; place-items: center; border-radius: 50%; background: #54a87a; color: white; font-size: 9px; }
.company-website-button { flex: 0 0 auto; padding: 11px 16px; border: 1px solid #d8d2ee; border-radius: 8px; color: #5f4bd2; font-size: 13px; font-weight: 700; transition: background .18s, border-color .18s, transform .18s; }
.company-website-button:hover { border-color: #9b8ce7; background: #f7f5ff; transform: translateY(-1px); }
.company-profile-nav { display: flex; gap: 30px; min-height: 60px; padding: 0 30px; border-top: 1px solid #eeecf3; background: white; }
.company-profile-nav a { display: inline-flex; align-items: center; gap: 7px; color: #7a84a0; font-size: 13px; font-weight: 600; }
.company-profile-nav a:hover { color: #5e4acc; }
.company-profile-nav span { display: grid; min-width: 20px; height: 20px; place-items: center; padding: 0 5px; border-radius: 5px; background: #f0edff; color: #6d5bd3; font-size: 10px; }
.company-content { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(260px, .65fr); gap: 22px; padding: 24px 0; }
.company-main-column, .company-side-column { display: grid; align-content: start; gap: 22px; }
.company-social-card { padding: 26px; border: 1px solid #e3e0eb; border-radius: 15px; background: white; box-shadow: 0 6px 20px #17265a08; }
.company-social-card h2 { margin-top: 7px; color: #172b72; font-size: 21px; font-weight: 700; letter-spacing: -.025em; }
.company-about-copy { max-width: 650px; margin-top: 22px; color: #5f6d96; font-size: 15px; line-height: 1.9; }
.company-card-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; }
.company-card-heading p { margin-top: 8px; color: #77819f; font-size: 13px; line-height: 1.7; }
.roles-count { padding: 6px 9px; border-radius: 6px; background: #f0edff; color: #6653c9; font-size: 11px; font-weight: 700; white-space: nowrap; }
.company-role-list { display: grid; margin-top: 23px; border-top: 1px solid #eeecf3; }
.company-role-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 17px 0; border-bottom: 1px solid #eeecf3; }
.company-role-main { display: flex; align-items: center; min-width: 0; gap: 12px; }
.company-role-logo { width: 42px; height: 42px; flex: 0 0 42px; display: grid; place-items: center; border: 1px solid #ebe7f5; border-radius: 11px; background: #f7f5ff; }
.company-role-logo img { width: 27px; height: 27px; object-fit: contain; }
.company-role-copy { min-width: 0; }
.company-role-title { display: block; overflow: hidden; color: #233978; font-size: 14px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.company-role-title:hover { color: #6653c9; }
.company-role-copy p { margin-top: 5px; overflow: hidden; color: #7b85a3; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.company-role-actions { display: flex; align-items: center; flex: 0 0 auto; gap: 13px; }
.company-role-salary { color: #61709a; font-size: 12px; font-weight: 600; white-space: nowrap; }
.company-role-actions :deep(.save-control.compact > button) { width: 38px; height: 38px; }
.company-empty { margin-top: 22px; padding: 22px; border: 1px dashed #d9d3ed; border-radius: 9px; background: #faf9ff; color: #69769a; font-size: 13px; text-align: center; }
.facts-card dl { display: grid; grid-template-columns: 1fr 1fr; gap: 0 20px; margin-top: 22px; }
.facts-card dl div { display: grid; gap: 4px; padding-top: 14px; border-top: 1px solid #eeecf3; }
.facts-card dt { color: #8690aa; font-size: 11px; }
.facts-card dd { color: #364576; font-size: 13px; font-weight: 600; }
.offer-card { background: #fbfaff; }
.offer-card ul { display: grid; gap: 13px; margin-top: 22px; }
.offer-card li { display: flex; align-items: center; gap: 9px; color: #5f6d96; font-size: 13px; }
.offer-card li span { color: #599c75; font-weight: 700; }
.company-directory-link { display: flex; justify-content: space-between; padding: 3px 2px; color: #6653c9; font-size: 13px; font-weight: 700; }
.company-directory-link:hover { text-decoration: underline; }
.company-not-found { min-height: 64vh; display: grid; place-content: center; justify-items: center; gap: 10px; padding: 40px 24px; background: #f5f4f8; color: #17265a; text-align: center; }
.company-not-found h1 { font-size: 36px; font-weight: 700; }
.company-not-found p { color: #6c789b; }
.company-primary-link { margin-top: 10px; padding: 12px 18px; border-radius: 8px; background: #705aef; color: white; font-size: 13px; font-weight: 700; }
@media (max-width: 780px) {
  .public-company-page { padding: 24px 16px 64px; }
  .company-cover { height: 190px; }
  .company-cover-copy { bottom: 24px; left: 24px; }
  .company-identity-card { align-items: flex-start; flex-direction: column; margin: -28px 14px 0; padding: 18px 8px 20px; }
  .company-identity-main { align-items: flex-start; gap: 13px; }
  .company-logo { width: 78px; height: 78px; flex-basis: 78px; margin-top: -46px; }
  .company-logo img { width: 44px; height: 44px; }
  .company-website-button { align-self: stretch; text-align: center; }
  .company-profile-nav { gap: 22px; padding: 0 20px; overflow-x: auto; }
  .company-profile-nav a { min-height: 56px; white-space: nowrap; }
  .company-content { grid-template-columns: 1fr; padding-top: 18px; }
  .company-role-row { align-items: stretch; flex-direction: column; gap: 13px; }
  .company-role-actions { justify-content: space-between; }
  .facts-card dl { grid-template-columns: 1fr; }
}
@media (max-width: 500px) {
  .company-social-card { padding: 21px 18px; }
  .company-meta { display: grid; gap: 6px; }
}
:is(a, button):focus-visible { outline: 2px solid #7b66ff; outline-offset: 3px; }
</style>
