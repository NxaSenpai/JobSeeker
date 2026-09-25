<script setup lang="ts">
import JobCard from '@/components/public/JobCard.vue'
import { landingJobsError, landingJobsLoading, latestLandingJobs, loadLandingJobs } from '@/services/landingJobs'
import underline from '@/assets/img/underline-2.svg'
void loadLandingJobs()
</script>
<template>
  <section class="bg-[#f7f5ff] py-16 sm:py-20">
    <div class="mx-auto max-w-[1440px] px-6 sm:px-10 lg:px-[108px]">
      <div class="mb-10 flex flex-wrap items-center justify-between gap-5">
        <div><h2 class="text-4xl font-semibold leading-tight text-[#0b2b82] sm:text-[56px]">More <span class="text-[#7b66ff]">Jobs</span></h2><img :src="underline" alt="" class="mt-2 h-2 w-[123px]" /></div>
        <router-link to="/jobs" class="text-sm font-semibold text-[#0b2b82] underline underline-offset-4">Browse all jobs →</router-link>
      </div>
      <p v-if="landingJobsLoading" class="text-sm text-[#52669e]" role="status">Loading current jobs…</p>
      <div v-else-if="landingJobsError" class="rounded-xl border border-[#f1cbd3] bg-white p-5 text-sm text-[#8f354b]" role="alert">{{ landingJobsError }} <button type="button" class="ml-2 font-semibold underline" @click="loadLandingJobs(true)">Try again</button></div>
      <div v-else-if="latestLandingJobs.length" class="grid gap-6 md:grid-cols-2"><JobCard v-for="job in latestLandingJobs" :key="job.id" :job="job" /></div>
      <div v-else class="rounded-xl border border-[#e7e4f4] bg-white p-6 text-sm text-[#52669e]">No additional recent roles are available yet. <router-link to="/jobs" class="font-semibold text-[#0b2b82] underline">Browse all jobs</router-link></div>
    </div>
  </section>
</template>
