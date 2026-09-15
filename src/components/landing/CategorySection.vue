<script setup lang="ts">
import catDesign from '@/assets/img/cat-design.png'
import catAnalyst from '@/assets/img/cat-analyst.png'
import catElectrician from '@/assets/img/cat-electrician.png'
import catFinance from '@/assets/img/cat-finance.png'
import catTechnology from '@/assets/img/cat-technology.png'
import catEngineering from '@/assets/img/cat-engineering.png'
import catMarketing from '@/assets/img/cat-marketing.png'
import catProgrammer from '@/assets/img/cat-programmer.png'
import { jobs } from '@/data/catalog'

const categories = [
  { name: 'Design', icon: catDesign },
  { name: 'Analyst', icon: catAnalyst },
  { name: 'Electrician', icon: catElectrician },
  { name: 'Finance', icon: catFinance },
  { name: 'Technology', icon: catTechnology },
  { name: 'Engineering', icon: catEngineering },
  { name: 'Marketing', icon: catMarketing },
  { name: 'Programmer', icon: catProgrammer },
].map((category) => ({
  ...category,
  roleCount: jobs.filter(job => job.category === category.name).length,
})).filter(category => category.roleCount > 0)

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

      <div
        class="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4"
      >
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
              {{ category.roleCount }} {{ category.roleCount === 1 ? 'role' : 'roles' }} available
            </span>
          </div>
        </router-link>
      </div>
    </div>
  </section>
</template>
