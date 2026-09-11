<script setup lang="ts">
import { ref } from 'vue'
import AccountPageFrame from '@/components/public/AccountPageFrame.vue'
import { jobs } from '@/data/catalog'
import { applicationDrafts, activityLoading, activityError, loadActivity, removeApplicationDraft } from '@/services/activity'
const deleting = ref('')
const confirmation = ref('')
const error = ref('')
function jobFor(id: string) { return jobs.find(job => job.id === id) }
function date(value: string) { return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) }
async function remove(id: string) {
  deleting.value = id; error.value = ''
  try { await removeApplicationDraft(id); confirmation.value = '' }
  catch (cause) { error.value = cause instanceof Error ? cause.message : 'Unable to delete this draft.' }
  finally { deleting.value = '' }
}
</script>
<template>
  <AccountPageFrame title="Application drafts" description="Prepare your next application at your own pace. These are private drafts; nothing has been sent to employers.">
    <p v-if="activityLoading" role="status" class="account-muted">Loading your drafts…</p>
    <div v-else-if="activityError" role="alert" class="account-feedback account-error">{{ activityError }} <button type="button" class="underline" @click="loadActivity">Try again</button></div>
    <div v-else-if="applicationDrafts.length" class="grid gap-5">
      <p v-if="error" role="alert" class="account-feedback account-error">{{ error }}</p>
      <article v-for="draft in applicationDrafts" :key="draft.jobId" class="account-panel flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
        <div><span class="text-xs font-medium uppercase tracking-wider text-[#7561d9]">Draft · Not submitted</span><h2 class="mt-2">{{ jobFor(draft.jobId)?.title ?? 'Listing unavailable' }}</h2><p class="account-muted mt-1">{{ jobFor(draft.jobId)?.company ?? 'This listing is no longer available.' }}</p><p class="account-muted mt-3">Last saved {{ date(draft.updatedAt) }}</p></div>
        <div class="flex flex-wrap items-center gap-3">
          <template v-if="confirmation === draft.jobId"><span class="text-sm">Delete this draft?</span><button type="button" class="account-secondary" :disabled="!!deleting" @click="remove(draft.jobId)">{{ deleting ? 'Deleting…' : 'Yes, delete' }}</button><button type="button" class="account-secondary" :disabled="!!deleting" @click="confirmation = ''">Cancel</button></template>
          <template v-else><router-link v-if="jobFor(draft.jobId)" :to="`/jobs/${draft.jobId}/apply`" class="account-primary">Continue draft</router-link><button type="button" class="account-secondary" @click="confirmation = draft.jobId">Delete</button></template>
        </div>
      </article>
    </div>
    <div v-else class="account-empty"><h2>A little preparation goes a long way</h2><p>Open a job you’re interested in and prepare a draft. Your saved work will appear here.</p><router-link to="/jobs" class="account-primary">Find a role</router-link></div>
  </AccountPageFrame>
</template>
