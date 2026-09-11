<script setup lang="ts">
import { computed } from 'vue'
import AccountPageFrame from '@/components/public/AccountPageFrame.vue'
import JobCard from '@/components/public/JobCard.vue'
import SaveJobButton from '@/components/public/SaveJobButton.vue'
import { jobs } from '@/data/catalog'
import { savedJobIds, activityLoading, activityError, loadActivity } from '@/services/activity'
const saved = computed(() => savedJobIds.value.map(id => ({ id, job: jobs.find(job => job.id === id) })))
</script>
<template>
  <AccountPageFrame title="Saved jobs" description="A shortlist for your next move. Saved jobs stay with your account when you return.">
    <p v-if="activityLoading" class="account-muted" role="status">Loading your saved jobs…</p>
    <div v-else-if="activityError" class="account-feedback account-error" role="alert">{{ activityError }} <button type="button" class="underline" @click="loadActivity">Try again</button></div>
    <div v-else-if="saved.length" class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      <template v-for="item in saved" :key="item.id">
        <JobCard v-if="item.job" :job="item.job" />
        <article v-else class="account-panel"><h2>Listing unavailable</h2><p class="account-muted my-4">This listing is no longer in the current catalog.</p><SaveJobButton :job-id="item.id" /></article>
      </template>
    </div>
    <div v-else class="account-empty"><h2>Your shortlist starts here</h2><p>Tap the bookmark on any job to keep it here for later.</p><router-link to="/jobs" class="account-primary">Explore jobs</router-link></div>
  </AccountPageFrame>
</template>
