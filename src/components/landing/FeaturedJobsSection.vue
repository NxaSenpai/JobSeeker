<script setup lang="ts">
import JobCard from '@/components/public/JobCard.vue'
import { jobs } from '@/data/catalog'
import underline from '@/assets/img/underline-2.svg'
const visibleJobs = jobs.slice(0, 4)
</script>
<template>
  <section class="py-16 sm:py-20">
    <div class="mx-auto max-w-[1440px] px-6 sm:px-10 lg:px-[108px]">
      <div class="mb-10 flex flex-wrap items-center justify-between gap-5">
        <div><h2 class="text-4xl font-semibold leading-tight text-[#0b2b82] sm:text-[56px]">Featured <span class="text-[#7b66ff]">Jobs</span></h2><img :src="underline" alt="" class="mt-2 h-2 w-[123px]" /></div>
        <router-link to="/jobs" class="text-sm font-semibold text-[#0b2b82] underline underline-offset-4">Browse all jobs →</router-link>
      </div>
      <div class="grid gap-6 md:grid-cols-2"><JobCard v-for="job in visibleJobs" :key="job.id" :job="job" /></div>
    </div>
  </section>
</template>
