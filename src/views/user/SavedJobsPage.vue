<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import AccountPageFrame from '@/components/public/AccountPageFrame.vue'
import JobCard from '@/components/public/JobCard.vue'
import SaveJobButton from '@/components/public/SaveJobButton.vue'
import type { Job } from '@/data/catalog'
import { savedJobIds, activityLoading, activityError, loadActivity } from '@/services/activity'
import { getPublicJobsByIds } from '@/services/publicCatalog'

const jobsById = ref(new Map<string, Job>())
const detailsLoading = ref(false)
const detailsError = ref('')
let requestVersion = 0
let controller: AbortController | undefined
const saved = computed(() => savedJobIds.value.map(id => ({ id, job: jobsById.value.get(id) })))

async function loadSavedJobDetails() {
  const version = ++requestVersion
  controller?.abort()
  const ids = [...savedJobIds.value]
  jobsById.value = new Map()
  detailsError.value = ''
  if (!ids.length) { detailsLoading.value = false; return }

  const activeController = new AbortController()
  controller = activeController
  detailsLoading.value = true
  try {
    const result = await getPublicJobsByIds(ids, activeController.signal)
    if (version === requestVersion) jobsById.value = result.jobs
  } catch (cause) {
    if (version === requestVersion && !activeController.signal.aborted) {
      detailsError.value = cause instanceof Error ? cause.message : 'Could not load saved job details.'
    }
  } finally {
    if (version === requestVersion) detailsLoading.value = false
  }
}

watch(savedJobIds, () => { void loadSavedJobDetails() }, { immediate: true })
onBeforeUnmount(() => { requestVersion++; controller?.abort() })
</script>
<template>
  <AccountPageFrame title="Saved jobs" description="A shortlist for your next move. Saved jobs stay with your account when you return.">
    <p v-if="activityLoading" class="account-muted" role="status">Loading your saved jobs…</p>
    <div v-else-if="activityError" class="account-feedback account-error" role="alert">{{ activityError }} <button type="button" class="underline" @click="loadActivity">Try again</button></div>
    <p v-else-if="detailsLoading" class="account-muted" role="status">Loading saved job details…</p>
    <div v-else-if="detailsError" class="account-feedback account-error" role="alert">{{ detailsError }} <button type="button" class="underline" @click="loadSavedJobDetails">Try again</button></div>
    <div v-else-if="saved.length" class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      <template v-for="item in saved" :key="item.id">
        <JobCard v-if="item.job" :job="item.job" />
        <article v-else class="account-panel"><h2>Listing unavailable</h2><p class="account-muted my-4">This listing is no longer available, but you can still remove it from your shortlist.</p><SaveJobButton :job-id="item.id" /></article>
      </template>
    </div>
    <div v-else class="account-empty"><h2>Your shortlist starts here</h2><p>Tap the bookmark on any job to keep it here for later.</p><router-link to="/jobs" class="account-primary">Explore jobs</router-link></div>
  </AccountPageFrame>
</template>
