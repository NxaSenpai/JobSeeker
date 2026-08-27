<script setup lang="ts">
import markLight from '@/assets/img/logo-left-sm.svg'
import wordLight from '@/assets/img/logo-right-sm.svg'
import markDark from '@/assets/img/logo-left.svg'
import wordDark from '@/assets/img/logo-right.svg'

withDefaults(
  defineProps<{
    variant?: 'light' | 'dark'
  }>(),
  { variant: 'light' },
)
</script>

<template>
  <router-link
    to="/"
    class="inline-flex items-center"
    :class="variant === 'dark' ? 'gap-[15px]' : 'gap-2'"
    aria-label="JobSeeker home"
  >
    <img
      :src="variant === 'dark' ? markDark : markLight"
      alt=""
      :class="variant === 'dark' ? 'h-11 w-auto' : 'h-6 w-auto'"
    />
    <img
      :src="variant === 'dark' ? wordDark : wordLight"
      alt="JobSeeker"
      :class="variant === 'dark' ? 'h-8 w-auto' : 'h-[17px] w-auto'"
    />
  </router-link>
</template>
