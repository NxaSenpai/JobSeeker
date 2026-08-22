<script setup lang="ts">
import arrow from '@/assets/img/arrow-up-right.svg'
import underline from '@/assets/img/underline-2.svg'
import appStore from '@/assets/img/app-store.png'
import spotify from '@/assets/img/spotify.png'
import wordpress from '@/assets/img/wordpress.png'
import slack from '@/assets/img/slack.png'
import search from '@/assets/img/search.png'
import telegram from '@/assets/img/telegram.png'
import figma from '@/assets/img/figma.png'
import pinterest from '@/assets/img/pinterest.png'

const description =
  'Join our team as an Email Marketing Specialist and lead our digital outreach efforts.'

const jobs = [
  { logo: appStore, title: 'Email Marketing' },
  { logo: spotify, title: 'Visual Designer' },
  { logo: wordpress, title: 'Data Analyst' },
  { logo: slack, title: 'Content Writer' },
  { logo: search, title: 'Product Designer' },
  { logo: telegram, title: 'PHP/JS Developer' },
  { logo: figma, title: 'Plugin Developer' },
  { logo: pinterest, title: 'Digital Marketer' },
]
</script>

<template>
  <section class="py-20">
    <div class="mx-auto flex max-w-[1440px] flex-col gap-12 px-[108px]">
      <!-- Heading -->
      <div class="flex items-center gap-14">
        <div class="flex flex-col items-start gap-2">
          <h2 class="text-[56px] font-semibold leading-[1.2] text-[#0b2b82]">
            Featured <span class="text-[#7b66ff]">Jobs</span>
          </h2>
          <img :src="underline" class="h-2 w-[123px]" alt="" />
        </div>
        <a href="#" class="flex items-center gap-2">
          <span class="text-base font-medium text-[#0b2b82] underline underline-offset-2">
            Browse All
          </span>
          <img :src="arrow" class="size-4" alt="" />
        </a>
      </div>

      <!-- Cards -->
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <article
          v-for="job in jobs"
          :key="job.title"
          class="flex h-[304px] flex-col gap-8 border border-[#e8e8e8] p-8 transition-shadow hover:shadow-[0_10px_40px_rgba(11,43,130,0.08)] cursor-pointer"
        >
          <div class="flex flex-col gap-6">
            <div class="flex items-center gap-8">
              <img :src="job.logo" class="size-12 object-contain" :alt="job.title" />
              <div class="h-8 w-px bg-[#dddddd]" />
              <span class="whitespace-nowrap text-base font-semibold uppercase text-[#7b66ff]">
                Full Time
              </span>
            </div>

            <div class="flex flex-col gap-4">
              <h3 class="text-2xl font-semibold text-[#0b2b82]">{{ job.title }}</h3>
              <p class="text-base leading-6 text-[#3d589b]">{{ description }}</p>
            </div>
          </div>

          <a href="#" class="flex items-center gap-2">
            <span class="text-base font-medium text-[#0c2e82] underline underline-offset-2">
              More Details
            </span>
            <img :src="arrow" class="size-4" alt="" />
          </a>
        </article>
      </div>
    </div>
  </section>
</template>
