<script setup lang="ts">
import { ref } from 'vue'
import CompanyPageHeader from '@/components/company/CompanyPageHeader.vue'
import UiIcon from '@/components/company/UiIcon.vue'
import { displayNameForUser, getAuthSession } from '@/services/auth'

const supportAddress = 'nxasenpai@jobseeker.example'
const user = getAuthSession()?.user
const name = ref(user ? displayNameForUser(user) : '')
const email = ref(user?.email ?? '')
const subject = ref('')
const message = ref('')

function openEmailDraft() {
  const body = `Name: ${name.value}\nEmail: ${email.value}\nTopic: ${subject.value}\n\n${message.value}`
  const params = new URLSearchParams({
    subject: `[Company workspace] ${subject.value}`,
    body,
  })
  window.location.href = `mailto:${supportAddress}?${params.toString()}`
}
</script>

<template>
  <div class="company-page contact-page">
    <CompanyPageHeader
      eyebrow="Account / Contact"
      title="Contact the developer"
      description="Send a note about your company workspace. We’ll prepare it in your email app."
    />

    <section class="contact-card" aria-labelledby="contact-form-title">
      <div class="contact-card-heading">
        <span class="contact-icon"><UiIcon name="mail" :size="22" /></span>
        <div>
          <p>Direct support</p>
          <h2 id="contact-form-title">What do you need help with?</h2>
        </div>
      </div>

      <form class="contact-form" @submit.prevent="openEmailDraft">
        <div class="contact-fields">
          <label>
            Your name
            <input v-model="name" type="text" autocomplete="name" required />
          </label>
          <label>
            Email address
            <input v-model="email" type="email" autocomplete="email" required />
          </label>
          <label class="field-wide">
            Topic
            <select v-model="subject" required>
              <option disabled value="">Choose a topic</option>
              <option>Company profile</option>
              <option>Jobs and applicants</option>
              <option>Something is not working</option>
              <option>Other</option>
            </select>
          </label>
          <label class="field-wide">
            Message
            <textarea v-model="message" rows="6" required placeholder="Describe what you need help with." />
          </label>
        </div>

        <div class="contact-form-footer">
          <p>Your email app will open a draft addressed to <strong>{{ supportAddress }}</strong>. Review it, then press Send.</p>
          <button class="send-button" type="submit"><UiIcon name="mail" :size="17" /> Open email draft</button>
        </div>
      </form>
    </section>
  </div>
</template>

<style scoped>
.company-page { color: var(--ink); }
.contact-card { max-width: 1000px; padding: 30px; border: 1px solid var(--line); border-radius: 12px; background: #fff; box-shadow: 0 8px 24px rgb(11 43 130 / 5%); }
.contact-card-heading { padding-bottom: 22px; border-bottom: 1px solid var(--line); display: flex; align-items: center; gap: 15px; }
.contact-icon { width: 48px; height: 48px; flex: 0 0 48px; border-radius: 11px; display: grid; place-items: center; background: var(--accent-soft); color: var(--accent-dark); }
.contact-card-heading p { margin: 0 0 4px; color: var(--accent-dark); font-size: 13px; font-weight: 600; }
.contact-card-heading h2 { margin: 0; color: var(--ink); font-size: 23px; font-weight: 600; letter-spacing: -.025em; }
.contact-form { padding-top: 24px; }
.contact-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 20px 22px; }
.contact-fields label { min-width: 0; display: grid; gap: 8px; color: var(--ink-soft); font-size: 14px; font-weight: 600; }
.contact-fields .field-wide { grid-column: 1 / -1; }
.contact-fields input, .contact-fields select, .contact-fields textarea { width: 100%; min-height: 48px; padding: 11px 13px; border: 1px solid #dcd7f1; border-radius: 8px; background: #fff; color: var(--ink); font: inherit; font-size: 15px; font-weight: 400; outline: 0; }
.contact-fields textarea { min-height: 170px; resize: vertical; line-height: 1.6; }
.contact-fields textarea::placeholder { color: #8994b6; }
.contact-fields :is(input, select, textarea):focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgb(123 102 255 / 12%); }
.contact-form-footer { margin-top: 23px; display: flex; align-items: center; justify-content: space-between; gap: 24px; }
.contact-form-footer p { max-width: 58ch; margin: 0; color: var(--muted); font-size: 13px; line-height: 1.6; }
.contact-form-footer strong { color: var(--ink-soft); font-weight: 600; }
.send-button { min-height: 46px; padding: 0 17px; border: 0; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; gap: 9px; background: var(--accent); color: #fff; font-size: 14px; font-weight: 600; white-space: nowrap; cursor: pointer; transition: background 160ms ease, transform 160ms ease; }
.send-button:hover { background: #6f5cf9; transform: translateY(-1px); }
@media (max-width: 620px) {
  .contact-card { padding: 21px 17px; }
  .contact-card-heading h2 { font-size: 20px; }
  .contact-fields { grid-template-columns: 1fr; gap: 16px; }
  .contact-fields .field-wide { grid-column: auto; }
  .contact-form-footer { align-items: stretch; flex-direction: column; gap: 16px; }
  .send-button { width: 100%; }
}
</style>
