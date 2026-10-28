<script setup lang="ts">
import { ref, useId } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: string
  label: string
  placeholder: string
  autocomplete: 'current-password' | 'new-password'
  validationStatus?: 'match' | 'mismatch' | null
}>(), { validationStatus: null })

defineEmits<{
  'update:modelValue': [value: string]
}>()

const isVisible = ref(false)
const inputId = useId()
const feedbackId = `${inputId}-feedback`
</script>

<template>
  <div class="block text-sm font-medium text-[#34457d]">
    <label :for="inputId">{{ label }}</label>
    <div class="relative mt-2">
      <input
        :id="inputId"
        :value="modelValue"
        required
        :type="isVisible ? 'text' : 'password'"
        :autocomplete="autocomplete"
        :placeholder="placeholder"
        :aria-invalid="props.validationStatus === 'mismatch' ? 'true' : undefined"
        :aria-describedby="props.validationStatus ? feedbackId : undefined"
        :class="[
          'w-full rounded-xl border px-4 py-3 pr-12 text-[#0b2b82] outline-none placeholder:text-[#a1aac2] transition focus:ring-4',
          props.validationStatus === 'match'
            ? 'border-[#63a886] focus:border-[#4e9873] focus:ring-[#63a886]/10'
            : props.validationStatus === 'mismatch'
              ? 'border-[#d77b88] focus:border-[#c75e70] focus:ring-[#d77b88]/10'
              : 'border-[#e2def0] focus:border-[#7b66ff] focus:ring-[#7b66ff]/10',
        ]"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
      <button type="button" class=" cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#8d98b7] transition hover:bg-[#f5f3ff] hover:text-[#705be0]" :aria-label="isVisible ? 'Hide password' : 'Show password'" @click="isVisible = !isVisible">
        <svg v-if="!isVisible" class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
        <svg v-else class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="m3 3 18 18M10.584 10.587a2 2 0 002.828 2.828M9.88 4.11A9.953 9.953 0 0112 4c4.478 0 8.268 2.943 9.543 7a9.97 9.97 0 01-4.132 5.411M6.61 6.61A9.953 9.953 0 002.458 12C3.732 16.057 7.523 19 12 19c.87 0 1.714-.111 2.52-.32" /></svg>
      </button>
    </div>
    <p
      v-if="props.validationStatus"
      :id="feedbackId"
      class="mt-2 flex items-center gap-1.5 text-xs font-medium"
      :class="props.validationStatus === 'match' ? 'text-[#39815f]' : 'text-[#b14859]'"
      role="status"
      aria-live="polite"
    >
      <svg v-if="props.validationStatus === 'match'" class="size-4 shrink-0" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.5"/><path d="m6 10.2 2.5 2.4 5.5-5.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <svg v-else class="size-4 shrink-0" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.5"/><path d="m7 7 6 6m0-6-6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
      {{ props.validationStatus === 'match' ? 'Passwords match.' : 'Passwords do not match.' }}
    </p>
  </div>
</template>
