<script setup lang="ts">
import BrandLogo from './BrandLogo.vue'

const links = ['Find Jobs', 'Latest Jobs', 'Browse Companies']

defineEmits<{
  signInClick: []
}>()
</script>

<template>
  <header class="bg-[#f3f1ff]">
    <nav
      class="mx-auto flex max-w-[1440px] items-center px-[108px] pt-[30px]"
    >
      <BrandLogo />

      <ul class="ml-36 flex items-center gap-12">
        <li v-for="link in links" :key="link">
          <a
            href="#"
            class="whitespace-nowrap text-base text-[#0e0359] transition-colors hover:text-[#7b66ff]"
          >
            {{ link }}
          </a>
        </li>
      </ul>

      <router-link
        to="/auth"
        
        class="ml-auto bg-[#7b66ff] px-[23px] py-2 text-base font-medium text-white transition-colors hover:bg-[#6f5cf9] cursor-pointer"
      >
        Sign In
      </router-link>
    </nav>
  </header>
</template>
