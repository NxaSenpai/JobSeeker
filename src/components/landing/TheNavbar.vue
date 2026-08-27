<script setup lang="ts">
import BrandLogo from './BrandLogo.vue'

import { ref } from 'vue'

const isOpen = ref(false)
const links = [
  { label: 'Find Jobs', to: '/jobs' },
  { label: 'Companies', to: '/companies' },
]
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-[#e6e1fa] bg-[#ffffff]/95 shadow-[0_4px_18px_rgba(11,43,130,0.04)] backdrop-blur-md">
    <nav
      class="mx-auto flex max-w-[1440px] items-center px-6 py-5 sm:px-10 lg:px-[108px]"
    >
      <BrandLogo />

      <ul class="ml-16 hidden items-center gap-9 lg:flex">
        <li v-for="link in links" :key="link.to">
          <router-link :to="link.to" class="whitespace-nowrap text-sm font-medium text-[#27346d] transition-colors hover:text-[#7b66ff]" active-class="text-[#7b66ff]">
            {{ link.label }}
          </router-link>
        </li>
      </ul>

      <router-link
        to="/login"
        class="ml-auto hidden rounded-lg bg-[#7b66ff] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(123,102,255,0.22)] transition hover:bg-[#6f5cf9] sm:inline-flex"
      >
        Sign In
      </router-link>
      <button type="button" class="ml-auto grid size-10 place-items-center rounded-lg border border-[#d9d2f6] text-[#0b2b82] lg:hidden" aria-label="Toggle navigation" @click="isOpen = !isOpen">
        <svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" d="M4 7h16M4 12h16M4 17h16" /></svg>
      </button>
    </nav>
    <div v-if="isOpen" class="absolute inset-x-0 top-full border-b border-[#e6e1fa] bg-[#f9f8ff] px-6 py-5 shadow-lg lg:hidden">
      <div class="mx-auto flex max-w-[1440px] flex-col gap-2">
        <router-link v-for="link in links" :key="link.to" :to="link.to" class="rounded-lg px-4 py-3 font-medium text-[#27346d] hover:bg-white hover:text-[#7b66ff]" @click="isOpen = false">{{ link.label }}</router-link>
        <router-link to="/login" class="mt-2 rounded-lg bg-[#7b66ff] px-4 py-3 text-center font-semibold text-white" @click="isOpen = false">Sign In</router-link>
      </div>
    </div>
  </header>
</template>
