<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import AuthPageFrame from '@/components/auth/AuthPageFrame.vue'
import PasswordField from '@/components/auth/PasswordField.vue'
import { ApiRequestError, apiRequest } from '@/services/api'

type PasswordResetResponse = {
  message: string
}

const route = useRoute()
const token = computed(() =>
  typeof route.query.token === 'string' ? route.query.token.trim() : '',
)
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const completed = ref(false)
const errorMessage = ref('')

const passwordsDoNotMatch = computed(
  () => Boolean(confirmPassword.value) && password.value !== confirmPassword.value,
)

async function resetPassword() {
  errorMessage.value = ''

  if (!token.value) {
    errorMessage.value = 'This password reset link is missing or invalid.'
    return
  }

  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Passwords do not match.'
    return
  }

  loading.value = true

  try {
    await apiRequest<PasswordResetResponse>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: token.value,
        password: password.value,
        confirmPassword: confirmPassword.value,
      }),
    })
    completed.value = true
  } catch (error) {
    errorMessage.value =
      error instanceof ApiRequestError
        ? error.message
        : 'We could not reset your password. Please request a new link.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthPageFrame title="Set a new" accent="password." description="Choose a strong password for your account.">
    <template #back><router-link to="/login" class="inline-flex items-center gap-2 text-sm font-semibold text-[#596a9d] transition hover:text-[#7b66ff]"><span aria-hidden="true">←</span> Back to sign in</router-link></template>
    <div class="rounded-3xl border border-[#ded8f2] bg-white p-7 shadow-[0_24px_70px_rgba(24,37,101,0.1)] sm:p-8">
      <template v-if="completed">
        <div class="grid size-12 place-items-center rounded-xl bg-[#effbf2] text-[#247441]" aria-hidden="true"><span class="text-2xl">✓</span></div>
        <h2 class="mt-5 text-2xl font-semibold tracking-[-0.03em] text-[#0b2b82]">Password updated</h2>
        <p class="mt-2 text-sm leading-6 text-[#63719b]">Your password has been reset successfully. You can sign in with your new password now.</p>
        <router-link to="/login" class="mt-6 block w-full rounded-xl bg-[#7b66ff] px-6 py-3.5 text-center text-sm font-semibold text-white shadow-[0_12px_26px_rgba(123,102,255,0.25)] transition hover:bg-[#6f5cf9]">Go to sign in</router-link>
      </template>

      <template v-else>
        <div class="grid size-12 place-items-center rounded-xl bg-[#f0edff] text-[#705be0]" aria-hidden="true"><svg class="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M16 12a4 4 0 10-8 0v3m-2 0h12v6H6v-6z" /></svg></div>
        <h2 class="mt-5 text-2xl font-semibold tracking-[-0.03em] text-[#0b2b82]">Create a new password</h2>
        <p class="mt-2 text-sm leading-6 text-[#63719b]">Make it memorable to you and difficult for anyone else to guess.</p>
        <div v-if="errorMessage" class="mt-5 rounded-xl border border-[#f2c9d0] bg-[#fff4f5] px-4 py-3 text-sm text-[#af3348]" role="alert">{{ errorMessage }}</div>
        <form class="mt-6 grid gap-4" @submit.prevent="resetPassword">
          <PasswordField v-model="password" label="New password" placeholder="Create a new password" autocomplete="new-password" />
          <PasswordField v-model="confirmPassword" label="Confirm new password" placeholder="Repeat your new password" autocomplete="new-password" />
          <p v-if="passwordsDoNotMatch" class="-mt-2 text-sm text-[#af3348]" role="alert">Passwords do not match.</p>
          <button type="submit" :disabled="loading || !token" class="mt-2 w-full rounded-xl bg-[#7b66ff] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(123,102,255,0.25)] transition hover:bg-[#6f5cf9] disabled:cursor-not-allowed disabled:opacity-60">{{ loading ? 'Updating password…' : 'Reset password' }}</button>
        </form>
      </template>
    </div>
  </AuthPageFrame>
</template>
