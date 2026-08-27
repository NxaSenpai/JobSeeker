<script setup lang="ts">
import { computed, ref } from 'vue'
import CompanyCard from '@/components/public/CompanyCard.vue'
import { companies } from '@/data/catalog'

const search = ref('')
const industry = ref('All industries')
const filteredCompanies = computed(() => {
  const keyword = search.value.toLowerCase().trim()
  return companies.filter((company) => (!keyword || `${company.name} ${company.industry} ${company.location}`.toLowerCase().includes(keyword)) && (industry.value === 'All industries' || company.industry === industry.value))
})
</script>

<template>
  <section class="relative overflow-hidden border-b border-[#e8e4f7] bg-[#0b2b82]">
    <div class="pointer-events-none absolute -right-24 -top-32 size-[420px] rounded-full border-[70px] border-[#1c4297] opacity-60"></div><div class="pointer-events-none absolute bottom-0 left-[16%] h-20 w-72 rounded-t-full bg-[#7b66ff]/20 blur-2xl"></div>
    <div class="relative mx-auto max-w-[1440px] px-6 py-16 sm:px-10 lg:px-[108px] lg:py-20"><p class="text-sm font-semibold uppercase tracking-[0.18em] text-[#bcb1ff]">Meet the teams behind the work</p><h1 class="mt-4 max-w-2xl text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">Find a company you can believe in.</h1><p class="mt-5 max-w-xl text-base leading-7 text-[#c5d1f0]">Explore companies by their culture, craft, and the opportunities they are creating now.</p></div>
  </section>

  <section class="mx-auto max-w-[1440px] px-6 py-10 sm:px-10 lg:px-[108px] lg:py-14">
    <div class="flex flex-col gap-3 rounded-2xl border border-[#e5e1f5] bg-white p-3 shadow-[0_14px_35px_rgba(30,35,90,0.06)] sm:flex-row sm:p-4"><label class="flex flex-1 items-center gap-3 rounded-xl bg-[#f8f7fc] px-4 py-3.5"><svg class="size-5 text-[#7c70ba]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8"><circle cx="11" cy="11" r="6" /><path stroke-linecap="round" d="m20 20-4.2-4.2" /></svg><input v-model="search" type="search" placeholder="Search by company, industry, or location" class="w-full bg-transparent text-sm text-[#0b2b82] outline-none placeholder:text-[#8994b6]" /></label><select v-model="industry" class="rounded-xl bg-[#f8f7fc] px-4 py-3.5 text-sm text-[#53669a] outline-none sm:w-56"><option>All industries</option><option v-for="item in [...new Set(companies.map((company) => company.industry))]" :key="item">{{ item }}</option></select></div>
    <div class="mt-12 flex items-end justify-between gap-5"><div><p class="text-sm font-semibold uppercase tracking-[0.14em] text-[#7b66ff]">Companies hiring now</p><h2 class="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[#0b2b82]">Build your next chapter with the right team.</h2></div><p class="hidden rounded-full bg-[#f4f1ff] px-4 py-2 text-sm text-[#6251c5] sm:block">{{ filteredCompanies.length }} companies</p></div>
    <div v-if="filteredCompanies.length" class="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-3"><CompanyCard v-for="company in filteredCompanies" :key="company.id" :company="company" /></div>
    <div v-else class="mt-7 rounded-2xl border border-dashed border-[#d9d2f4] bg-[#faf9ff] px-6 py-16 text-center"><p class="text-lg font-semibold text-[#0b2b82]">No companies match that search</p><button type="button" class="mt-4 text-sm font-semibold text-[#7b66ff]" @click="search = ''; industry = 'All industries'">Clear search</button></div>
  </section>
</template>
