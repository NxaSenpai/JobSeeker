<script setup lang="ts">
defineProps<{ eyebrow: string; title: string; description: string }>()
</script>

<template>
  <header class="page-heading">
    <div>
      <p>{{ eyebrow }}</p>
      <h1>{{ title }}</h1>
      <span>{{ description }}</span>
    </div>
    <div class="page-heading-actions"><slot name="actions" /></div>
  </header>
</template>

<style scoped>
.page-heading { margin-bottom: 32px; display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; }
.page-heading p { margin: 0 0 8px; color: var(--accent-dark, #6654d8); font-size: 14px; font-weight: 600; letter-spacing: .03em; }
.page-heading h1 { margin: 0; color: var(--ink, #0b2b82); font-size: clamp(28px, 3vw, 38px); font-weight: 600; letter-spacing: -.045em; line-height: 1.08; }
.page-heading span { display: block; max-width: 58ch; margin-top: 9px; color: var(--ink-soft, #62709a); font-size: 16px; line-height: 1.6; }
.page-heading-actions { flex: 0 0 auto; }
@media (max-width: 620px) { .page-heading { align-items: stretch; flex-direction: column; gap: 18px; margin-bottom: 25px; } }
</style>
