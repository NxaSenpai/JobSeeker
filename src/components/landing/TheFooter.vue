<script setup lang="ts">
import BrandLogo from './BrandLogo.vue'
import facebook from '@/assets/img/social-facebook.svg'
import linkedin from '@/assets/img/social-linkedin.svg'
import twitter from '@/assets/img/social-twitter.svg'

const helpLinks = ['About Us', 'Services', 'Privacy Policy', 'Terms & Condition']
const socials = [facebook, linkedin, twitter]
</script>

<template>
  <footer class="bg-[#0c2e82]">
    <div
      class="mx-auto flex max-w-[1440px] items-start gap-32 px-[108px] py-[88px]"
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
          <li v-for="link in helpLinks" :key="link">
            <a
              href="#"
              class="block py-[3px] text-lg leading-[42px] text-[#e3ebff] transition-colors hover:text-white"
            >
              {{ link }}
            </a>
          </li>
        </ul>
      </div>

      <!-- Newsletter -->
      <div class="flex flex-col gap-6">
        <div class="flex flex-col gap-2">
          <h3 class="text-2xl font-semibold text-[#f1efff]">
            Subscribe Our Newsletter
          </h3>
          <p class="w-[358px] text-base leading-6 text-white">
            Get the freshest job news and articles delivered to your inbox every
            week.
          </p>
        </div>

        <form class="relative" @submit.prevent>
          <input
            type="email"
            placeholder="Email Address"
            class="h-16 w-[416px] bg-white px-8 pr-[140px] text-base text-[#a399df] outline-none placeholder:text-[#a399df]"
          />
          <button
            type="submit"
            class="absolute right-1 top-1 h-14 bg-[#7b66ff] px-[38px] text-base font-medium text-white transition-colors hover:bg-[#6f5cf9]"
          >
            Submit
          </button>
        </form>
      </div>
    </div>

    <!-- Copyright -->
    <div class="border-t border-[#123eaa]">
      <div class="mx-auto max-w-[1440px] px-[108px] py-[18px]">
        <p class="font-outfit text-lg text-[#6d82b4]">
          © 2023 All Right Reserved Creativemouse.co
        </p>
      </div>
    </div>
  </footer>
</template>
