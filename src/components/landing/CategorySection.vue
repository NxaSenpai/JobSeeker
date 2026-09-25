<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import catDesign from '@/assets/img/cat-design.png'
import catAnalyst from '@/assets/img/cat-analyst.png'
import catElectrician from '@/assets/img/cat-electrician.png'
import catFinance from '@/assets/img/cat-finance.png'
import catTechnology from '@/assets/img/cat-technology.png'
import catEngineering from '@/assets/img/cat-engineering.png'
import catMarketing from '@/assets/img/cat-marketing.png'
import catProgrammer from '@/assets/img/cat-programmer.png'
import { ApiRequestError } from '@/services/api'
import { listPublicJobCategories, type PublicJobCategory } from '@/services/publicCatalog'

const categories = ref<Array<PublicJobCategory & { icon: string }>>([])
const loading = ref(true)
const error = ref('')
let controller: AbortController | undefined

function iconForCategory(name: string) {
  const normalized = name.toLowerCase()
  if (/design|creative|art/.test(normalized)) return catDesign
  if (/analyst|data|research/.test(normalized)) return catAnalyst
  if (/electric|trade/.test(normalized)) return catElectrician
  if (/finance|accounting/.test(normalized)) return catFinance
  if (/engineering|engineer/.test(normalized)) return catEngineering
  if (/marketing|content|growth|community/.test(normalized)) return catMarketing
  if (/software|program|developer/.test(normalized)) return catProgrammer
  return catTechnology
}

async function loadCategories() {
  controller?.abort()
  controller = new AbortController()
  const activeController = controller
  loading.value = true
  error.value = ''
  try {
    const result = await listPublicJobCategories(activeController.signal)
    categories.value = result.categories
      .filter((category) => category.count > 0)
      .map((category) => ({ ...category, icon: iconForCategory(category.name) }))
  } catch (cause) {
    if (activeController.signal.aborted) return
    error.value = cause instanceof ApiRequestError
      ? cause.message
      : 'We could not load job categories. Please try again.'
    categories.value = []
  } finally {
    if (!activeController.signal.aborted) loading.value = false
  }
}

void loadCategories()
onBeforeUnmount(() => controller?.abort())

function iconStyle(icon: string) {
  return {
    backgroundColor: '#7b66ff',
    maskImage: `url(${icon})`,
    WebkitMaskImage: `url(${icon})`,
    maskSize: '48px 48px',
    WebkitMaskSize: '48px 48px',
    maskRepeat: 'no-repeat',
    WebkitMaskRepeat: 'no-repeat',
    maskPosition: 'center',
    WebkitMaskPosition: 'center',
  }
}
</script>

<template>
  <section class="pb-20 pt-10">
    <div class="mx-auto flex max-w-[1440px] flex-col gap-10 px-6 sm:px-10 lg:px-[108px]">
      <h2 class="text-4xl font-semibold leading-[1.2] text-[#0b2b82] sm:text-[56px]">
        Explore by <span class="text-[#7b66ff]">category</span>
      </h2>

      <p v-if="loading" class="text-sm text-[#52669e]" role="status">Loading job categories…</p>
      <div v-else-if="error" class="rounded-xl border border-[#f1cbd3] bg-[#fff7f9] p-5 text-sm text-[#8f354b]" role="alert">{{ error }} <button type="button" class="ml-2 font-semibold underline" @click="loadCategories">Try again</button></div>
      <div v-else-if="categories.length" class="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <router-link
          v-for="category in categories"
          :key="category.name"
          :to="{ path: '/jobs', query: { q: category.name } }"
          :aria-label="`Browse ${category.name} jobs`"
          class="group relative flex h-[144px] cursor-pointer items-center gap-4 border border-[#d8d1ff] px-6 transition duration-200 hover:-translate-y-0.5 hover:border-[#7b66ff] hover:bg-[#f7f5ff] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7b66ff] focus-visible:ring-offset-2"
        >
          <div class="size-12 shrink-0" :style="iconStyle(category.icon)" />
          <div class="flex flex-col gap-5">
            <span class="text-xl font-semibold text-[#0b2b82]">
              {{ category.name }}
            </span>
            <span class="whitespace-nowrap text-base text-[#3d589b]">
            {{ category.count }} {{ category.count === 1 ? 'role' : 'roles' }} available
            </span>
          </div>
        </router-link>
      </div>
      <p v-else class="text-sm text-[#52669e]">No job categories have current openings yet.</p>
    </div>
  </section>
</template>
