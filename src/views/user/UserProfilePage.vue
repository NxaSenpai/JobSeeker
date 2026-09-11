<script setup lang="ts">
import { reactive, ref } from 'vue'
import AccountPageFrame from '@/components/public/AccountPageFrame.vue'
import { currentUser, displayNameForUser, initialsForUser, updateAuthUser, type AuthUser } from '@/services/auth'
import { apiRequest } from '@/services/api'
const form = reactive({ firstName: currentUser.value?.firstName ?? '', lastName: currentUser.value?.lastName ?? '', headline: currentUser.value?.headline ?? '', location: currentUser.value?.location ?? '', bio: currentUser.value?.bio ?? '' })
const busy = ref(false)
const error = ref('')
const success = ref('')
async function save() {
  if (busy.value) return
  error.value = ''; success.value = ''; busy.value = true
  try {
    const { user } = await apiRequest<{ user: AuthUser }>('/account/profile', { method: 'PATCH', body: JSON.stringify(form) })
    updateAuthUser(user)
    success.value = 'Your profile has been updated.'
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Unable to update your profile.' }
  finally { busy.value = false }
}
</script>
<template>
  <AccountPageFrame title="Your profile" description="Keep your details up to date as you explore your next opportunity.">
    <div class="grid items-start gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside v-if="currentUser" class="account-panel">
        <span class="grid size-20 place-items-center rounded-full border border-[#d9d0ff] bg-[#eeeaff] text-2xl font-semibold text-[#6449dc]">{{ initialsForUser(currentUser) }}</span>
        <h2 class="mt-5 break-words">{{ displayNameForUser(currentUser) }}</h2>
        <p class="account-muted mt-2 break-all">{{ currentUser.email }}</p>
        <span class="mt-4 inline-flex rounded-full bg-[#edf7f2] px-3 py-1 text-xs font-medium text-[#327558]">Email verified</span>
        <p class="account-muted mt-5">Job seeker account</p>
        <p v-if="currentUser.headline" class="mt-4 text-sm leading-6">{{ currentUser.headline }}</p>
        <p v-if="currentUser.location" class="account-muted mt-2">{{ currentUser.location }}</p>
      </aside>
      <form class="account-panel account-form" @submit.prevent="save" @input="success = ''">
        <div><h2>Personal details</h2><p class="account-muted mt-2">Your name also appears in your account menu.</p></div>
        <div class="account-form-row">
          <label class="account-field">First name<input v-model="form.firstName" autocomplete="given-name" required maxlength="100" /></label>
          <label class="account-field">Last name<input v-model="form.lastName" autocomplete="family-name" required maxlength="100" /></label>
        </div>
        <label class="account-field">Professional headline<input v-model="form.headline" maxlength="160" placeholder="e.g. Product designer" /><small>Optional · Your role or the work you’re looking for.</small></label>
        <label class="account-field">Location<input v-model="form.location" maxlength="160" autocomplete="address-level2" placeholder="City, country" /></label>
        <label class="account-field">About you<textarea v-model="form.bio" rows="5" maxlength="2000" placeholder="Tell us about your experience and interests." /><small>{{ form.bio.length }} / 2,000 characters</small></label>
        <p v-if="error" role="alert" class="account-feedback account-error">{{ error }}</p>
        <p v-if="success" role="status" class="account-feedback">{{ success }}</p>
        <div><button type="submit" class="account-primary" :disabled="busy">{{ busy ? 'Saving…' : 'Save changes' }}</button></div>
      </form>
    </div>
  </AccountPageFrame>
</template>
