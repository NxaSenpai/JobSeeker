<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthPageFrame from '@/components/auth/AuthPageFrame.vue'
import PasswordField from '@/components/auth/PasswordField.vue'

const companyName = ref('')
const contactName = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const submitted = ref(false)
const router = useRouter()

function createCompanyAccount() {
  if (!companyName.value || !contactName.value || !email.value || !password.value || !confirmPassword.value) return
  submitted.value = true
  void router.push('/verify-email')
}
</script>

<template>
  <AuthPageFrame title="Create your" accent="company account." description="Set up your company profile after registration.">
    <template #back><router-link to="/register" class="inline-flex items-center gap-2 text-sm font-semibold text-[#596a9d] transition hover:text-[#7b66ff]"><span aria-hidden="true">←</span> Choose another account type</router-link></template>
    <form class="rounded-3xl border border-[#ded8f2] bg-white p-6 shadow-[0_24px_70px_rgba(24,37,101,0.1)] sm:p-8" @submit.prevent="createCompanyAccount">
      <p class="text-sm font-semibold uppercase tracking-[0.14em] text-[#7b66ff]">Company account</p><h2 class="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#0b2b82]">Tell us who is hiring</h2>
      <div v-if="submitted" class="mt-5 rounded-xl border border-[#bfe5c9] bg-[#effbf2] px-4 py-3 text-sm text-[#247441]">Your company account details are ready. Email verification will be connected with the backend.</div>
      <label class="mt-6 block text-sm font-medium text-[#34457d]">Company name<input v-model="companyName" required autocomplete="organization" placeholder="Smos Company" class="mt-2 w-full rounded-xl border border-[#e2def0] px-4 py-3 text-[#0b2b82] outline-none placeholder:text-[#a1aac2] focus:border-[#7b66ff] focus:ring-4 focus:ring-[#7b66ff]/10" /></label>
      <label class="mt-4 block text-sm font-medium text-[#34457d]">Your name<input v-model="contactName" required autocomplete="name" placeholder="Sok Sao" class="mt-2 w-full rounded-xl border border-[#e2def0] px-4 py-3 text-[#0b2b82] outline-none placeholder:text-[#a1aac2] focus:border-[#7b66ff] focus:ring-4 focus:ring-[#7b66ff]/10" /></label>
      <label class="mt-4 block text-sm font-medium text-[#34457d]">Work email<input v-model="email" required type="email" autocomplete="email" placeholder="soksao@company.com" class="mt-2 w-full rounded-xl border border-[#e2def0] px-4 py-3 text-[#0b2b82] outline-none placeholder:text-[#a1aac2] focus:border-[#7b66ff] focus:ring-4 focus:ring-[#7b66ff]/10" /></label>
      <div class="mt-4 grid gap-4"><PasswordField v-model="password" label="Password" placeholder="Create a password" autocomplete="new-password" /><PasswordField v-model="confirmPassword" label="Confirm password" placeholder="Repeat password" autocomplete="new-password" /></div>
      <button type="submit" class="cursor-pointer mt-6 w-full rounded-xl bg-[#7b66ff] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(123,102,255,0.25)] transition hover:bg-[#6f5cf9]">Create company account</button>
      <p class="mt-5 text-center text-sm text-[#63719b]">Already have an account? <router-link to="/login" class="font-semibold text-[#7b66ff] hover:underline">Sign in</router-link></p>
    </form>
  </AuthPageFrame>
</template>
