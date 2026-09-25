<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import CompanyCard from '@/components/public/CompanyCard.vue'
import type { Company } from '@/data/catalog'
import { listPublicCompanies } from '@/services/publicCatalog'
import { ApiRequestError } from '@/services/api'

const search = ref('')
const industry = ref('All industries')
const companies = ref<Company[]>([])
const totalCompanies = ref(0)
const currentPage = ref(1)
const pageSize = 12
const loading = ref(true)
const loadError = ref('')
let requestNumber = 0
let activeController: AbortController | undefined
const pageCount = computed(() => Math.max(1, Math.ceil(totalCompanies.value / pageSize)))
const industryOptions = computed(() => [...new Set(companies.value.map((company) => company.industry).filter((value) => value !== 'Industry not listed'))])

async function loadCompanies() {
  const requestId = ++requestNumber
  activeController?.abort()
  const controller = new AbortController()
  activeController = controller
  loading.value = true
  loadError.value = ''
  try {
    const result = await listPublicCompanies({
      page: currentPage.value,
      limit: pageSize,
      search: search.value.trim() || undefined,
      industry: industry.value === 'All industries' ? undefined : industry.value,
      signal: controller.signal,
    })
    if (requestId !== requestNumber) return
    companies.value = result.companies
    totalCompanies.value = result.total
  } catch (cause) {
    if (controller.signal.aborted || requestId !== requestNumber) return
    loadError.value = cause instanceof ApiRequestError
      ? cause.message
      : 'We could not load company profiles right now. Check your connection and try again.'
    companies.value = []
    totalCompanies.value = 0
  } finally {
    if (requestId === requestNumber) loading.value = false
  }
}

function applyFilters() {
  currentPage.value = 1
  void loadCompanies()
}

function changePage(page: number) {
  if (page < 1 || page > pageCount.value || page === currentPage.value) return
  currentPage.value = page
  void loadCompanies()
}

onMounted(() => void loadCompanies())
onBeforeUnmount(() => {
  requestNumber += 1
  activeController?.abort()
})
</script>

<template>
  <section class="relative overflow-hidden border-b border-[#e8e4f7] bg-[#7b66ff]">
    <div class="pointer-events-none absolute -right-24 -top-32 size-[420px] rounded-full border-[70px] border-[#1c4297] opacity-60"></div><div class="pointer-events-none absolute bottom-0 left-[16%] h-20 w-72 rounded-t-full bg-[#7b66ff]/20 blur-2xl"></div>
    <div class="relative mx-auto max-w-[1440px] px-6 py-16 sm:px-10 lg:px-[108px] lg:py-20"><p class="text-sm font-semibold uppercase tracking-[0.18em] text-[#bcb1ff]">Meet the teams behind the work</p><h1 class="mt-4 max-w-2xl text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">Find a company you can believe in.</h1></div>
  </section>

  <section class="mx-auto max-w-[1440px] px-6 py-10 sm:px-10 lg:px-[108px] lg:py-14">
    <form class="flex flex-col gap-3 rounded-2xl border border-[#e5e1f5] bg-white p-3 shadow-[0_14px_35px_rgba(30,35,90,0.06)] sm:flex-row sm:p-4" aria-label="Search companies" @submit.prevent="applyFilters"><label class="flex flex-1 items-center gap-3 rounded-xl bg-[#f8f7fc] px-4 py-3.5"><svg class="size-5 text-[#7c70ba]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8"><circle cx="11" cy="11" r="6" /><path stroke-linecap="round" d="m20 20-4.2-4.2" /></svg><span class="sr-only">Search companies</span><input v-model="search" type="search" placeholder="Search by company, industry, or location" class="w-full bg-transparent text-sm text-[#0b2b82] outline-none placeholder:text-[#8994b6]" /></label><select v-model="industry" aria-label="Filter by industry" class="rounded-xl bg-[#f8f7fc] px-4 py-3.5 text-sm text-[#53669a] outline-none sm:w-56" @change="applyFilters"><option>All industries</option><option v-for="item in industryOptions" :key="item">{{ item }}</option></select><button type="submit" class="cursor-pointer rounded-xl bg-[#7b66ff] px-6 py-3.5 text-sm font-semibold text-white">Search companies</button></form>
    <div class="mt-12 flex items-end justify-between gap-5"><div><p class="text-sm font-semibold uppercase tracking-[0.14em] text-[#7b66ff]">Companies hiring now</p><h2 class="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[#0b2b82]">Build your next chapter with the right team.</h2></div><p class="hidden rounded-full bg-[#f4f1ff] px-4 py-2 text-sm text-[#6251c5] sm:block">{{ totalCompanies }} companies</p></div>
    <div v-if="loading" class="mt-7 rounded-2xl border border-[#e7e4f4] bg-[#fcfbff] px-6 py-16 text-center text-sm text-[#62709a]" role="status">Loading verified company profiles…</div>
    <div v-else-if="loadError" class="mt-7 rounded-2xl border border-[#f1d6d6] bg-[#fff8f8] px-6 py-12 text-center" role="alert"><p class="font-semibold text-[#813a3a]">Companies are temporarily unavailable</p><p class="mt-2 text-sm text-[#795e5e]">{{ loadError }}</p><button type="button" class="mt-5 rounded-lg bg-[#7b66ff] px-4 py-2.5 text-sm font-semibold text-white" @click="loadCompanies">Try again</button></div>
    <template v-else-if="companies.length"><div class="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-3"><CompanyCard v-for="company in companies" :key="company.id" :company="company" /></div><nav v-if="pageCount > 1" class="mt-8 flex items-center justify-center gap-4" aria-label="Company result pages"><button type="button" class="rounded-lg border border-[#e3dff1] px-4 py-2 text-sm font-medium text-[#36457e] disabled:opacity-50" :disabled="currentPage <= 1 || loading" @click="changePage(currentPage - 1)">Previous</button><span class="text-sm text-[#62709a]" aria-live="polite">Page {{ currentPage }} of {{ pageCount }}</span><button type="button" class="rounded-lg border border-[#e3dff1] px-4 py-2 text-sm font-medium text-[#36457e] disabled:opacity-50" :disabled="currentPage >= pageCount || loading" @click="changePage(currentPage + 1)">Next</button></nav></template>
    <div v-else class="mt-7 rounded-2xl border border-dashed border-[#d9d2f4] bg-[#faf9ff] px-6 py-16 text-center"><p class="text-lg font-semibold text-[#0b2b82]">No verified companies to show</p><p class="mt-2 text-sm text-[#63719d]">{{ search || industry !== 'All industries' ? 'Try changing your search or industry filter.' : 'Company profiles appear here after their details have been reviewed.' }}</p><button v-if="search || industry !== 'All industries'" type="button" class="mt-4 text-sm font-semibold text-[#7b66ff]" @click="search = ''; industry = 'All industries'; applyFilters()">Clear search</button></div>
  </section>
</template>
