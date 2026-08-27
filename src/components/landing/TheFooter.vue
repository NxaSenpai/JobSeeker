<script setup lang="ts">
import BrandLogo from './BrandLogo.vue'
import facebook from '@/assets/img/social-facebook.svg'
import linkedin from '@/assets/img/social-linkedin.svg'
import twitter from '@/assets/img/social-twitter.svg'

const helpLinks = [
  { label: 'About us', to: '/about' },
  { label: 'Find jobs', to: '/jobs' },
  { label: 'Browse companies', to: '/companies' },
  { label: 'Contact', to: '/contact' },
]
const socials = [facebook, linkedin, twitter]
</script>

<template>
  <footer class="bg-[#0c2e82]">
    <div
      class="mx-auto grid max-w-[1440px] gap-12 px-6 py-16 sm:px-10 lg:grid-cols-[1fr_auto_1.15fr] lg:gap-24 lg:px-[108px] lg:py-[88px]"
    >
      <!-- Brand -->
      <div class="flex flex-col gap-7">
        <BrandLogo variant="dark" />
        <p class="w-[287px] text-base leading-8 text-[#e3ebff]">
          Find your next career opportunity and connect with like-minded
          individuals.
        </p>
      </div>

      <!-- Help links -->
      <div class="flex flex-col gap-[26px]">
        <h3 class="text-2xl font-semibold text-[#f1efff]">Help Links</h3>
        <ul class="flex flex-col">
          <li v-for="link in helpLinks" :key="link.to">
            <router-link
              :to="link.to"
              class="block py-[3px] text-lg leading-[42px] text-[#e3ebff] transition-colors hover:text-white"
            >
              {{ link.label }}
            </router-link>
          </li>
        </ul>
      </div>

      <!-- Newsletter -->
      <div class="flex flex-col gap-6">
        <div class="flex flex-col gap-2">
          <h3 class="text-2xl font-semibold text-[#f1efff]">
            Subscribe Our Newsletter
          </h3>
          <p class="max-w-[358px] text-base leading-6 text-white">
            Get the freshest job news and articles delivered to your inbox every
            week.
          </p>
        </div>

        <form class="relative" @submit.prevent>
          <input
            type="email"
            placeholder="Email Address"
            class="h-16 w-full bg-white px-6 pr-[120px] text-base text-[#a399df] outline-none placeholder:text-[#a399df]"
          />
          <button
            type="submit"
            class="absolute right-1 top-1 h-14 bg-[#7b66ff] px-6 text-base font-medium text-white transition-colors hover:bg-[#6f5cf9]"
          >
            Submit
          </button>
        </form>
      </div>
    </div>

    <!-- Copyright -->
    <div class="border-t border-[#123eaa]">
      <div class="mx-auto max-w-[1440px] px-6 py-[18px] sm:px-10 lg:px-[108px]">
        <p class="font-outfit text-sm text-[#6d82b4]">
          © 2026 JobSeeker. Find work that fits your life.
        </p>
      </div>
    </div>
  </footer>
</template>
