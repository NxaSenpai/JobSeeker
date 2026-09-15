<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import JobCard from '@/components/public/JobCard.vue'
import { jobs } from '@/data/catalog'

const route = useRoute()
const router = useRouter()
const workplaceOptions = ['All', 'Remote', 'Hybrid', 'On-site'] as const
const jobTypeOptions = ['All', 'Full-time', 'Part-time', 'Contract'] as const
const search = ref('')
const appliedSearch = ref('')
const workplace = ref<(typeof workplaceOptions)[number]>('All')
const appliedWorkplace = ref<(typeof workplaceOptions)[number]>('All')
const jobType = ref<(typeof jobTypeOptions)[number]>('All')
const appliedJobType = ref<(typeof jobTypeOptions)[number]>('All')
const sort = ref('Newest')
const resultStatus = ref('')

function queryString(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function queryOption<T extends readonly string[]>(value: unknown, options: T, fallback: T[number]) {
  const candidate = queryString(value)
  return (options.includes(candidate) ? candidate : fallback) as T[number]
}

function syncFromRoute() {
  search.value = queryString(route.query.q)
  appliedSearch.value = search.value
  workplace.value = queryOption(route.query.workplace, workplaceOptions, 'All')
  appliedWorkplace.value = workplace.value
  jobType.value = queryOption(route.query.type, jobTypeOptions, 'All')
  appliedJobType.value = jobType.value
}

watch(() => [route.query.q, route.query.workplace, route.query.type], syncFromRoute, { immediate: true })

const categoryOptions = computed(() => [...new Set(jobs.map(job => job.category))])
const activeCategory = computed(() => {
  const normalized = appliedSearch.value.trim().toLowerCase()
  return categoryOptions.value.find(category => category.toLowerCase() === normalized) ?? ''
})

const filteredJobs = computed(() => {
  const keyword = appliedSearch.value.trim().toLowerCase()
  return [...jobs]
    .filter((job) => !keyword || (activeCategory.value ? job.category === activeCategory.value : [job.title, job.company, job.location, job.category, ...job.skills].join(' ').toLowerCase().includes(keyword)))
    .filter((job) => appliedWorkplace.value === 'All' || job.workplace === appliedWorkplace.value)
    .filter((job) => appliedJobType.value === 'All' || job.type === appliedJobType.value)
    .sort((a, b) => sort.value === 'Salary' ? b.salary.localeCompare(a.salary) : 0)
})

const pageEyebrow = computed(() => activeCategory.value ? `${activeCategory.value} roles` : 'Opportunity, on your terms')
const pageDescription = computed(() => activeCategory.value ? `Browse current ${activeCategory.value.toLowerCase()} openings from teams building thoughtful products.` : 'Explore carefully selected roles from teams building thoughtful, ambitious products.')
const resultCountLabel = computed(() => `${filteredJobs.value.length} ${activeCategory.value ? activeCategory.value.toLowerCase() : ''} ${filteredJobs.value.length === 1 ? 'role' : 'roles'}`.replace('  ', ' ').trim())
const filtersDirty = computed(() => search.value.trim() !== appliedSearch.value.trim() || workplace.value !== appliedWorkplace.value || jobType.value !== appliedJobType.value)

function applyFilters() {
  appliedSearch.value = search.value.trim()
  appliedWorkplace.value = workplace.value
  appliedJobType.value = jobType.value
  resultStatus.value = `${resultCountLabel.value} shown.`
  void router.replace({
    query: {
      q: appliedSearch.value || undefined,
      workplace: appliedWorkplace.value === 'All' ? undefined : appliedWorkplace.value,
      type: appliedJobType.value === 'All' ? undefined : appliedJobType.value,
    },
  })
}

function applyCategory(category: string) {
  search.value = category
  applyFilters()
}

function clearCategory() {
  search.value = ''
  applyFilters()
}

function clearFilters() {
  search.value = ''
  workplace.value = 'All'
  jobType.value = 'All'
  sort.value = 'Newest'
  applyFilters()
}
</script>

<template>
  <section class="border-b border-[#e8e4f7] bg-[#f3f1ff]">
    <div class="mx-auto max-w-[1440px] px-6 py-16 sm:px-10 lg:px-[108px] lg:py-20">
      <p class="text-sm font-semibold uppercase tracking-[0.18em] text-[#7b66ff]">{{ pageEyebrow }}</p>
      <div class="mt-4 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div>
          <h1 class="max-w-2xl text-4xl font-semibold tracking-[-0.04em] text-[#0b2b82] sm:text-5xl"><template v-if="activeCategory">{{ activeCategory }} roles worth a <span class="text-[#7b66ff]">closer look.</span></template><template v-else>Find work that feels like a <span class="text-[#7b66ff]">good next move.</span></template></h1>
        </div>
        <p class="rounded-full border border-[#d8d1ff] bg-white px-4 py-2 text-sm font-medium text-[#53669a]">{{ activeCategory ? resultCountLabel : `${jobs.length} roles available` }}</p>
      </div>
    </div>
  </section>

  <section class="mx-auto max-w-[1440px] px-6 py-10 sm:px-10 lg:px-[108px] lg:py-14">
    <form class="rounded-2xl border border-[#e5e1f5] bg-white p-3 shadow-[0_14px_35px_rgba(30,35,90,0.06)] sm:p-4" aria-label="Search and filter jobs" @submit.prevent="applyFilters">
      <div class="grid gap-3 lg:grid-cols-[1.45fr_1fr_1fr_auto]">
        <label class="flex items-center gap-3 rounded-xl bg-[#f8f7fc] px-4 py-3.5">
          <span class="sr-only">Search jobs</span>
          <svg class="size-5 shrink-0 text-[#7c70ba]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8"><circle cx="11" cy="11" r="6" /><path stroke-linecap="round" d="m20 20-4.2-4.2" /></svg>
          <input v-model="search" type="search" class="w-full bg-transparent text-sm text-[#0b2b82] outline-none placeholder:text-[#8994b6]" placeholder="Job title, skill, or company" />
        </label>
        <label class="flex items-center gap-3 rounded-xl bg-[#f8f7fc] px-4 py-3.5">
          <span class="sr-only">Workplace</span>
          <svg class="size-5 shrink-0 text-[#7c70ba]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21s6-4.35 6-10a6 6 0 10-12 0c0 5.65 6 10 6 10z" /><circle cx="12" cy="11" r="2" /></svg>
          <select v-model="workplace" class="w-full appearance-none bg-transparent text-sm text-[#53669a] outline-none"><option>All</option><option>Remote</option><option>Hybrid</option><option>On-site</option></select>
        </label>
        <label class="flex items-center gap-3 rounded-xl bg-[#f8f7fc] px-4 py-3.5">
          <span class="sr-only">Job type</span>
          <svg class="size-5 shrink-0 text-[#7c70ba]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" /></svg>
          <select v-model="jobType" class="w-full appearance-none bg-transparent text-sm text-[#53669a] outline-none"><option>All</option><option>Full-time</option><option>Part-time</option><option>Contract</option></select>
        </label>
        <button type="submit" class="cursor-pointer rounded-xl bg-[#7b66ff] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(123,102,255,0.27)] transition hover:-translate-y-0.5 hover:bg-[#6f5cf9] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7b66ff] focus-visible:ring-offset-2">Search roles</button>
      </div>
      <p class="sr-only" aria-live="polite">{{ resultStatus }}</p>
    </form>

    <div class="mt-10 grid gap-10 lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside class="h-fit rounded-2xl border border-[#e7e4f4] bg-[#fcfbff] p-5 lg:top-6">
        <div class="flex items-center justify-between">
          <h2 class="font-semibold text-[#0b2b82]">Filter</h2>
        </div>
        <div class="mt-6 border-t border-[#ece8f7] pt-5">
          <p class="text-sm font-semibold text-[#263571]">Workplace</p>
          <div class="mt-3 space-y-2.5">
            <label v-for="option in ['All', 'Remote', 'Hybrid', 'On-site']" :key="option" class="flex cursor-pointer items-center justify-between text-sm text-[#5c6894]"><span>{{ option }}</span><input v-model="workplace" :value="option" type="radio" class="size-4 accent-[#7b66ff] cursor-pointer" /></label>
          </div>
        </div>
        <div class="mt-6 border-t border-[#ece8f7] pt-5">
          <p class="text-sm font-semibold text-[#263571]">Job type</p>
          <div class="mt-3 space-y-2.5">
            <label v-for="option in ['All', 'Full-time', 'Part-time', 'Contract']" :key="option" class="flex cursor-pointer items-center justify-between text-sm text-[#5c6894]"><span>{{ option }}</span><input v-model="jobType" :value="option" type="radio" class="size-4 accent-[#7b66ff] cursor-pointer" /></label>
          </div>
        </div>
          <div class="mt-6 border-t border-[#ece8f7] pt-5"><p class="text-sm font-semibold text-[#263571]">Popular categories</p><div class="mt-3 flex flex-wrap gap-2"><button v-for="category in categoryOptions" :key="category" type="button" :aria-pressed="activeCategory === category" class="cursor-pointer rounded-full bg-white px-3 py-1.5 text-xs text-[#62709a] ring-1 ring-[#e7e4f4] transition hover:-translate-y-0.5 hover:text-[#5f4bd2] hover:ring-[#bcb1f5] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7b66ff] focus-visible:ring-offset-2" :class="{ 'bg-[#f0edff] text-[#5f4bd2] ring-[#bcb1f5]': activeCategory === category }" @click="applyCategory(category)">{{ category }}</button></div></div>
      </aside>

      <div>
        <div class="flex flex-col gap-3 border-b border-[#e9e6f2] pb-5 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-sm text-[#5d6b97]"><span class="font-semibold text-[#0b2b82]">{{ filteredJobs.length }} jobs</span> matching your search</p>
          <label class="flex items-center gap-3 text-sm text-[#61709b]">Sort by <select v-model="sort" class="rounded-lg border border-[#e3dff1] bg-white px-3 py-2 text-sm font-medium text-[#36457e] outline-none"><option>Newest</option><option>Salary</option></select></label>
        </div>
        <div v-if="filteredJobs.length" class="mt-6 grid gap-5 xl:grid-cols-2"><JobCard v-for="job in filteredJobs" :key="job.id" :job="job" /></div>
        <div v-else class="mt-6 rounded-2xl border border-dashed border-[#d9d2f4] bg-[#faf9ff] px-6 py-16 text-center"><p class="text-lg font-semibold text-[#0b2b82]">No roles found</p><p class="mt-2 text-sm text-[#63719d]">Try adjusting your search or clearing your filters.</p><button type="button" class="mt-5 cursor-pointer text-sm font-semibold text-[#7b66ff] underline-offset-4 transition hover:text-[#503dc0] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7b66ff] focus-visible:ring-offset-2" @click="clearFilters">Reset filters</button></div>
      </div>
    </div>
  </section>
</template>
