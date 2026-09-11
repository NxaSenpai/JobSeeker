<script setup lang="ts">
import type { Company } from '@/data/catalog'

defineProps<{ company: Company }>()
</script>

<template>
  <article class="group rounded-2xl border border-[#e7e4f4] bg-white p-6 shadow-[0_10px_30px_rgba(24,31,78,0.04)] transition duration-300 hover:-translate-y-1 hover:border-[#cfc7ff] hover:shadow-[0_20px_45px_rgba(46,40,105,0.12)]">
    <div class="flex items-start justify-between gap-4">
      <div class="flex size-14 items-center justify-center rounded-2xl" :style="{ backgroundColor: company.accent }">
        <img :src="company.logo" :alt="`${company.name} logo`" class="size-9 object-contain" />
      </div>
      <span class="rounded-full bg-[#f4f1ff] px-3 py-1 text-xs font-semibold text-[#6956d3]">{{ company.openRoles }} open roles</span>
    </div>
    <div class="mt-5">
      <router-link :to="`/companies/${company.id}`" class="text-xl font-semibold tracking-[-0.02em] text-[#0b2b82] transition hover:underline group-hover:text-[#6d58ed]">{{ company.name }}</router-link>
      <p class="mt-1 text-sm text-[#53669a]">{{ company.industry }}</p>
    </div>
    <p class="mt-4 flex items-center gap-1.5 text-sm text-[#6d789d]"><svg class="size-4 text-[#8172d3]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21s6-4.35 6-10a6 6 0 10-12 0c0 5.65 6 10 6 10z" /><circle cx="12" cy="11" r="2" /></svg>{{ company.location }}</p>
    <div class="mt-5 flex items-center justify-between gap-3 border-t border-[#efedf7] pt-4 text-sm">
      <span class="text-[#53669a]">{{ company.size }}</span>
      <router-link :to="`/companies/${company.id}`" class="font-semibold text-[#6d58ed] hover:underline">View profile →</router-link>
    </div>
  </article>
</template>
