<script setup lang="ts">
import decoWhite from '@/assets/img/cta-deco-2.svg'
</script>

<template>
  <section
    class="relative mx-auto flex h-[432px] max-w-[1224px] items-center justify-center overflow-hidden bg-[#6f5cf9]"
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
        <h2 class="text-[56px] font-semibold leading-[1.2]">
          Start Recruiting Now
        </h2>
        <p class="w-[648px] text-center text-base leading-[32px]">
          Are you ready to take your recruitment efforts to the next level? Our
          platform offers a seamless and efficient way to get your job listings
          in front of top talent.
        </p>
      </div>

      <router-link to="/auth"
        type="button"
        class="bg-white px-8 py-4 text-base font-medium text-[#7b66ff] transition-colors hover:bg-[#f1efff] cursor-pointer"
      >
        Sign Up Now
      </router-link>
    </div>
  </section>
</template>
