<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthPageFrame from '@/components/auth/AuthPageFrame.vue'
import { ApiRequestError, apiRequest } from '@/services/api'

type VerificationResponse = {
  message?: string
}

type VerificationState = 'waiting' | 'loading' | 'success' | 'error'

const route = useRoute()
const router = useRouter()
const state = ref<VerificationState>('waiting')
const message = ref('')
const email = ref(sessionStorage.getItem('pendingVerificationEmail') ?? '')
const resendLoading = ref(false)
const resendMessage = ref('')
const currentToken = ref('')
let redirectTimer: number | undefined

function queryToken(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : ''
}

async function verifyEmail(rawToken: string) {
  currentToken.value = rawToken
  state.value = 'loading'
  message.value = 'Checking your verification link.'

  try {
    const response = await apiRequest<VerificationResponse>(
      `/auth/verify-email?token=${encodeURIComponent(rawToken)}`,
    )

    state.value = 'success'
    message.value = response.message ?? 'Email verified successfully.'
    sessionStorage.removeItem('pendingVerificationEmail')

    redirectTimer = window.setTimeout(() => {
      void router.replace({ name: 'AuthPage', query: { verified: '1' } })
    }, 1200)
  } catch (error) {
    state.value = 'error'
    message.value =
      error instanceof ApiRequestError
        ? error.message
        : 'Email verification failed. Please try again.'
  }
}

async function resendVerificationEmail() {
  resendMessage.value = ''

  if (!email.value.trim()) {
    resendMessage.value = 'Enter the email address you registered with first.'
    return
  }

  resendLoading.value = true

  try {
    const response = await apiRequest<VerificationResponse>('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email: email.value.trim() }),
    })
    resendMessage.value = response.message ?? 'Check your inbox for a new link.'
  } catch (error) {
    resendMessage.value =
      error instanceof ApiRequestError
        ? error.message
        : 'We could not send a new verification email.'
  } finally {
    resendLoading.value = false
  }
}

watch(
  () => route.query.token,
  (value) => {
    const rawToken = queryToken(value)

    if (rawToken) {
      void verifyEmail(rawToken)
      return
    }

    state.value = 'waiting'
    message.value = 'Check your inbox for the verification link we just sent.'
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (redirectTimer !== undefined) {
    window.clearTimeout(redirectTimer)
  }
})
</script>

<template>
  <AuthPageFrame title="Verify your" accent="email." description="Confirm your address to finish creating your account.">
    <template #back>
      <router-link to="/login" class="inline-flex items-center gap-2 text-sm font-semibold text-[#596a9d] transition hover:text-[#7b66ff]"><span aria-hidden="true">←</span> Back to sign in</router-link>
    </template>

    <div class="rounded-3xl border border-[#ded8f2] bg-white p-7 text-center shadow-[0_24px_70px_rgba(24,37,101,0.1)] sm:p-10">
      <template v-if="state === 'loading'">
        <div class="mx-auto grid size-16 place-items-center rounded-2xl bg-[#f0edff] text-[#705be0]" aria-hidden="true">
          <svg class="size-8 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" /><path class="opacity-80" d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-linecap="round" stroke-width="2" /></svg>
        </div>
        <p class="mt-6 text-sm font-semibold uppercase tracking-[0.14em] text-[#7b66ff]">Working on it</p>
        <h1 class="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#0b2b82]">Verifying your email</h1>
        <p class="mt-4 text-sm leading-7 text-[#60709b]">{{ message }}</p>
      </template>

      <template v-else-if="state === 'success'">
        <div class="mx-auto grid size-16 place-items-center rounded-full bg-[#effbf2] text-[#247441]" aria-hidden="true"><span class="text-3xl">✓</span></div>
        <p class="mt-6 text-sm font-semibold uppercase tracking-[0.14em] text-[#247441]">Verified</p>
        <h1 class="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#0b2b82]">Email verified</h1>
        <p class="mt-4 text-sm leading-7 text-[#60709b]">{{ message }}</p>
        <p class="mt-5 text-xs text-[#8b95b3]">Taking you to sign in…</p>
      </template>

      <template v-else-if="state === 'error'">
        <div class="mx-auto grid size-16 place-items-center rounded-full bg-[#fff4f5] text-[#af3348]" aria-hidden="true"><span class="text-3xl">!</span></div>
        <p class="mt-6 text-sm font-semibold uppercase tracking-[0.14em] text-[#af3348]">Could not verify</p>
        <h1 class="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#0b2b82]">Verification failed</h1>
        <p class="mt-4 text-sm leading-7 text-[#60709b]">{{ message }}</p>
        <button v-if="currentToken" type="button" class="mt-7 w-full rounded-xl bg-[#7b66ff] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(123,102,255,0.25)] transition hover:bg-[#6f5cf9]" @click="verifyEmail(currentToken)">Try again</button>
        <router-link to="/register" class="mt-5 inline-block text-sm font-semibold text-[#6d59d5] hover:underline">Create a new account</router-link>
      </template>

      <template v-else>
        <div class="mx-auto grid size-16 place-items-center rounded-2xl bg-[#f0edff] text-[#705be0]" aria-hidden="true"><svg class="size-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.7"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 00-2-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg></div>
        <p class="mt-6 text-sm font-semibold uppercase tracking-[0.14em] text-[#7b66ff]">Check your inbox</p>
        <h1 class="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#0b2b82]">We sent you a verification link.</h1>
        <p class="mt-4 text-sm leading-7 text-[#60709b]">{{ message || 'Check your inbox for the verification link we just sent.' }}</p>

        <form class="mt-6 text-left" @submit.prevent="resendVerificationEmail">
          <label class="text-sm font-medium text-[#34457d]">Email address<input v-model="email" required type="email" autocomplete="email" placeholder="you@example.com" class="mt-2 w-full rounded-xl border border-[#e2def0] px-4 py-3 text-[#0b2b82] outline-none placeholder:text-[#a1aac2] focus:border-[#7b66ff] focus:ring-4 focus:ring-[#7b66ff]/10" /></label>
          <p v-if="resendMessage" class="mt-3 text-sm text-[#60709b]" role="status">{{ resendMessage }}</p>
          <button type="submit" :disabled="resendLoading" class="mt-5 w-full rounded-xl border border-[#dcd6f2] px-6 py-3.5 text-sm font-semibold text-[#463a9c] transition hover:bg-[#f7f5ff] disabled:cursor-not-allowed disabled:opacity-60">{{ resendLoading ? 'Sending…' : 'Resend verification email' }}</button>
        </form>
        <router-link to="/login" class="mt-5 inline-block text-sm font-semibold text-[#6d59d5] hover:underline">Back to login</router-link>
      </template>
    </div>
  </AuthPageFrame>
</template>
