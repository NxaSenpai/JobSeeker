<script setup lang="ts">
import TheNavbar from '@/components/landing/TheNavbar.vue'
import HeroSection from '@/components/landing/HeroSection.vue'
import CategorySection from '@/components/landing/CategorySection.vue'
import RecruitCta from '@/components/landing/RecruitCta.vue'
import FeaturedJobsSection from '@/components/landing/FeaturedJobsSection.vue'
import LatestJobsSection from '@/components/landing/LatestJobsSection.vue'
import TheFooter from '@/components/landing/TheFooter.vue'
</script>

<template>
  <div class="min-h-screen overflow-x-clip bg-white">
    <TheNavbar />
    <HeroSection />
    <CategorySection />
    <RecruitCta />
    <FeaturedJobsSection />
    <LatestJobsSection />
    <TheFooter />
  </div>
</template>
