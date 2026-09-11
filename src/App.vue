<script setup lang="ts">
import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { currentUser } from '@/services/auth'

const route = useRoute()
const router = useRouter()
watch(currentUser, (user) => {
  if (!user && route.meta.requiresAuth) void router.replace({ name: 'AuthPage', query: { redirect: route.fullPath } })
})
</script>

<template>
  <router-view v-slot="{ Component }">
    <Transition name="route" mode="out-in">
      <div :key="route.matched[0]?.path || route.path" class="route-stage">
        <component :is="Component" />
      </div>
    </Transition>
  </router-view>
</template>
