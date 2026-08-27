<script setup lang="ts">
import type { Job } from '@/data/catalog'

defineProps<{ job: Job; compact?: boolean }>()
</script>

<template>
  <article class="group relative flex flex-col gap-5 rounded-2xl border border-[#e7e4f4] bg-white p-6 shadow-[0_10px_30px_rgba(24,31,78,0.04)] transition duration-300 hover:-translate-y-1 hover:border-[#cfc7ff] hover:shadow-[0_20px_45px_rgba(46,40,105,0.12)]">
    <div class="flex items-start justify-between gap-4">
      <div class="flex min-w-0 items-center gap-3">
        <div class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#f7f5ff]">
          <img :src="job.logo" :alt="`${job.company} logo`" class="size-8 object-contain" />
        </div>
        <div class="min-w-0">
          <p class="truncate text-sm font-medium text-[#4b5793]">{{ job.company }}</p>
          <p class="mt-1 text-xs text-[#8b81d0]">{{ job.posted }}</p>
        </div>
      </div>
      <button type="button" class="grid size-9 shrink-0 place-items-center rounded-full border border-[#e5e1f5] text-[#7b66ff] transition hover:border-[#7b66ff] hover:bg-[#f3f1ff]" aria-label="Save job">
        <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M5 3.75A2.25 2.25 0 017.25 1.5h9.5A2.25 2.25 0 0119 3.75V22l-7-4-7 4V3.75z" /></svg>
      </button>
    </div>

    <div>
      <router-link :to="`/jobs/${job.id}`" class="text-xl font-semibold tracking-[-0.02em] text-[#0b2b82] transition hover:underline group-hover:text-[#6d58ed]">{{ job.title }}</router-link>
      <p v-if="!compact" class="mt-2 line-clamp-2 text-sm leading-6 text-[#52669e]">{{ job.summary }}</p>
    </div>

    <div class="flex flex-wrap gap-2">
      <span class="rounded-full bg-[#f3f1ff] px-3 py-1 text-xs font-medium text-[#6956d3]">{{ job.type }}</span>
      <span class="rounded-full bg-[#f5f7ff] px-3 py-1 text-xs font-medium text-[#52669e]">{{ job.workplace }}</span>
      <span v-for="skill in job.skills.slice(0, compact ? 2 : 3)" :key="skill" class="rounded-full bg-[#f8f8fb] px-3 py-1 text-xs text-[#68759d]">{{ skill }}</span>
    </div>

    <div class="flex items-center justify-between border-t border-[#efedf7] pt-4 text-sm">
      <span class="flex items-center gap-1.5 text-[#52669e]"><svg class="size-4 text-[#8172d3]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21s6-4.35 6-10a6 6 0 10-12 0c0 5.65 6 10 6 10z" /><circle cx="12" cy="11" r="2" /></svg>{{ job.location }}</span>
      <span class="font-semibold text-[#0b2b82]">{{ job.salary }}</span>
    </div>
  </article>
</template>
