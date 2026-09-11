<script setup lang="ts">
import { computed } from 'vue'

type IconDefinition = {
  paths: string[]
  strokeWidth?: number
}

const props = withDefaults(
  defineProps<{
    name: string
    size?: number | string
    label?: string
  }>(),
  { size: 20, label: undefined },
)

const icons = {
  grid: { paths: ['M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z'] },
  briefcase: {
    paths: [
      'M4 7.5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1Z',
      'M8 7.5V5.8A1.8 1.8 0 0 1 9.8 4h4.4A1.8 1.8 0 0 1 16 5.8v1.7M3 12.5h18M10 12.5v1.2h4v-1.2',
    ],
  },
  users: {
    paths: [
      'M16 20v-1.6a3.6 3.6 0 0 0-3.6-3.6H7.6A3.6 3.6 0 0 0 4 18.4V20',
      'M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM16 4.3a3.4 3.4 0 0 1 0 6.6M20 20v-1.5a3.6 3.6 0 0 0-2.7-3.5',
    ],
  },
  building: { paths: ['M4 20V5.5L12 3l8 2.5V20M8 8h1M8 12h1M8 16h1M15 8h1M15 12h1M15 16h1M3 20h18M10 20v-3h4v3'] },
  chart: { paths: ['M4 19V5M4 19h17M8 16v-4M12 16V8M16 16v-7M20 16v-5'] },
  settings: { paths: ['m9.6 4.4.5-1.3h3.8l.5 1.3 1.3.5 1.3-.5 2.7 2.7-.5 1.3.5 1.3 1.3.5v3.8l-1.3.5-.5 1.3.5 1.3-2.7 2.7-1.3-.5-1.3.5-.5 1.3h-3.8l-.5-1.3-1.3-.5-1.3.5-2.7-2.7.5-1.3-.5-1.3-1.3-.5V10l1.3-.5.5-1.3-.5-1.3 2.7-2.7 1.3.5 1.3-.3ZM12 15.4a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8Z'] },
  help: { paths: ['M9.1 9a3 3 0 1 1 5.4 1.8c-.9 1.2-2.5 1.5-2.5 3.2M12 17.5h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z'] },
  search: { paths: ['m20 20-4.4-4.4M10.8 17a6.2 6.2 0 1 0 0-12.4 6.2 6.2 0 0 0 0 12.4Z'] },
  bell: { paths: ['M18 9a6 6 0 0 0-12 0c0 7-3 7-3 8.5h18C21 16 18 16 18 9ZM10 21h4'] },
  plus: { paths: ['M12 5v14M5 12h14'] },
  'arrow-up': { paths: ['m5 12 4-4 3 3 6-6M14 5h4v4'] },
  'arrow-down': { paths: ['m5 12 4 4 3-3 6 6M14 19h4v-4'] },
  clock: { paths: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2'] },
  dots: { paths: ['M5 12h.01M12 12h.01M19 12h.01'], strokeWidth: 2.8 },
  chevron: { paths: ['m9 18 6-6-6-6'] },
  download: { paths: ['M12 3v12m0 0 4-4m-4 4-4-4M5 20h14'] },
  close: { paths: ['m6 6 12 12M18 6 6 18'] },
  menu: { paths: ['M4 7h16M4 12h16M4 17h16'] },
} satisfies Record<string, IconDefinition>

const icon = computed<IconDefinition>(() => icons[props.name as keyof typeof icons] ?? icons.help)
</script>

<template>
  <svg
    class="ui-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="icon.strokeWidth ?? 1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    :role="label ? 'img' : undefined"
    :aria-label="label"
    :aria-hidden="label ? undefined : true"
    focusable="false"
  >
    <path v-for="path in icon.paths" :key="path" :d="path" />
  </svg>
</template>

<style scoped>
.ui-icon {
  display: inline-block;
  flex-shrink: 0;
  vertical-align: middle;
}
</style>
