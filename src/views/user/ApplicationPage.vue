<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AccountPageFrame from '@/components/public/AccountPageFrame.vue'
import { jobs } from '@/data/catalog'
import { currentUser, displayNameForUser } from '@/services/auth'
import { applicationDrafts, activityLoading, activityError, loadActivity, saveApplicationDraft } from '@/services/activity'
const route = useRoute()
const job = computed(() => jobs.find(job => job.id === route.params.id))
const form = reactive({ coverLetter: '', resumeUrl: '' })
const dirty = ref(false)
const busy = ref(false)
const error = ref('')
const success = ref('')
const existing = computed(() => applicationDrafts.value.find(draft => draft.jobId === job.value?.id))
watch(() => route.params.id, () => { dirty.value = false; error.value = ''; success.value = ''; form.coverLetter = ''; form.resumeUrl = '' })
watch(existing, draft => { if (!dirty.value) { form.coverLetter = draft?.coverLetter ?? ''; form.resumeUrl = draft?.resumeUrl ?? '' } }, { immediate: true })
async function save() {
  if (!job.value || busy.value) return
  busy.value = true; error.value = ''; success.value = ''
  try {
    const data = { coverLetter: form.coverLetter.trim(), resumeUrl: form.resumeUrl.trim() }
    if (data.resumeUrl && new URL(data.resumeUrl).protocol !== 'https:') throw new Error('Use an HTTPS link for your résumé.')
    await saveApplicationDraft(job.value.id, data)
    dirty.value = false
    success.value = 'Draft saved to your account. Nothing has been sent to the employer.'
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Unable to save your draft.' }
  finally { busy.value = false }
}
</script>
<template>
  <AccountPageFrame :title="job ? 'Prepare your application' : 'Job not found'" description="A space to prepare, review, and save your work.">
    <template v-if="job">
      <div class="account-notice mb-8">This is a preview listing. You can save a private application draft, but employer submission is not available yet.</div>
      <div class="grid items-start gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside class="account-panel"><img :src="job.logo" :alt="job.company" class="mb-5 size-12 object-contain" /><p class="account-muted">{{ job.company }}</p><h2 class="mt-2">{{ job.title }}</h2><p class="account-muted mt-3">{{ job.location }} · {{ job.workplace }}</p><router-link :to="`/jobs/${job.id}`" class="back-link mt-5 !mb-0">View job details →</router-link><div v-if="currentUser" class="mt-6 border-t border-[#e6e1fa] pt-5"><p class="account-muted">Preparing as</p><p class="mt-1 font-medium">{{ displayNameForUser(currentUser) }}</p><p class="account-muted break-all">{{ currentUser.email }}</p><router-link to="/profile" class="mt-3 inline-block text-sm text-[#6b58d4]">Edit profile</router-link></div></aside>
        <p v-if="activityLoading" role="status" class="account-muted">Loading your draft…</p>
        <div v-else-if="activityError" role="alert" class="account-feedback account-error">{{ activityError }} <button type="button" class="underline" @click="loadActivity">Try again</button></div>
        <form v-else class="account-panel account-form" @submit.prevent="save" @input="dirty = true; success = ''">
          <div><h2>{{ existing ? 'Continue your draft' : 'Application draft' }}</h2><p class="account-muted mt-2">Only you can access this draft. Save your changes before leaving.</p></div>
          <label class="account-field">Résumé link <span class="account-muted">Optional</span><input v-model="form.resumeUrl" type="url" maxlength="2048" placeholder="https://…" /><small>Use an HTTPS link to your résumé. No file is uploaded or shared.</small></label>
          <label class="account-field">Cover letter<textarea v-model="form.coverLetter" rows="11" maxlength="10000" placeholder="Introduce yourself and explain why this role interests you." /><small>{{ form.coverLetter.length.toLocaleString() }} / 10,000 characters</small></label>
          <p v-if="error" role="alert" class="account-feedback account-error">{{ error }}</p>
          <p v-if="success" role="status" class="account-feedback">{{ success }}</p>
          <div class="flex flex-wrap items-center gap-4"><button type="submit" class="account-primary" :disabled="busy">{{ busy ? 'Saving…' : 'Save draft' }}</button><router-link to="/applications" class="account-secondary">View all drafts</router-link><span v-if="dirty" class="account-muted">Unsaved changes</span></div>
        </form>
      </div>
    </template>
    <div v-else class="account-empty"><h2>This job is no longer available</h2><p>Explore the current listings to find another opportunity.</p><router-link to="/jobs" class="account-primary">Browse jobs</router-link></div>
  </AccountPageFrame>
</template>
