<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import JobCard from '@/components/public/JobCard.vue'
import { jobs } from '@/data/catalog'

const route = useRoute()
const search = ref(typeof route.query.q === 'string' ? route.query.q : '')
watch(() => route.query.q, value => { search.value = typeof value === 'string' ? value : '' })
const workplace = ref('All')
const jobType = ref('All')
const sort = ref('Newest')

const filteredJobs = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  return [...jobs]
    .filter((job) => !keyword || [job.title, job.company, job.location, job.category, ...job.skills].join(' ').toLowerCase().includes(keyword))
    .filter((job) => workplace.value === 'All' || job.workplace === workplace.value)
    .filter((job) => jobType.value === 'All' || job.type === jobType.value)
    .sort((a, b) => sort.value === 'Salary' ? b.salary.localeCompare(a.salary) : a.title.localeCompare(b.title))
})

function clearFilters() {
  search.value = ''
  workplace.value = 'All'
  jobType.value = 'All'
  sort.value = 'Newest'
}
</script>

<template>
  <section class="border-b border-[#e8e4f7] bg-[#f3f1ff]">
    <div class="mx-auto max-w-[1440px] px-6 py-16 sm:px-10 lg:px-[108px] lg:py-20">
      <p class="text-sm font-semibold uppercase tracking-[0.18em] text-[#7b66ff]">Opportunity, on your terms</p>
      <div class="mt-4 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div>
          <h1 class="max-w-2xl text-4xl font-semibold tracking-[-0.04em] text-[#0b2b82] sm:text-5xl">Find work that feels like a <span class="text-[#7b66ff]">good next move.</span></h1>
          <p class="mt-5 max-w-xl text-base leading-7 text-[#52669e]">Explore carefully selected roles from teams building thoughtful, ambitious products.</p>
        </div>
        <p class="rounded-full border border-[#d8d1ff] bg-white px-4 py-2 text-sm font-medium text-[#53669a]">{{ jobs.length }} roles available</p>
      </div>
    </div>
  </section>

  <section class="mx-auto max-w-[1440px] px-6 py-10 sm:px-10 lg:px-[108px] lg:py-14">
    <div class="rounded-2xl border border-[#e5e1f5] bg-white p-3 shadow-[0_14px_35px_rgba(30,35,90,0.06)] sm:p-4">
      <div class="grid gap-3 lg:grid-cols-[1.45fr_1fr_1fr_auto]">
        <label class="flex items-center gap-3 rounded-xl bg-[#f8f7fc] px-4 py-3.5">
          <svg class="size-5 shrink-0 text-[#7c70ba]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8"><circle cx="11" cy="11" r="6" /><path stroke-linecap="round" d="m20 20-4.2-4.2" /></svg>
          <input v-model="search" type="search" class="w-full bg-transparent text-sm text-[#0b2b82] outline-none placeholder:text-[#8994b6]" placeholder="Job title, skill, or company" />
        </label>
        <label class="flex items-center gap-3 rounded-xl bg-[#f8f7fc] px-4 py-3.5">
          <svg class="size-5 shrink-0 text-[#7c70ba]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21s6-4.35 6-10a6 6 0 10-12 0c0 5.65 6 10 6 10z" /><circle cx="12" cy="11" r="2" /></svg>
          <select v-model="workplace" class="w-full appearance-none bg-transparent text-sm text-[#53669a] outline-none"><option>All</option><option>Remote</option><option>Hybrid</option><option>On-site</option></select>
        </label>
        <label class="flex items-center gap-3 rounded-xl bg-[#f8f7fc] px-4 py-3.5">
          <svg class="size-5 shrink-0 text-[#7c70ba]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" /></svg>
          <select v-model="jobType" class="w-full appearance-none bg-transparent text-sm text-[#53669a] outline-none"><option>All</option><option>Full-time</option><option>Part-time</option><option>Contract</option></select>
        </label>
        <button type="button" class="rounded-xl bg-[#7b66ff] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(123,102,255,0.27)] transition hover:bg-[#6f5cf9]">Search roles</button>
      </div>
    </div>

    <div class="mt-10 grid gap-10 lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside class="h-fit rounded-2xl border border-[#e7e4f4] bg-[#fcfbff] p-5 lg:sticky lg:top-6">
        <div class="flex items-center justify-between">
          <h2 class="font-semibold text-[#0b2b82]">Refine results</h2>
          <button type="button" class="text-sm font-medium text-[#7561dd] hover:text-[#5d48ca]" @click="clearFilters">Clear all</button>
        </div>
        <div class="mt-6 border-t border-[#ece8f7] pt-5">
          <p class="text-sm font-semibold text-[#263571]">Workplace</p>
          <div class="mt-3 space-y-2.5">
            <label v-for="option in ['All', 'Remote', 'Hybrid', 'On-site']" :key="option" class="flex cursor-pointer items-center justify-between text-sm text-[#5c6894]"><span>{{ option }}</span><input v-model="workplace" :value="option" type="radio" class="size-4 accent-[#7b66ff]" /></label>
          </div>
        </div>
        <div class="mt-6 border-t border-[#ece8f7] pt-5">
          <p class="text-sm font-semibold text-[#263571]">Job type</p>
          <div class="mt-3 space-y-2.5">
            <label v-for="option in ['All', 'Full-time', 'Part-time', 'Contract']" :key="option" class="flex cursor-pointer items-center justify-between text-sm text-[#5c6894]"><span>{{ option }}</span><input v-model="jobType" :value="option" type="radio" class="size-4 accent-[#7b66ff]" /></label>
          </div>
        </div>
        <div class="mt-6 border-t border-[#ece8f7] pt-5"><p class="text-sm font-semibold text-[#263571]">Popular categories</p><div class="mt-3 flex flex-wrap gap-2"><span v-for="category in ['Design', 'Technology', 'Marketing', 'Analyst']" :key="category" class="rounded-full bg-white px-3 py-1.5 text-xs text-[#62709a] ring-1 ring-[#e7e4f4]">{{ category }}</span></div></div>
      </aside>

      <div>
        <div class="flex flex-col gap-3 border-b border-[#e9e6f2] pb-5 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-sm text-[#5d6b97]"><span class="font-semibold text-[#0b2b82]">{{ filteredJobs.length }} jobs</span> matching your search</p>
          <label class="flex items-center gap-3 text-sm text-[#61709b]">Sort by <select v-model="sort" class="rounded-lg border border-[#e3dff1] bg-white px-3 py-2 text-sm font-medium text-[#36457e] outline-none"><option>Newest</option><option>Salary</option></select></label>
        </div>
        <div v-if="filteredJobs.length" class="mt-6 grid gap-5 xl:grid-cols-2"><JobCard v-for="job in filteredJobs" :key="job.id" :job="job" /></div>
        <div v-else class="mt-6 rounded-2xl border border-dashed border-[#d9d2f4] bg-[#faf9ff] px-6 py-16 text-center"><p class="text-lg font-semibold text-[#0b2b82]">No roles found</p><p class="mt-2 text-sm text-[#63719d]">Try adjusting your search or clearing your filters.</p><button type="button" class="mt-5 text-sm font-semibold text-[#7b66ff]" @click="clearFilters">Reset filters</button></div>
      </div>
    </div>
  </section>
</template>
