<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import BrandLogo from '@/components/landing/BrandLogo.vue'
import { clearAuthSession, displayNameForUser, getAuthSession, initialsForUser } from '@/services/auth'

const router = useRouter()
const user = getAuthSession()?.user
const displayName = computed(() => user ? displayNameForUser(user) : 'Administrator')
const initials = computed(() => user ? initialsForUser(user) : 'AD')

const metrics = [
  { label: 'Total users', value: '3,248', note: '+12.4% this month' },
  { label: 'Companies', value: '486', note: '+8 new this week' },
  { label: 'Active jobs', value: '1,172', note: '94% published' },
  { label: 'Reported content', value: '18', note: 'Needs review' },
]

const activity = [
  { label: 'New job seeker registrations', value: '142', detail: 'Across the last 7 days' },
  { label: 'Pending company reviews', value: '24', detail: '5 submitted today' },
  { label: 'Applications submitted', value: '1,890', detail: 'Up 9.6% from last week' },
]

function signOut() {
  clearAuthSession()
  void router.replace({ name: 'AuthPage' })
}
</script>

<template>
  <div class="min-h-screen bg-[#f7f7f7] text-[#171717]">
    <header class="border-b border-[#e3e3e3] bg-[#fbfaf7]">
      <div class="mx-auto flex max-w-[1440px] items-center gap-8 px-6 py-5 sm:px-10 lg:px-12"><BrandLogo variant="dark" /><span class="hidden border-l border-[#d8d8d4] pl-8 text-xs font-semibold uppercase tracking-[0.16em] text-[#888] sm:inline">Admin console</span><div class="ml-auto flex items-center gap-3"><span class="grid size-9 place-items-center rounded-full bg-[#e5e5e5] text-xs font-semibold text-[#333]">{{ initials }}</span><div class="hidden text-right sm:block"><p class="text-sm font-semibold text-[#222]">{{ displayName }}</p><p class="text-xs text-[#888]">Administrator</p></div><button type="button" class="rounded-lg border border-[#cfcfcb] px-3 py-2 text-xs font-semibold text-[#444] transition hover:bg-white" @click="signOut">Sign out</button></div></div>
    </header>

    <main class="mx-auto max-w-[1440px] px-6 py-9 sm:px-10 lg:px-12 lg:py-14">
      <div class="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#777]">Platform overview</p><h1 class="mt-3 text-4xl font-semibold tracking-[-0.05em] text-[#171717]">Good morning, {{ displayName }}.</h1><p class="mt-3 max-w-xl text-sm leading-6 text-[#777]">A clear view of JobSeeker activity, moderation, and the health of the marketplace.</p></div><button type="button" class="rounded-lg bg-[#202020] px-4 py-3 text-sm font-semibold text-white transition hover:bg-black">Review reports</button></div>
      <section class="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Platform metrics"><article v-for="metric in metrics" :key="metric.label" class="border border-[#e3e3e3] bg-white p-5"><p class="text-xs font-medium text-[#888]">{{ metric.label }}</p><p class="mt-5 text-3xl font-semibold tracking-[-0.04em] text-[#171717]">{{ metric.value }}</p><p class="mt-2 text-xs text-[#777]">{{ metric.note }}</p></article></section>
      <section class="mt-6 grid gap-6 lg:grid-cols-[1.15fr_.85fr]"><article class="border border-[#e3e3e3] bg-white p-6 sm:p-7"><div class="flex items-center justify-between gap-4"><div><p class="text-xs font-semibold uppercase tracking-[0.14em] text-[#888]">Operations</p><h2 class="mt-2 text-xl font-semibold tracking-[-0.03em]">What needs attention</h2></div><span class="rounded-full bg-[#f0f0f0] px-3 py-1.5 text-xs font-semibold text-[#555]">Today</span></div><div class="mt-6 divide-y divide-[#ededed]"><div v-for="item in activity" :key="item.label" class="flex items-center justify-between gap-5 py-4 first:pt-0"><div><p class="text-sm font-semibold text-[#333]">{{ item.label }}</p><p class="mt-1 text-xs text-[#888]">{{ item.detail }}</p></div><strong class="text-xl font-semibold text-[#202020]">{{ item.value }}</strong></div></div></article><article class="border border-[#e3e3e3] bg-[#202020] p-6 text-white sm:p-7"><p class="text-xs font-semibold uppercase tracking-[0.14em] text-[#aaa]">Quick access</p><h2 class="mt-2 text-xl font-semibold tracking-[-0.03em]">Manage the marketplace</h2><div class="mt-6 grid gap-2"><button v-for="item in ['Users', 'Companies', 'Jobs', 'Applications', 'Categories']" :key="item" type="button" class="flex items-center justify-between border border-[#454545] px-4 py-3 text-left text-sm text-[#e6e6e6] transition hover:border-[#888] hover:bg-[#2b2b2b]"><span>{{ item }}</span><span aria-hidden="true">→</span></button></div></article></section>
    </main>
  </div>
</template>
