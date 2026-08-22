<script setup lang="ts">
import arrow from '@/assets/img/arrow-up-right.svg'
import mapPin from '@/assets/img/map-pin.svg'
import underline from '@/assets/img/underline-1.svg'
import frame from '@/assets/img/frame-latest.svg'
import appStore from '@/assets/img/app-store.png'
import spotify from '@/assets/img/spotify.png'
import wordpress from '@/assets/img/wordpress.png'
import slack from '@/assets/img/slack.png'
import figma from '@/assets/img/figma.png'
import pinterest from '@/assets/img/pinterest.png'

const description =
  'Join our team as an Email Marketing Specialist and lead our digital outreach efforts.'

const jobs = [
  { logo: wordpress, title: 'Digital Marketer' },
  { logo: appStore, title: 'Lead Product Designer' },
  { logo: spotify, title: 'Social Media Assistant' },
  { logo: wordpress, title: 'Digital Marketer' },
  { logo: wordpress, title: 'Digital Marketer' },
  { logo: slack, title: 'Full-Stack Developer' },
  { logo: pinterest, title: 'UX Designer/Researcher' },
  { logo: figma, title: 'Digital Marketer' },
]
</script>

<template>
  <section class="bg-[#f7f5ff] py-24">
    <div class="mx-auto flex max-w-[1440px] flex-col gap-9 px-[108px]">
      <!-- Heading -->
      <div class="flex items-center gap-[18px]">
        <div class="flex flex-col items-start gap-2">
          <h2 class="text-[56px] font-semibold leading-[1.2] text-[#0b2b82]">
            Latest <span class="text-[#7b66ff]">Jobs</span> Post
          </h2>
          <img :src="underline" class="h-2 w-[129px]" alt="" />
        </div>
        <img :src="frame" class="h-[104px] w-auto" alt="" />
        <a href="#" class="ml-auto flex items-center gap-2">
          <span class="text-base font-medium text-[#0b2b82] underline underline-offset-2">
            Browse All
          </span>
          <img :src="arrow" class="size-4" alt="" />
        </a>
      </div>

      <!-- Cards -->
      <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
        <article
          v-for="(job, index) in jobs"
          :key="`${job.title}-${index}`"
          class="flex flex-col gap-5 bg-white p-8 cursor-pointer hover:shadow-[0_26px_73px_0_rgba(123,102,255,0.25)] transition duration-500 ease-in-out"
        >
          <!-- Meta row -->
          <div class="flex items-center gap-10">
            <div class="flex flex-col uppercase">
              <span class="text-xs text-[#8b81d0]">Apply before</span>
              <span class="text-base font-medium text-[#0c2e82]">8 Dec, 2023</span>
            </div>
            <div class="h-12 w-px bg-[#efebff]" />
            <div class="flex flex-col uppercase">
              <span class="text-xs text-[#8b81d0]">Job type</span>
              <span class="text-base font-medium text-[#0c2e82]">Full time</span>
            </div>
            <div class="h-12 w-px bg-[#efebff]" />
            <div class="flex flex-col uppercase">
              <span class="text-xs text-[#8b81d0]">Salary</span>
              <span class="text-base font-medium text-[#0c2e82]">$10k-$15k</span>
            </div>
          </div>

          <div class="flex flex-col gap-4">
            <div class="flex items-center gap-4">
              <img :src="job.logo" class="size-12 object-contain" :alt="job.title" />
              <h3 class="whitespace-nowrap text-2xl font-semibold text-[#0b2b82]">
                {{ job.title }}
              </h3>
            </div>
            <p class="text-base leading-6 text-[#3d589b]">{{ description }}</p>
          </div>

          <div class="h-px w-full bg-[#efebff]" />

          <div class="flex items-center gap-[100px]">
            <div class="flex items-center gap-2.5">
              <img :src="mapPin" class="size-6" alt="" />
              <span class="whitespace-nowrap text-base text-[#3d589b]">
                London, United Kingdom
              </span>
            </div>
            <a href="#" class="flex items-center gap-2">
              <span class="text-base font-medium text-[#0c2e82] underline underline-offset-2">
                More Details
              </span>
              <img :src="arrow" class="size-4" alt="" />
            </a>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>
