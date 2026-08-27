<script setup lang="ts">
import { ref } from 'vue'
import AuthPageFrame from '@/components/auth/AuthPageFrame.vue'

const resent = ref(false)
</script>

<template>
  <AuthPageFrame title="Verify your" accent="email." description="Check your inbox to complete registration.">
    <template #back><router-link to="/login" class="inline-flex items-center gap-2 text-sm font-semibold text-[#596a9d] transition hover:text-[#7b66ff]"><span aria-hidden="true">←</span> Back to sign in</router-link></template>
    <div class="rounded-3xl border border-[#ded8f2] bg-white p-7 text-center shadow-[0_24px_70px_rgba(24,37,101,0.1)] sm:p-10">
      <div class="mx-auto grid size-16 place-items-center rounded-2xl bg-[#f0edff] text-[#705be0]"><svg class="size-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.7"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 00-2-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg></div>
      <p class="mt-6 text-sm font-semibold uppercase tracking-[0.14em] text-[#7b66ff]">Check your inbox</p><h2 class="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#0b2b82]">We sent you a verification link.</h2><p class="mt-4 text-sm leading-7 text-[#60709b]">When connected, we’ll send the link to your registered email address. Click it to finish setting up JobSeeker.</p>
      <div v-if="resent" class="mt-6 rounded-xl border border-[#bfe5c9] bg-[#effbf2] px-4 py-3 text-sm text-[#247441]">A new verification email has been queued.</div>
      <button type="button" class="mt-7 w-full rounded-xl bg-[#7b66ff] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(123,102,255,0.25)] transition hover:bg-[#6f5cf9]" @click="resent = true">Resend verification email</button>
      <router-link to="/login" class="mt-5 inline-block text-sm font-semibold text-[#6d59d5] hover:underline">I’ve verified my email</router-link>
    </div>
  </AuthPageFrame>
</template>
