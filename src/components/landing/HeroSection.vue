<script setup lang="ts">
import searchIcon from '@/assets/img/search-icon.svg'
import mapPin from '@/assets/img/map-pin-search.svg'
import vectorHero from '@/assets/img/vector-hero.svg'
import frame24 from '@/assets/img/frame-24.svg'
import frame25 from '@/assets/img/frame-25.svg'
</script>

<template>
  <section class="bg-[#f3f1ff]">
    <div class="mx-auto max-w-[1440px] px-[108px] pt-6">
      <div class="flex items-center justify-between">
        <!-- Left: headline + search -->
        <div class="flex flex-col gap-12">
          <div class="flex flex-col gap-10">
            <h1
              class="w-[640px] text-[72px] font-bold leading-[96px] text-[#0b2b82]"
            >
              Explore Over
              <span class="text-[#7b66ff]">7,000+</span>
              Job Opportunities
            </h1>
            <p class="w-[569px] text-base leading-[32px] text-[#3d589b]">
              Discover a platform tailored for passionate job seekers interested
              in startups. Find your next career opportunity and connect with
              like-minded individuals.
            </p>
          </div>

          <div class="flex flex-col items-start">
            <!-- Search bar -->
            <div class="flex items-center bg-white p-4">
              <div class="flex items-center gap-24">
                <div class="flex items-center gap-2">
                  <img :src="searchIcon" class="size-6" alt="" />
                  <span class="whitespace-nowrap text-base font-light text-[#a1adcb]">
                    Keyword
                  </span>
                </div>
                <div class="h-10 w-px bg-[#ededed]" />
                <div class="flex items-center gap-2">
                  <img :src="mapPin" class="size-6" alt="" />
                  <span class="whitespace-nowrap text-base font-light text-[#a1adcb]">
                    Location
                  </span>
                </div>
              </div>
              <button
                type="button"
                class="ml-[117px] bg-[#7b66ff] px-[38px] py-4 text-base font-medium text-white shadow-[0_26px_73px_0_rgba(123,102,255,0.69)] transition-colors hover:bg-[#6f5cf9] cursor-pointer"
              >
                Search
              </button>
            </div>

            <!-- Tags -->
            <div class="flex items-center gap-6 mt-10">
              <p class="whitespace-nowrap text-base text-[#9eabcd]">
                Tags: Digital Marketer, UX Designer, Data Analyst
              </p>
            </div>
          </div>
        </div>

        <!-- Right: hero image + decorations -->
        <div class="relative h-[656px] w-[547px] shrink-0">
          <img
            :src="vectorHero"
            class="pointer-events-none absolute -left-10 top-24 w-[420px]"
            alt=""
          />
          <img
            :src="frame24"
            class="pointer-events-none absolute -left-6 top-6 size-[74px]"
            alt=""
          />
          <img
            :src="frame25"
            class="pointer-events-none absolute -left-2 bottom-10 size-[87px] rotate-[101deg]"
            alt=""
          />
        </div>
      </div>

      <!-- Sponsors -->
      <!-- <div class="flex justify-center pb-4 pt-10">
        <img :src="sponsorsImg" class="h-24 w-auto" alt="Trusted companies" />
      </div> -->
    </div>
  </section>
</template>
