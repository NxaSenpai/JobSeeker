<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthPageFrame from '@/components/auth/AuthPageFrame.vue'
import PasswordField from '@/components/auth/PasswordField.vue'
import { ApiRequestError, apiRequest } from '@/services/api'

type RegistrationResponse = {
  message: string
  user: {
    id: string
    email: string
    role: string
    emailVerified: boolean
  }
}

const firstName = ref('')
const lastName = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const acceptedTerms = ref(false)
const loading = ref(false)
const errorMessage = ref('')
const router = useRouter()

const passwordsDoNotMatch = computed(
  () => Boolean(confirmPassword.value) && password.value !== confirmPassword.value,
)

async function createAccount() {
  errorMessage.value = ''

  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Passwords do not match. Please check them and try again.'
    return
  }

  if (!acceptedTerms.value) {
    errorMessage.value = 'Accept the terms of service before creating an account.'
    return
  }

  loading.value = true

  try {
    const response = await apiRequest<RegistrationResponse>('/auth/register/user', {
      method: 'POST',
      body: JSON.stringify({
        firstName: firstName.value.trim(),
        lastName: lastName.value.trim(),
        email: email.value.trim(),
        password: password.value,
        confirmPassword: confirmPassword.value,
        acceptedTerms: acceptedTerms.value,
      }),
    })

    sessionStorage.setItem('pendingVerificationEmail', response.user.email)
    await router.push({ name: 'VerifyEmailPage' })
  } catch (error) {
    errorMessage.value =
      error instanceof ApiRequestError
        ? error.message
        : 'We could not create your account. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthPageFrame title="Create your" accent="job seeker account." description="You can complete your profile later.">
    <template #back>
      <router-link to="/register" class="inline-flex items-center gap-2 text-sm font-semibold text-[#596a9d] transition hover:text-[#7b66ff]">
        <span aria-hidden="true">←</span> Choose another account type
      </router-link>
    </template>

    <form class="rounded-3xl border border-[#ded8f2] bg-white p-6 shadow-[0_24px_70px_rgba(24,37,101,0.1)] sm:p-8" @submit.prevent="createAccount">
      <p class="text-sm font-semibold uppercase tracking-[0.14em] text-[#7b66ff]">Job seeker account</p>
      <h2 class="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#0b2b82]">Create your account</h2>

      <div v-if="errorMessage" class="mt-5 rounded-xl border border-[#f2c9d0] bg-[#fff4f5] px-4 py-3 text-sm text-[#af3348]" role="alert">
        {{ errorMessage }}
      </div>

      <div class="mt-6 grid gap-4 sm:grid-cols-2">
        <label class="text-sm font-medium text-[#34457d]">
          First name
          <input v-model="firstName" required autocomplete="given-name" placeholder="Sok" class="mt-2 w-full rounded-xl border border-[#e2def0] px-4 py-3 text-[#0b2b82] outline-none placeholder:text-[#a1aac2] focus:border-[#7b66ff] focus:ring-4 focus:ring-[#7b66ff]/10" />
        </label>
        <label class="text-sm font-medium text-[#34457d]">
          Last name
          <input v-model="lastName" required autocomplete="family-name" placeholder="Sao" class="mt-2 w-full rounded-xl border border-[#e2def0] px-4 py-3 text-[#0b2b82] outline-none placeholder:text-[#a1aac2] focus:border-[#7b66ff] focus:ring-4 focus:ring-[#7b66ff]/10" />
        </label>
      </div>

      <label class="mt-4 block text-sm font-medium text-[#34457d]">
        Email address
        <input v-model="email" required type="email" autocomplete="email" placeholder="soksao@example.com" class="mt-2 w-full rounded-xl border border-[#e2def0] px-4 py-3 text-[#0b2b82] outline-none placeholder:text-[#a1aac2] focus:border-[#7b66ff] focus:ring-4 focus:ring-[#7b66ff]/10" />
      </label>

      <div class="mt-4 grid gap-4">
        <PasswordField v-model="password" label="Password" placeholder="Create a password" autocomplete="new-password" />
        <PasswordField v-model="confirmPassword" label="Confirm password" placeholder="Repeat your password" autocomplete="new-password" />
        <p v-if="passwordsDoNotMatch" class="-mt-2 text-sm text-[#af3348]" role="alert">Passwords do not match.</p>
      </div>

      <label class="mt-5 flex cursor-pointer items-start gap-3 text-sm leading-6 text-[#5c6d99]">
        <input v-model="acceptedTerms" required type="checkbox" class="mt-1 size-4 accent-[#7b66ff]" />
        <span>I agree to the <a href="#" class="font-semibold text-[#715cdf] hover:underline">terms of service</a> and <a href="#" class="font-semibold text-[#715cdf] hover:underline">privacy policy</a>.</span>
      </label>

      <button type="submit" :disabled="loading" class="mt-6 w-full cursor-pointer rounded-xl bg-[#7b66ff] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(123,102,255,0.25)] transition hover:bg-[#6f5cf9] disabled:cursor-not-allowed disabled:opacity-60">
        {{ loading ? 'Creating account…' : 'Create job seeker account' }}
      </button>
      <p class="mt-5 text-center text-sm text-[#63719b]">Already have an account? <router-link to="/login" class="font-semibold text-[#7b66ff] hover:underline">Sign in</router-link></p>
    </form>
  </AuthPageFrame>
</template>
