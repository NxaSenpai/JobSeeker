<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { currentUser } from '@/services/auth'
import { savedJobIds, toggleSavedJob, isSavingJob, activityLoading, activityError, loadActivity } from '@/services/activity'
const props = defineProps<{ jobId: string; compact?: boolean; inverse?: boolean }>()
const route = useRoute()
const router = useRouter()
const saved = computed(() => savedJobIds.value.includes(props.jobId))
const busy = computed(() => isSavingJob(props.jobId) || activityLoading.value)
const error = ref('')
const announcement = ref('')
watch(() => props.jobId, () => { error.value = ''; announcement.value = '' })
async function toggle() {
  if (!currentUser.value) { await router.push({ name: 'AuthPage', query: { redirect: route.fullPath } }); return }
  error.value = ''
  try { await toggleSavedJob(props.jobId); announcement.value = saved.value ? 'Job saved to your account.' : 'Job removed from saved jobs.' }
  catch (cause) { error.value = cause instanceof Error ? cause.message : 'Could not save this job. Try again.' }
}
</script>
<template>
  <div v-if="!currentUser || currentUser.role === 'USER'" class="save-control" :class="{ compact, inverse }">
    <button type="button" :class="{ saved }" :disabled="busy || !!activityError" :aria-label="saved ? 'Remove saved job' : 'Save job'" :aria-pressed="saved" :title="activityError || (saved ? 'Remove saved job' : 'Save job')" @click="toggle">
      <svg width="17" height="19" :fill="saved ? 'currentColor' : 'none'" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 3h12v18l-6-4-6 4V3Z" /></svg>
      <span v-if="!compact">{{ busy ? 'Please wait…' : saved ? 'Saved to your jobs' : 'Save for later' }}</span>
    </button>
    <span class="sr-only" role="status">{{ announcement }}</span>
    <p v-if="error" role="alert" class="save-error">{{ error }}</p>
    <p v-if="activityError && !compact" class="save-error">Your saved jobs couldn't be loaded. <button type="button" class="retry" @click="loadActivity">Retry</button></p>
  </div>
</template>
<style scoped>
.save-control > button { display: flex; align-items: center; justify-content: center; gap: 9px; width: 100%; min-height: 44px; padding: 10px 16px; border: 1px solid #d9d2f6; border-radius: 10px; color: #6956d3; background: white; font-size: 14px; font-weight: 600; cursor: pointer; transition: background .15s; }
.save-control > button:hover { background: #f3f0ff; }
.save-control > button:focus-visible, .retry:focus-visible { outline: 2px solid #7b66ff; outline-offset: 3px; }
.save-control > button:disabled { opacity: .55; cursor: wait; }
.compact { flex-shrink: 0; position: relative; }
.compact > button { width: 44px; height: 44px; border-radius: 50%; padding: 10px; }
.saved { background: #eeeaff !important; }
.inverse > button { background: #203e91; color: white; border-color: #6077b3; }
.inverse > button:hover, .inverse > button.saved { background: #354fa0 !important; }
.save-error { margin-top: 8px; font-size: 12px; line-height: 1.5; color: #b03d57; }
.inverse .save-error { color: #ffe0e7; }
.compact .save-error { position: absolute; z-index: 5; right: 0; width: 220px; padding: 10px; border: 1px solid #f1cbd3; border-radius: 8px; background: #fff7f9; }
.retry { text-decoration: underline; cursor: pointer; }
</style>
