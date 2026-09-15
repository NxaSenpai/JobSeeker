<script setup lang="ts">
import logoIcon from '@/assets/img/logo-transparent.png'
import logoWordmark from '@/assets/img/jobseeker_logo-transparent.png'

withDefaults(
  defineProps<{
    variant?: 'light' | 'dark'
    iconOnly?: boolean
    inverted?: boolean
  }>(),
  { variant: 'light', iconOnly: false, inverted: false },
)
</script>

<template>
  <router-link
    to="/"
    class="brand-logo inline-flex items-center"
    :class="[
      iconOnly ? 'brand-logo--icon' : 'brand-logo--wordmark',
      variant === 'dark' ? 'brand-logo--dark' : 'brand-logo--light',
      inverted ? 'brand-logo--inverted' : '',
    ]"
    aria-label="JobSeeker home"
  >
    <img
      :src="iconOnly ? logoIcon : logoWordmark"
      :alt="iconOnly ? '' : 'JobSeeker'"
    />
  </router-link>
</template>

<style scoped>
.brand-logo { flex: 0 0 auto; }
.brand-logo img { display: block; width: auto; object-fit: contain; }
.brand-logo--wordmark img { height: 34px; }
.brand-logo--icon img { width: 38px; height: 38px; }

.brand-logo--inverted img { filter: brightness(0) invert(1); }

@media (max-width: 639px) {
  .brand-logo--wordmark img { height: 29px; }
  .brand-logo--icon img { width: 34px; height: 34px; }
}
</style>
