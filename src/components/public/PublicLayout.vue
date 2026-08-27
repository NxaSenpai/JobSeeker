<script setup lang="ts">
import { ref } from 'vue'
import TheFooter from '@/components/landing/TheFooter.vue'
import TheNavbar from '@/components/landing/TheNavbar.vue'
import { usePageMotion } from '@/composables/usePageMotion'

const layoutRef = ref<HTMLElement | null>(null)
usePageMotion(layoutRef)
</script>

<template>
  <div ref="layoutRef" class="min-h-screen overflow-x-clip bg-white">
    <TheNavbar />
    <main>
      <router-view />
    </main>
    <TheFooter />
  </div>
</template>
