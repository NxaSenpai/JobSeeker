<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import JobCard from '@/components/public/JobCard.vue'
import { companies, getJob, jobs } from '@/data/catalog'

const route = useRoute()
const job = computed(() => getJob(String(route.params.id)))
const company = computed(() => companies.find((item) => item.name === job.value.company) ?? companies[0]!)
const similarJobs = computed(() => jobs.filter((item) => item.id !== job.value.id && item.category === job.value.category).slice(0, 2))
</script>

<template>
  <section class="border-b border-[#e8e4f7] bg-[#f3f1ff]">
    <div class="mx-auto max-w-[1440px] px-6 py-10 sm:px-10 lg:px-[108px] lg:py-14">
      <nav class="flex items-center gap-2 text-sm text-[#66739d]"><router-link to="/jobs" class="hover:text-[#715cdf]">Jobs</router-link><span>/</span><span class="truncate text-[#35447b]">{{ job.title }}</span></nav>
      <div class="mt-8 flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex items-start gap-5">
          <div class="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-white shadow-[0_8px_20px_rgba(37,40,97,0.08)]"><img :src="job.logo" :alt="`${job.company} logo`" class="size-10 object-contain" /></div>
          <div><p class="text-sm font-medium text-[#705fcb]">{{ job.company }}</p><h1 class="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[#0b2b82] sm:text-5xl">{{ job.title }}</h1><div class="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#56679b]"><span>{{ job.location }}</span><span class="hidden text-[#b6addd] sm:inline">•</span><span>{{ job.workplace }}</span><span class="hidden text-[#b6addd] sm:inline">•</span><span>{{ job.type }}</span></div></div>
        </div>
        <div class="rounded-xl border border-[#dcd5f4] bg-white px-5 py-4"><p class="text-xs uppercase tracking-[0.15em] text-[#8173be]">Salary range</p><p class="mt-1 text-lg font-semibold text-[#0b2b82]">{{ job.salary }}</p></div>
      </div>
    </div>
  </section>

  <section class="mx-auto grid max-w-[1440px] gap-10 px-6 py-10 sm:px-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-[108px] lg:py-14">
    <article class="min-w-0">
      <div class="flex flex-wrap gap-2"><span v-for="skill in job.skills" :key="skill" class="rounded-full bg-[#f2efff] px-3 py-1.5 text-sm font-medium text-[#6551cb]">{{ skill }}</span></div>
      <div class="mt-10 space-y-10 text-[#53669a]">
        <section><h2 class="text-2xl font-semibold tracking-[-0.02em] text-[#0b2b82]">About the role</h2><p class="mt-4 max-w-3xl text-base leading-8">{{ job.description }}</p></section>
        <section><h2 class="text-2xl font-semibold tracking-[-0.02em] text-[#0b2b82]">What you’ll do</h2><ul class="mt-5 space-y-4"><li v-for="item in job.responsibilities" :key="item" class="flex gap-3 leading-7"><span class="mt-2 size-2 shrink-0 rounded-full bg-[#7b66ff]"></span>{{ item }}</li></ul></section>
        <section><h2 class="text-2xl font-semibold tracking-[-0.02em] text-[#0b2b82]">What you’ll bring</h2><ul class="mt-5 space-y-4"><li v-for="item in job.requirements" :key="item" class="flex gap-3 leading-7"><svg class="mt-1 size-5 shrink-0 text-[#7b66ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m5 12 4 4L19 6" /></svg>{{ item }}</li></ul></section>
      </div>
      <section v-if="similarJobs.length" class="mt-14 border-t border-[#ebe8f3] pt-10"><div class="flex items-center justify-between"><h2 class="text-2xl font-semibold text-[#0b2b82]">Similar opportunities</h2><router-link to="/jobs" class="text-sm font-semibold text-[#715cdf]">Browse all jobs</router-link></div><div class="mt-6 grid gap-5 md:grid-cols-2"><JobCard v-for="item in similarJobs" :key="item.id" :job="item" compact /></div></section>
    </article>

    <aside class="h-fit space-y-5 lg:sticky lg:top-6">
      <div class="rounded-2xl bg-[#0b2b82] p-6 text-white shadow-[0_18px_38px_rgba(11,43,130,0.2)]"><p class="text-sm text-[#bdc9f1]">Ready to take the next step?</p><router-link to="/auth" class="mt-5 flex w-full items-center justify-center rounded-xl bg-[#7b66ff] px-5 py-3.5 text-sm font-semibold transition hover:bg-[#6f5cf9]">Apply for this role</router-link><button type="button" class="mt-3 flex w-full items-center justify-center rounded-xl border border-[#506db4] px-5 py-3 text-sm font-medium text-[#e5ebff] transition hover:bg-[#183e98]">Save for later</button><p class="mt-5 text-center text-xs text-[#9cadde]">Application review begins after the closing date.</p></div>
      <router-link :to="`/companies/${company.id}`" class="block rounded-2xl border border-[#e7e4f4] bg-white p-5 transition hover:border-[#cfc7ff]"><div class="flex items-center gap-3"><div class="flex size-12 items-center justify-center rounded-xl" :style="{ backgroundColor: company.accent }"><img :src="company.logo" :alt="`${company.name} logo`" class="size-7 object-contain" /></div><div><p class="text-sm font-semibold text-[#0b2b82]">{{ company.name }}</p><p class="text-xs text-[#67749c]">{{ company.industry }}</p></div></div><p class="mt-4 text-sm leading-6 text-[#62709a]">{{ company.about.slice(0, 142) }}…</p><span class="mt-4 inline-flex text-sm font-semibold text-[#715cdf]">View company profile →</span></router-link>
      <div class="rounded-2xl border border-[#e7e4f4] bg-[#fcfbff] p-5"><p class="font-semibold text-[#0b2b82]">Role overview</p><dl class="mt-4 space-y-4 text-sm"><div class="flex justify-between gap-4"><dt class="text-[#68769d]">Employment</dt><dd class="font-medium text-[#314178]">{{ job.type }}</dd></div><div class="flex justify-between gap-4"><dt class="text-[#68769d]">Workplace</dt><dd class="font-medium text-[#314178]">{{ job.workplace }}</dd></div><div class="flex justify-between gap-4"><dt class="text-[#68769d]">Posted</dt><dd class="font-medium text-[#314178]">{{ job.posted }}</dd></div></dl></div>
    </aside>
  </section>
</template>
