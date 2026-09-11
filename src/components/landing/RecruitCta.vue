<script setup lang="ts">
import decoWhite from '@/assets/img/cta-deco-2.svg'
import { currentUser, isJobSeeker, dashboardPathForRole } from '@/services/auth'
</script>

<template>
  <section
    class="relative mx-auto flex min-h-[360px] max-w-[1224px] items-center justify-center overflow-hidden bg-[#6f5cf9] px-6 py-16 text-center"
  >
    <!-- Decorative edge shapes -->
    <img
      :src="decoWhite"
      class="pointer-events-none absolute left-0 top-0 h-full w-auto opacity-90"
      alt=""
    />
    <img
      :src="decoWhite"
      class="pointer-events-none absolute right-0 top-0 h-full w-auto -scale-x-100 opacity-90"
      alt=""
    />

    <div class="relative flex flex-col items-center gap-10 text-white">
      <div class="flex flex-col items-center gap-4">
        <h2 class="text-4xl font-semibold leading-[1.2] sm:text-[56px]">
          {{ isJobSeeker ? 'Make your next move.' : currentUser ? 'Your workspace is ready.' : 'Start Recruiting Now' }}
        </h2>
        <p v-if="isJobSeeker" class="max-w-[648px] text-base leading-8">Keep your profile up to date and your favourite opportunities close. Your next chapter is yours to shape.</p>
        <p v-else-if="currentUser" class="max-w-[648px] text-base leading-8">Return to your dashboard to manage your work.</p>
        <p v-else class="max-w-[648px] text-center text-base leading-[32px]">
          Are you ready to take your recruitment efforts to the next level? Our
          platform offers a seamless and efficient way to get your job listings
          in front of top talent.
        </p>
      </div>

      <router-link :to="isJobSeeker ? '/profile' : currentUser ? dashboardPathForRole(currentUser.role) : '/register/company'"
        type="button"
        class="bg-white px-8 py-4 text-base font-medium text-[#7b66ff] transition-colors hover:bg-[#f1efff] cursor-pointer"
      >
        {{ isJobSeeker ? 'View your profile' : currentUser ? 'Go to dashboard' : 'Create a company account' }}
      </router-link>
    </div>
  </section>
</template>
