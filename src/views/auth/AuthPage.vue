<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthPageFrame from '@/components/auth/AuthPageFrame.vue'
import PasswordField from '@/components/auth/PasswordField.vue'
import { ApiRequestError, apiRequest } from '@/services/api'
import { saveAuthSession } from '@/services/auth'
import { loginDestination } from '@/router'

type LoginResponse = {
  accessToken: string
  user: {
    id: string
    email: string
    role: 'USER' | 'COMPANY' | 'ADMIN'
    emailVerified: boolean
    firstName?: string | null
    lastName?: string | null
    companyName?: string | null
    contactName?: string | null
  }
}

const router = useRouter()
const route = useRoute()
const email = ref('')
const password = ref('')
const rememberMe = ref(false)
const loading = ref(false)
const errorMessage = ref('')
const verifiedNotice = computed(() => route.query.verified === '1')

async function login() {
  errorMessage.value = ''
  if (!email.value || !password.value) {
    errorMessage.value = 'Enter your email and password.'
    return
  }

  loading.value = true

  try {
    const response = await apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: email.value.trim(),
        password: password.value,
      }),
    })

    saveAuthSession(response, rememberMe.value)
    await router.replace(loginDestination(response.user.role, route.query.redirect))
  } catch (error) {
    errorMessage.value =
      error instanceof ApiRequestError
        ? error.message
        : 'We could not sign you in. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthPageFrame title="Welcome" accent="back." description="Sign in to continue your job search.">
    <form class="rounded-3xl border border-[#ded8f2] bg-white p-7 shadow-[0_24px_70px_rgba(24,37,101,0.1)] sm:p-8" @submit.prevent="login">
      <h2 class="text-2xl font-semibold tracking-[-0.03em] text-[#0b2b82]">Sign in</h2>
      <p v-if="route.query.connection" role="status" class="mt-4 text-sm text-[#60709b]">We could not reach the account service. Please try signing in again.</p>
      <p v-else-if="route.query.redirect" class="mt-4 text-sm text-[#60709b]">Sign in to continue where you left off.</p>

      <div v-if="verifiedNotice" class="mt-5 rounded-xl border border-[#bfe5c9] bg-[#effbf2] px-4 py-3 text-sm text-[#247441]" role="status">
        Your email is verified. You can sign in now.
      </div>

      <div v-if="errorMessage" class="mt-5 rounded-xl border border-[#f2c9d0] bg-[#fff4f5] px-4 py-3 text-sm text-[#af3348]" role="alert">{{ errorMessage }}</div>

      <label class="mt-6 block text-sm font-medium text-[#34457d]">Email address<input v-model="email" required type="email" autocomplete="email" placeholder="you@example.com" class="mt-2 w-full rounded-xl border border-[#e2def0] px-4 py-3 text-[#0b2b82] outline-none placeholder:text-[#a1aac2] transition focus:border-[#7b66ff] focus:ring-4 focus:ring-[#7b66ff]/10" /></label>
      <PasswordField v-model="password" class="mt-4" label="Password" placeholder="Enter your password" autocomplete="current-password" />

      <div class="mt-4 flex items-center justify-between gap-4"><label class="flex cursor-pointer items-center gap-2 text-sm text-[#5c6d99]"><input v-model="rememberMe" type="checkbox" class="size-4 accent-[#7b66ff]" />Remember me</label><router-link to="/forgot-password" class="text-sm font-semibold text-[#715cdf] hover:underline">Forgot password?</router-link></div>
      <button type="submit" :disabled="loading" class="cursor-pointer mt-6 w-full rounded-xl bg-[#7b66ff] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(123,102,255,0.25)] transition hover:bg-[#6f5cf9] disabled:cursor-not-allowed disabled:opacity-60">{{ loading ? 'Signing in…' : 'Sign in' }}</button>
      <p class="mt-6 text-center text-sm text-[#63719b]">New to JobSeeker? <router-link to="/register" class="font-semibold text-[#7b66ff] hover:underline">Create an account</router-link></p>
    </form>
  </AuthPageFrame>
</template>
