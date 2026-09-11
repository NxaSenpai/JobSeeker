<script setup lang="ts">
defineProps<{ title: string; description: string }>()
const tabs = [{ to: '/profile', label: 'Profile' }, { to: '/saved-jobs', label: 'Saved jobs' }, { to: '/applications', label: 'Application drafts' }]
</script>
<template>
  <section class="account-page">
    <router-link to="/jobs" class="back-link">← Explore jobs</router-link>
    <h1>{{ title }}</h1>
    <p class="account-description">{{ description }}</p>
    <nav class="account-tabs" aria-label="Your account pages">
      <router-link v-for="tab in tabs" :key="tab.to" :to="tab.to">{{ tab.label }}</router-link>
    </nav>
    <slot />
  </section>
</template>
<style>
.account-page { max-width: 1224px; min-height: 65vh; margin: 0 auto; padding: 44px 24px 80px; color: #0b2b82; }
.back-link { display: inline-block; margin-bottom: 24px; font-size: 14px; color: #6b58d4; }
.account-page h1 { font-size: clamp(32px, 5vw, 48px); font-weight: 600; letter-spacing: -.04em; line-height: 1.2; }
.account-description { max-width: 650px; margin-top: 14px; color: #62709a; line-height: 1.8; }
.account-tabs { display: flex; gap: 28px; margin: 30px 0; border-bottom: 1px solid #e6e1fa; overflow-x: auto; }
.account-tabs a { padding: 14px 0; white-space: nowrap; font-size: 14px; font-weight: 500; color: #68759d; border-bottom: 2px solid transparent; }
.account-tabs a.router-link-exact-active { color: #6b58d4; border-color: #7b66ff; }
.account-panel { padding: clamp(20px, 4vw, 36px); border: 1px solid #e6e1fa; border-radius: 16px; background: #fff; }
.account-panel h2 { font-size: 22px; font-weight: 600; letter-spacing: -.02em; }
.account-muted { color: #68759d; font-size: 14px; line-height: 1.8; }
.account-empty { padding: 64px 24px; text-align: center; background: #faf9ff; border: 1px dashed #d8d1f2; border-radius: 16px; }
.account-empty h2 { font-size: 24px; font-weight: 600; }
.account-empty p { max-width: 450px; margin: 12px auto 24px; color: #68759d; line-height: 1.8; }
.account-primary, .account-secondary { display: inline-flex; justify-content: center; align-items: center; gap: 8px; min-height: 44px; padding: 12px 22px; border-radius: 9px; font-size: 14px; font-weight: 600; cursor: pointer; }
.account-primary { background: #705aef; color: #fff; }
.account-primary:hover { background: #624cd8; }
.account-secondary { border: 1px solid #dcd5f4; color: #6b58d4; background: white; }
.account-primary:disabled, .account-secondary:disabled { opacity: .55; cursor: wait; }
.account-page :is(button, a, input, textarea):focus-visible { outline: 2px solid #7b66ff; outline-offset: 3px; }
.account-form { display: grid; gap: 24px; }
.account-field { display: grid; gap: 8px; color: #314178; font-size: 14px; font-weight: 500; }
.account-field input, .account-field textarea { width: 100%; min-height: 46px; padding: 12px 14px; border: 1px solid #dcd5f4; border-radius: 8px; color: #263869; font-weight: 400; background: #fff; }
.account-field textarea { resize: vertical; }
.account-field small { font-size: 12px; color: #7a85a5; font-weight: 400; }
.account-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.account-feedback { padding: 12px 16px; border-radius: 8px; font-size: 14px; line-height: 1.7; background: #eff8f4; color: #276951; }
.account-error { background: #fff3f5; color: #a33f55; }
.account-notice { padding: 16px 20px; border: 1px solid #e2dcfb; border-radius: 10px; background: #f7f5ff; font-size: 14px; line-height: 1.8; color: #5c5787; }
@media(max-width: 600px) { .account-form-row { grid-template-columns: 1fr; } .account-page { padding-top: 32px; } .account-tabs { gap: 22px; } }
</style>
