<script setup lang="ts">
import catDesign from '@/assets/img/cat-design.png'
import catAnalyst from '@/assets/img/cat-analyst.png'
import catElectrician from '@/assets/img/cat-electrician.png'
import catFinance from '@/assets/img/cat-finance.png'
import catTechnology from '@/assets/img/cat-technology.png'
import catEngineering from '@/assets/img/cat-engineering.png'
import catMarketing from '@/assets/img/cat-marketing.png'
import catProgrammer from '@/assets/img/cat-programmer.png'

const categories = [
  { name: 'Design', icon: catDesign },
  { name: 'Analyst', icon: catAnalyst },
  { name: 'Electrician', icon: catElectrician },
  { name: 'Finance', icon: catFinance },
  { name: 'Technology', icon: catTechnology },
  { name: 'Engineering', icon: catEngineering },
  { name: 'Marketing', icon: catMarketing },
  { name: 'Programmer', icon: catProgrammer },
]

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
    <div class="mx-auto flex max-w-[1440px] flex-col gap-10 px-[108px]">
      <h2 class="text-[56px] font-semibold leading-[1.2] text-[#0b2b82]">
        Explore by <span class="text-[#7b66ff]">category</span>
      </h2>

      <div
        class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
      >
        <a
          v-for="category in categories"
          :key="category.name"
          href="#"
          class="flex h-[144px] items-center gap-4 border border-[#d8d1ff] px-6 transition-colors hover:border-[#7b66ff] hover:bg-[#f7f5ff]"
        >
          <div class="size-12 shrink-0" :style="iconStyle(category.icon)" />
          <div class="flex flex-col gap-5">
            <span class="text-2xl font-semibold text-[#0b2b82]">
              {{ category.name }}
            </span>
            <span class="whitespace-nowrap text-base text-[#3d589b]">
              235 Jobs Available
            </span>
          </div>
        </a>
      </div>
    </div>
  </section>
</template>
