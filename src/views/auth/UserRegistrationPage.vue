<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthPageFrame from '@/components/auth/AuthPageFrame.vue'
import PasswordField from '@/components/auth/PasswordField.vue'

const firstName = ref('')
const lastName = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const acceptedTerms = ref(false)
const submitted = ref(false)
const router = useRouter()

function createAccount() {
  if (!firstName.value || !lastName.value || !email.value || !password.value || !confirmPassword.value || !acceptedTerms.value) return
  submitted.value = true
  void router.push('/verify-email')
}
</script>

<template>
  <AuthPageFrame title="Create your" accent="job seeker account." description="You can complete your profile later.">
    <template #back><router-link to="/register" class="inline-flex items-center gap-2 text-sm font-semibold text-[#596a9d] transition hover:text-[#7b66ff]"><span aria-hidden="true">←</span> Choose another account type</router-link></template>
    <form class="rounded-3xl border border-[#ded8f2] bg-white p-6 shadow-[0_24px_70px_rgba(24,37,101,0.1)] sm:p-8" @submit.prevent="createAccount">
      <p class="text-sm font-semibold uppercase tracking-[0.14em] text-[#7b66ff]">Job seeker account</p><h2 class="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#0b2b82]">Create your account</h2>
      <div v-if="submitted" class="mt-5 rounded-xl border border-[#bfe5c9] bg-[#effbf2] px-4 py-3 text-sm text-[#247441]">Your account details are ready. Verification will be connected once the backend is available.</div>
      <div class="mt-6 grid gap-4 sm:grid-cols-2"><label class="text-sm font-medium text-[#34457d]">First name<input v-model="firstName" required autocomplete="given-name" placeholder="Sok" class="mt-2 w-full rounded-xl border border-[#e2def0] px-4 py-3 text-[#0b2b82] outline-none placeholder:text-[#a1aac2] focus:border-[#7b66ff] focus:ring-4 focus:ring-[#7b66ff]/10" /></label><label class="text-sm font-medium text-[#34457d]">Last name<input v-model="lastName" required autocomplete="family-name" placeholder="Sao" class="mt-2 w-full rounded-xl border border-[#e2def0] px-4 py-3 text-[#0b2b82] outline-none placeholder:text-[#a1aac2] focus:border-[#7b66ff] focus:ring-4 focus:ring-[#7b66ff]/10" /></label></div>
      <label class="mt-4 block text-sm font-medium text-[#34457d]">Email address<input v-model="email" required type="email" autocomplete="email" placeholder="soksao@example.com" class="mt-2 w-full rounded-xl border border-[#e2def0] px-4 py-3 text-[#0b2b82] outline-none placeholder:text-[#a1aac2] focus:border-[#7b66ff] focus:ring-4 focus:ring-[#7b66ff]/10" /></label>
      <div class="mt-4 grid gap-4"><PasswordField v-model="password" label="Password" placeholder="Create a password" autocomplete="new-password" /><PasswordField v-model="confirmPassword" label="Confirm password" placeholder="Repeat password" autocomplete="new-password" /></div>
      <label class="mt-5 flex cursor-pointer items-start gap-3 text-sm leading-6 text-[#5c6d99]"><input v-model="acceptedTerms" required type="checkbox" class="mt-1 size-4 accent-[#7b66ff]" /><span>I agree to the <a href="#" class="font-semibold text-[#715cdf] hover:underline">terms of service</a> and <a href="#" class="font-semibold text-[#715cdf] hover:underline">privacy policy</a>.</span></label>
      <button type="submit" class=" cursor-pointer mt-6 w-full rounded-xl bg-[#7b66ff] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(123,102,255,0.25)] transition hover:bg-[#6f5cf9]">Create job seeker account</button>
      <p class="mt-5 text-center text-sm text-[#63719b]">Already have an account? <router-link to="/login" class="font-semibold text-[#7b66ff] hover:underline">Sign in</router-link></p>
    </form>
  </AuthPageFrame>
</template>
