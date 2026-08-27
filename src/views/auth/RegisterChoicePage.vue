<script setup lang="ts">
import AuthPageFrame from '@/components/auth/AuthPageFrame.vue'
</script>

<template>
  <AuthPageFrame
    title="Choose your"
    accent="account type."
    description="Select how you will use JobSeeker."
  >

    <div class="rounded-3xl border border-[#ded8f2] bg-white p-6 shadow-[0_24px_70px_rgba(24,37,101,0.1)] sm:p-8">
      <div class="flex items-start justify-between gap-5"><div><p class="text-sm font-semibold uppercase tracking-[0.14em] text-[#7b66ff]">Account type</p><h2 class="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#0b2b82]">How will you use JobSeeker?</h2></div></div>

      <div class="mt-7 space-y-4">
        <router-link to="/register/user" class="group block rounded-2xl border border-[#dcd5f6] p-5 transition duration-300 hover:-translate-y-0.5 hover:border-[#7b66ff] hover:bg-[#faf9ff] hover:shadow-[0_14px_28px_rgba(86,68,188,0.12)]">
          <div class="flex gap-4"><div class="grid size-12 shrink-0 place-items-center rounded-xl bg-[#f0edff] text-[#705be0]"><svg class="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8"><circle cx="12" cy="8" r="3.5" /><path stroke-linecap="round" d="M5 21a7 7 0 0114 0" /></svg></div><div class="min-w-0 flex-1"><div class="flex items-center justify-between gap-3"><h3 class="text-lg font-semibold text-[#0b2b82]">I’m looking for a job</h3><span class="text-lg text-[#7b66ff] transition-transform group-hover:translate-x-1">→</span></div><p class="mt-1 text-sm leading-6 text-[#60709b]">Create your profile and start searching for your job today</p></div></div>
        </router-link>
        <router-link to="/register/company" class="group block rounded-2xl border border-[#dcd5f6] p-5 transition duration-300 hover:-translate-y-0.5 hover:border-[#7b66ff] hover:bg-[#faf9ff] hover:shadow-[0_14px_28px_rgba(86,68,188,0.12)]">
          <div class="flex gap-4"><div class="grid size-12 shrink-0 place-items-center rounded-xl bg-[#eaf6ff] text-[#2078b6]"><svg class="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M3 21h18M5 21V8l7-4 7 4v13M9 21v-5h6v5M9 11h.01M15 11h.01" /></svg></div><div class="min-w-0 flex-1"><div class="flex items-center justify-between gap-3"><h3 class="text-lg font-semibold text-[#0b2b82]">I’m hiring for a company</h3><span class="text-lg text-[#7b66ff] transition-transform group-hover:translate-x-1">→</span></div><p class="mt-1 text-sm leading-6 text-[#60709b]">Create a company profile, publish roles, and hire the right candidates.</p></div></div>
        </router-link>
      </div>

      <p class="mt-7 text-center text-sm text-[#60709b]">Already have an account? <router-link to="/login" class="font-semibold text-[#7b66ff] hover:underline">Sign in</router-link></p>
    </div>
  </AuthPageFrame>
</template>
