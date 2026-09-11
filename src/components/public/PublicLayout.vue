<script setup lang="ts">
import { useRoute } from 'vue-router'
import TheFooter from '@/components/landing/TheFooter.vue'
import TheNavbar from '@/components/landing/TheNavbar.vue'

const route = useRoute()
</script>

<template>
  <div class="min-h-screen bg-white">
    <TheNavbar />
    <main>
      <router-view v-slot="{ Component }">
        <Transition name="route" mode="out-in">
          <div :key="route.fullPath" class="route-stage">
            <component :is="Component" />
          </div>
        </Transition>
      </router-view>
    </main>
    <TheFooter />
  </div>
</template>
