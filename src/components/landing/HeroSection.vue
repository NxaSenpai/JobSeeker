<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { currentUser, isJobSeeker, displayNameForUser } from '@/services/auth'
import vectorHero from '@/assets/img/vector-hero.svg'
import frame24 from '@/assets/img/frame-24.svg'
import frame25 from '@/assets/img/frame-25.svg'
const search = ref('')
const router = useRouter()
</script>

<template>
  <section class="bg-[#f3f1ff]">
    <div class="mx-auto max-w-[1440px] px-6 py-16 sm:px-10 lg:px-[108px] lg:py-20">
      <div class="relative flex items-center justify-between gap-8">
        <!-- Left: headline + search -->
        <div class="relative z-10 flex min-w-0 max-w-[700px] flex-col gap-9">
          <div class="flex flex-col gap-10">
            <p v-if="isJobSeeker && currentUser" class="text-sm font-semibold text-[#7059d8]">Welcome back, {{ currentUser.firstName || displayNameForUser(currentUser) }}.</p>
            <h1 v-if="isJobSeeker" class="text-[clamp(40px,5.5vw,72px)] font-bold leading-[1.15] tracking-[-0.035em] text-[#0b2b82]">Your next chapter <span class="text-[#7b66ff]">starts here.</span></h1>
            <h1 v-else class="text-[clamp(40px,5.5vw,72px)] font-bold leading-[1.15] tracking-[-0.035em] text-[#0b2b82]">
              Explore Over
              <span class="text-[#7b66ff]">7,000+</span>
              Job Opportunities
            </h1>
            <p v-if="isJobSeeker" class="max-w-[569px] text-base leading-8 text-[#3d589b]">Explore roles that fit your ambitions, build your shortlist, and pick up where you left off.</p>
            <p v-else class="max-w-[569px] text-base leading-[32px] text-[#3d589b]">
              Discover a platform tailored for passionate job seekers interested
              in startups. Find your next career opportunity and connect with
              like-minded individuals.
            </p>
          </div>
          <form class="flex max-w-[600px] flex-col gap-3 rounded-xl border border-[#e1daf7] bg-white p-3 sm:flex-row" role="search" @submit.prevent="router.push({ path: '/jobs', query: search.trim() ? { q: search.trim() } : {} })">
            <label class="sr-only" for="hero-search">Job title, company, or keyword</label>
            <input id="hero-search" v-model="search" type="search" placeholder="Job title, company, or keyword" class="min-h-11 min-w-0 flex-1 rounded-lg px-3 text-sm text-[#0b2b82] outline-[#7b66ff]" />
            <button type="submit" class="min-h-11 cursor-pointer rounded-lg bg-[#7b66ff] px-6 py-3 text-sm font-semibold text-white hover:bg-[#6954e5]">Find jobs</button>
          </form>
          <div v-if="isJobSeeker" class="flex flex-wrap gap-6 text-sm font-semibold text-[#6b58d4]"><router-link to="/saved-jobs" class="hover:underline">Your saved jobs →</router-link><router-link to="/applications" class="hover:underline">Application drafts →</router-link></div>

        </div>

        <!-- Right: hero image + decorations -->
        <div class="relative hidden h-[430px] w-[280px] shrink-0 xl:block" aria-hidden="true">
          <img
            :src="vectorHero"
            class="pointer-events-none absolute -left-10 top-24 w-[320px]"
            alt=""
          />
          <img
            :src="frame24"
            class="pointer-events-none absolute -left-6 top-6 size-[74px]"
            alt=""
          />
          <img
            :src="frame25"
            class="pointer-events-none absolute -left-2 bottom-10 size-[87px] rotate-[101deg]"
            alt=""
          />
        </div>
      </div>

      <!-- Sponsors -->
      <!-- <div class="flex justify-center pb-4 pt-10">
        <img :src="sponsorsImg" class="h-24 w-auto" alt="Trusted companies" />
      </div> -->
    </div>
  </section>
</template>
