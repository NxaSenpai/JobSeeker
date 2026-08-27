<script setup lang="ts">
import HeroSection from '@/components/landing/HeroSection.vue'
import CategorySection from '@/components/landing/CategorySection.vue'
import RecruitCta from '@/components/landing/RecruitCta.vue'
import FeaturedJobsSection from '@/components/landing/FeaturedJobsSection.vue'
import LatestJobsSection from '@/components/landing/LatestJobsSection.vue'
</script>

<template>
  <div class="min-h-screen overflow-x-clip bg-white">
    <HeroSection />
    <CategorySection />
    <RecruitCta />
    <FeaturedJobsSection />
    <LatestJobsSection />
  </div>
</template>
