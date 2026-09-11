<script setup lang="ts">
defineProps<{
  title: string
  accent: string
  description: string
}>()
</script>

<template>
  <div class="min-h-[100svh] overflow-x-clip bg-[#f3f1ff]">
    <section class="relative isolate min-h-[100svh] overflow-hidden">
      <div class="pointer-events-none absolute left-[8%] top-14 size-72 rounded-full bg-[#7b66ff]/10 blur-3xl"></div>
      <div class="relative mx-auto grid min-h-[100svh] max-w-[1440px] gap-10 px-6 py-10 sm:px-10 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-center lg:gap-20 lg:px-[108px]">
        <div class="max-w-[640px]" data-reveal>
          <slot name="back" />
          <h1 class="mt-5 text-4xl font-semibold leading-[1.1] tracking-[-0.045em] text-[#0b2b82] sm:text-5xl">
            {{ title }} <span class="text-[#7b66ff]">{{ accent }}</span>
          </h1>
          <p class="mt-4 max-w-[520px] text-sm leading-7 text-[#53669a]">{{ description }}</p>
        </div>

        <div class="w-full" data-reveal>
          <slot />
        </div>
      </div>
    </section>
  </div>
</template>
