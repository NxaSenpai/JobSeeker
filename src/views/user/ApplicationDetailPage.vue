<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AccountPageFrame from '@/components/public/AccountPageFrame.vue'
import { apiBlob, apiRequest } from '@/services/api'
import { dateLabel, fileSize, statusLabels, type ApplicationRecord } from '@/services/candidate'
const route = useRoute()
const application = ref<ApplicationRecord | null>(null)
const loading = ref(true); const busy = ref(false); const confirming = ref(false); const error = ref('')
const canWithdraw = computed(() => application.value && !['WITHDRAWN', 'HIRED', 'REJECTED'].includes(application.value.status))
let generation = 0
async function load() {
  const version = ++generation; loading.value = true; error.value = ''; application.value = null
  try { const result = await apiRequest<{ application: ApplicationRecord }>(`/applications/me/${route.params.id}`); if (version === generation) application.value = result.application }
  catch (cause) { if (version === generation) error.value = cause instanceof Error ? cause.message : 'Unable to load this application.' }
  finally { if (version === generation) loading.value = false }
}
watch(() => route.params.id, load, { immediate: true })
async function withdraw() {
  if (busy.value || !application.value) return
  busy.value = true; error.value = ''
  try { application.value = (await apiRequest<{ application: ApplicationRecord }>(`/applications/me/${application.value.id}/withdraw`, { method: 'PATCH' })).application; confirming.value = false }
  catch (cause) { error.value = cause instanceof Error ? cause.message : 'Unable to withdraw this application.' }
  finally { busy.value = false }
}
async function download() {
  if (!application.value || busy.value) return
  busy.value = true; error.value = ''
  try { const blob = await apiBlob(`/account/resumes/${application.value.resume.id}/download`); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = application.value.resume.fileName; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000) }
  catch (cause) { error.value = cause instanceof Error ? cause.message : 'Unable to download your résumé.' }
  finally { busy.value = false }
}
</script>
<template>
  <AccountPageFrame title="Application details" description="A record of your application and the information you submitted.">
    <p v-if="loading" role="status" class="account-muted">Loading your application…</p>
    <p v-if="error" role="alert" class="account-feedback account-error mb-5">{{ error }} <button v-if="!application" class="underline" @click="load">Try again</button></p>
    <template v-if="application">
      <p v-if="route.query.submitted && application.status === 'APPLIED'" role="status" class="account-feedback mb-6">Application submitted. Your CV and details have been saved.</p>
      <p v-if="application.job.isDemo" class="account-notice mb-6">This is a sample listing. This application is stored for demonstration and was not sent to {{ application.job.company }}.</p>
      <div class="detail-layout">
        <div class="grid gap-6">
          <section class="account-panel"><span class="application-status">{{ statusLabels[application.status] }}</span><h2 class="mt-4">{{ application.job.title }}</h2><p class="account-muted mt-2">{{ application.job.company }} · {{ application.job.location }}</p><p class="account-muted mt-4">Applied {{ dateLabel(application.createdAt) }}</p><router-link :to="`/jobs/${application.jobId}`" class="mt-4 inline-block text-sm text-[#6b58d4]">View original listing →</router-link></section>
          <section class="account-panel"><h2>Your introduction</h2><p class="submitted-copy">{{ application.description }}</p><template v-if="application.coverLetter"><h3 class="mt-8 text-lg font-semibold">Cover letter</h3><p class="submitted-copy">{{ application.coverLetter }}</p></template></section>
          <section class="account-panel"><h2>Submitted documents &amp; contact</h2><div class="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-lg bg-[#f7f5fc] p-4"><div class="min-w-0"><strong class="break-all text-sm">{{ application.resume.fileName }}</strong><p class="account-muted">PDF · {{ fileSize(application.resume.fileSize) }}</p></div><button class="account-secondary" :disabled="busy" @click="download">Download CV</button></div><dl class="contact-details"><div><dt>Name</dt><dd>{{ application.candidate.firstName }} {{ application.candidate.lastName }}</dd></div><div><dt>Email</dt><dd>{{ application.candidate.email }}</dd></div><div v-if="application.phone"><dt>Phone</dt><dd>{{ application.phone }}</dd></div><div v-if="application.portfolioUrl"><dt>Portfolio</dt><dd><a :href="application.portfolioUrl" target="_blank" rel="noopener noreferrer" class="underline">{{ application.portfolioUrl }}</a></dd></div></dl><p class="account-muted mt-5">This records the profile and CV you submitted. Later profile edits do not change it.</p></section>
        </div>
        <aside class="grid content-start gap-6"><section class="account-panel"><h2>Status history</h2><ol class="history-list"><li v-for="(entry, index) in application.history" :key="index"><strong>{{ statusLabels[entry.status] }}</strong><time :datetime="entry.at">{{ dateLabel(entry.at) }}</time></li></ol></section><section v-if="canWithdraw" class="account-panel"><h2>Changed your plans?</h2><p class="account-muted my-4">Withdrawing closes this application. You cannot submit a second application for the same role.</p><div v-if="confirming"><p class="text-sm mb-4">Withdraw this application?</p><button class="account-secondary" :disabled="busy" @click="withdraw">{{ busy ? 'Withdrawing…' : 'Yes, withdraw' }}</button><button class="mt-3 block text-sm underline" :disabled="busy" @click="confirming = false">Keep application</button></div><button v-else class="account-secondary" @click="confirming = true">Withdraw application</button></section></aside>
      </div>
    </template>
    <router-link to="/applications" class="back-link mt-8">← Back to applications</router-link>
  </AccountPageFrame>
</template>
<style scoped>
.detail-layout { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 24px; align-items: start; }.submitted-copy { white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.85; color: #596484; margin-top: 20px; font-size: 15px; }.history-list { margin-top: 24px; display: grid; gap: 24px; border-left: 2px solid #e7e1f5; padding-left: 20px; }.history-list li { position: relative; display: grid; gap: 5px; }.history-list li::before { content: ''; position: absolute; left: -26px; top: 5px; width: 10px; height: 10px; border-radius: 50%; background: #705aef; }.history-list strong { font-size: 14px; }.history-list time { font-size: 12px; color: #68759d; }.contact-details { display: grid; gap: 14px; margin-top: 24px; font-size: 14px; }.contact-details > div { display: grid; grid-template-columns: 90px minmax(0, 1fr); gap: 12px; }.contact-details dt { color: #68759d; }.contact-details dd { overflow-wrap: anywhere; }@media(max-width: 850px) { .detail-layout { grid-template-columns: 1fr; } }
</style>
