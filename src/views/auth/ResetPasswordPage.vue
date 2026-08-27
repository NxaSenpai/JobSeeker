<script setup lang="ts">
import { ref } from 'vue'
import AuthPageFrame from '@/components/auth/AuthPageFrame.vue'

const password = ref('')
const confirmPassword = ref('')
const completed = ref(false)

function resetPassword() {
  if (password.value && password.value === confirmPassword.value) completed.value = true
}
</script>

<template>
  <AuthPageFrame title="Set a new" accent="password." description="Choose a strong password for your account.">
    <template #back><router-link to="/login" class="inline-flex items-center gap-2 text-sm font-semibold text-[#596a9d] transition hover:text-[#7b66ff]"><span aria-hidden="true">←</span> Back to sign in</router-link></template>
    <form class="rounded-3xl border border-[#ded8f2] bg-white p-7 shadow-[0_24px_70px_rgba(24,37,101,0.1)] sm:p-8" @submit.prevent="resetPassword">
      <div class="grid size-12 place-items-center rounded-xl bg-[#f0edff] text-[#705be0]"><svg class="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M16 12a4 4 0 10-8 0v3m-2 0h12v6H6v-6z" /></svg></div><h2 class="mt-5 text-2xl font-semibold tracking-[-0.03em] text-[#0b2b82]">Create a new password</h2><p class="mt-2 text-sm leading-6 text-[#63719b]">Make it memorable to you and difficult for anyone else to guess.</p>
      <div v-if="completed" class="mt-5 rounded-xl border border-[#bfe5c9] bg-[#effbf2] px-4 py-3 text-sm text-[#247441]">Your new password is ready to save once the backend reset flow is connected.</div>
      <label class="mt-6 block text-sm font-medium text-[#34457d]">New password<input v-model="password" required type="password" autocomplete="new-password" placeholder="Create a new password" class="mt-2 w-full rounded-xl border border-[#e2def0] px-4 py-3 text-[#0b2b82] outline-none placeholder:text-[#a1aac2] focus:border-[#7b66ff] focus:ring-4 focus:ring-[#7b66ff]/10" /></label><label class="mt-4 block text-sm font-medium text-[#34457d]">Confirm new password<input v-model="confirmPassword" required type="password" autocomplete="new-password" placeholder="Repeat new password" class="mt-2 w-full rounded-xl border border-[#e2def0] px-4 py-3 text-[#0b2b82] outline-none placeholder:text-[#a1aac2] focus:border-[#7b66ff] focus:ring-4 focus:ring-[#7b66ff]/10" /></label>
      <button type="submit" class="mt-6 w-full rounded-xl bg-[#7b66ff] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(123,102,255,0.25)] transition hover:bg-[#6f5cf9]">Reset password</button>
    </form>
  </AuthPageFrame>
</template>
