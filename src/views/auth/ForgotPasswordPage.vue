<script setup lang="ts">
import { ref } from 'vue'
import AuthPageFrame from '@/components/auth/AuthPageFrame.vue'

const email = ref('')
const submitted = ref(false)

function requestReset() {
  if (email.value) submitted.value = true
}
</script>

<template>
  <AuthPageFrame title="Reset your" accent="password." description="We will send a reset link to your email.">
    <template #back><router-link to="/login" class="inline-flex items-center gap-2 text-sm font-semibold text-[#596a9d] transition hover:text-[#7b66ff]"><span aria-hidden="true">←</span> Back to sign in</router-link></template>
    <form class="rounded-3xl border border-[#ded8f2] bg-white p-7 shadow-[0_24px_70px_rgba(24,37,101,0.1)] sm:p-8" @submit.prevent="requestReset">
      <h2 class="mt-5 text-2xl font-semibold tracking-[-0.03em] text-[#0b2b82]">Forgot your password?</h2><p class="mt-2 text-sm leading-6 text-[#63719b]">No problem. We’ll help you create a new one.</p>
      <div v-if="submitted" class="mt-5 rounded-xl border border-[#bfe5c9] bg-[#effbf2] px-4 py-3 text-sm text-[#247441]">If an account exists for {{ email }}, a reset link has been queued.</div>
      <label class="mt-6 block text-sm font-medium text-[#34457d]">Email address<input v-model="email" required type="email" autocomplete="email" placeholder="you@example.com" class="mt-2 w-full rounded-xl border border-[#e2def0] px-4 py-3 text-[#0b2b82] outline-none placeholder:text-[#a1aac2] focus:border-[#7b66ff] focus:ring-4 focus:ring-[#7b66ff]/10" /></label>
      <button type="submit" class="mt-6 w-full rounded-xl bg-[#7b66ff] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(123,102,255,0.25)] transition hover:bg-[#6f5cf9]">Send reset link</button><p class="mt-5 text-center text-sm text-[#63719b]">Remember your password? <router-link to="/login" class="font-semibold text-[#7b66ff] hover:underline">Sign in</router-link></p>
    </form>
  </AuthPageFrame>
</template>
