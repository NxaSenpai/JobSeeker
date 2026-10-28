<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import { scheduleCompanyInterview, type InterviewApplicationStatus, type InterviewType } from '@/services/interviews'

const props = defineProps<{ applicationId: string; jobTitle: string; open: boolean }>()
const emit = defineEmits<{ cancel: []; scheduled: [status: InterviewApplicationStatus] }>()

const scheduledAt = ref('')
const type = ref<InterviewType>('ONSITE')
const place = ref('')
const notes = ref('')
const saving = ref(false)
const error = ref('')
const dialog = ref<HTMLElement | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)
let previouslyFocused: HTMLElement | null = null
let previousBodyOverflow = ''
const dialogTitleId = useId()

const placeLabel = computed(() => type.value === 'ONLINE'
  ? 'Meeting link'
  : type.value === 'PHONE'
    ? 'Call details'
    : 'Where will you meet?')
const placePlaceholder = computed(() => type.value === 'ONLINE'
  ? 'https://meet.example.com/…'
  : type.value === 'PHONE'
    ? 'Who will call and which number?'
    : 'Office, room, or street address')
const placeHint = computed(() => type.value === 'ONLINE'
  ? 'Use a secure HTTPS meeting link.'
  : type.value === 'PHONE'
    ? 'Share the phone number or call instructions.'
    : 'Add a clear address or meeting point.')

function localDateTime(date: Date) {
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return shifted.toISOString().slice(0, 16)
}

const minimumDateTime = computed(() => localDateTime(new Date()))

watch(() => props.open, isOpen => {
  if (isOpen) {
    const defaultTime = new Date(Date.now() + 24 * 60 * 60_000)
    defaultTime.setSeconds(0, 0)
    scheduledAt.value = localDateTime(defaultTime)
    type.value = 'ONSITE'
    place.value = ''
    notes.value = ''
    error.value = ''
    previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onWindowKeydown)
    void nextTick(() => closeButton.value?.focus())
  } else {
    window.removeEventListener('keydown', onWindowKeydown)
    document.body.style.overflow = previousBodyOverflow
    previouslyFocused?.focus()
    previouslyFocused = null
  }
})

function close() {
  if (!saving.value) emit('cancel')
}

function onWindowKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.open && !saving.value) emit('cancel')
}

function trapTab(event: KeyboardEvent) {
  if (event.key !== 'Tab' || !dialog.value) return
  const focusable = dialog.value.querySelectorAll<HTMLElement>(
    'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )
  const first = focusable.item(0)
  const last = focusable.item(focusable.length - 1)
  if (!first || !last) event.preventDefault()
  else if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onWindowKeydown)
  if (props.open) document.body.style.overflow = previousBodyOverflow
})

async function submit() {
  if (!scheduledAt.value) {
    error.value = 'Choose a date and time for the interview.'
    return
  }
  const date = new Date(scheduledAt.value)
  if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) {
    error.value = 'Choose a future date and time.'
    return
  }
  if (!place.value.trim()) {
    error.value = type.value === 'ONLINE' ? 'Add a meeting link.' : 'Add the location or call details.'
    return
  }
  if (type.value === 'ONLINE' && !/^https:\/\//i.test(place.value.trim())) {
    error.value = 'Meeting links must start with https://.'
    return
  }

  saving.value = true
  error.value = ''
  try {
    const result = await scheduleCompanyInterview(props.applicationId, {
      scheduledAt: date.toISOString(),
      type: type.value,
      location: type.value === 'ONLINE' ? null : place.value.trim(),
      meetingUrl: type.value === 'ONLINE' ? place.value.trim() : null,
      notes: notes.value.trim(),
    })
    emit('scheduled', result.interview.applicationStatus)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Unable to schedule the interview.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="interview-modal-backdrop" @click.self="close">
      <section
        ref="dialog"
        class="interview-scheduler"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="dialogTitleId"
        @keydown="trapTab"
      >
        <header class="interview-modal-header">
          <div class="interview-scheduler-heading">
            <span class="interview-scheduler-mark" aria-hidden="true">↗</span>
            <div>
              <span class="interview-eyebrow">Next step</span>
              <h2 :id="dialogTitleId">Schedule an interview</h2>
              <p>Set a time and share the details for {{ jobTitle }}.</p>
            </div>
          </div>
          <button
            ref="closeButton"
            type="button"
            class="interview-modal-close"
            aria-label="Close interview scheduler"
            :disabled="saving"
            @click="close"
          >×</button>
        </header>

        <form class="interview-form" @submit.prevent="submit">
      <label class="interview-field">
        <span>Date and time</span>
        <input v-model="scheduledAt" type="datetime-local" :min="minimumDateTime" required />
        <small>The candidate will see this in their local time zone.</small>
      </label>

      <label class="interview-field">
        <span>Interview format</span>
        <select v-model="type">
          <option value="ONSITE">In person</option>
          <option value="ONLINE">Online</option>
          <option value="PHONE">Phone</option>
        </select>
      </label>

      <label class="interview-field">
        <span>{{ placeLabel }}</span>
        <input v-model="place" type="text" :placeholder="placePlaceholder" :maxlength="type === 'ONLINE' ? 2048 : 500" required />
        <small>{{ placeHint }}</small>
      </label>

      <label class="interview-field">
        <span>Additional details</span>
        <textarea v-model="notes" rows="4" maxlength="5000" placeholder="Who will they meet? What should they prepare? Any arrival instructions?"></textarea>
        <small>These instructions will be visible to the candidate.</small>
      </label>

      <p v-if="error" class="interview-form-error" role="alert">{{ error }}</p>
      <div class="interview-form-actions">
        <button type="button" class="interview-cancel" :disabled="saving" @click="close">Cancel</button>
        <button type="submit" class="interview-submit" :disabled="saving">{{ saving ? 'Scheduling…' : 'Schedule interview' }}</button>
      </div>
        </form>
      </section>
    </div>
  </Teleport>
</template>

<style>
.interview-modal-backdrop { position: fixed; z-index: 1100; inset: 0; padding: 24px; display: grid; place-items: center; overflow-y: auto; background: rgb(11 26 72 / 50%); backdrop-filter: blur(4px); animation: interview-modal-fade 170ms ease-out; }
.interview-scheduler { width: min(100%, 720px); max-height: min(90dvh, 860px); overflow: auto; border: 1px solid #ded8f2; border-radius: 18px; background: linear-gradient(155deg, #fff 0%, #fbfaff 100%); box-shadow: 0 28px 90px rgb(18 28 70 / 27%); color: #172044; animation: interview-modal-rise 200ms ease-out; }
.interview-modal-header { position: sticky; z-index: 2; top: 0; padding: 23px 26px 18px; border-bottom: 1px solid #eeeaf8; display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; background: rgb(255 255 255 / 96%); backdrop-filter: blur(14px); }
.interview-scheduler-heading { display: flex; align-items: flex-start; gap: 13px; }
.interview-modal-close { width: 35px; height: 35px; flex: 0 0 35px; border: 1px solid #e4e0ef; border-radius: 9px; display: grid; place-items: center; background: #fff; color: #687391; font-size: 23px; line-height: 1; cursor: pointer; transition: color 150ms ease, background 150ms ease, border-color 150ms ease; }
.interview-modal-close:hover:not(:disabled) { border-color: #d6cef0; background: #f6f4ff; color: #5946c4; }
.interview-modal-close:focus-visible { outline: 3px solid rgb(123 102 255 / 30%); outline-offset: 2px; }
.interview-modal-close:disabled { opacity: .5; cursor: wait; }
.interview-scheduler-mark { width: 38px; height: 38px; flex: 0 0 38px; border-radius: 11px; display: grid; place-items: center; background: #f0edff; color: #6550d1; font-size: 19px; font-weight: 700; }
.interview-eyebrow { color: #7561d9; font-size: 10px; font-weight: 750; letter-spacing: .1em; text-transform: uppercase; }
.interview-scheduler h2 { margin: 3px 0 0; color: #172044; font-size: 19px; font-weight: 700; letter-spacing: -.025em; }
.interview-scheduler-heading p { margin: 5px 0 0; color: #7a849f; font-size: 12px; line-height: 1.6; }
.interview-form { padding: 20px 26px 24px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; gap: 16px; }
.interview-field:nth-of-type(3), .interview-field:nth-of-type(4), .interview-form-error, .interview-form-actions { grid-column: 1 / -1; }
.interview-field { display: grid; align-content: start; gap: 7px; color: #37466f; font-size: 12px; font-weight: 650; }
.interview-field :is(input, select, textarea) { box-sizing: border-box; width: 100%; min-width: 0; min-height: 52px; padding: 10px 12px; border: 1px solid #ded9ec; border-radius: 8px; outline: none; background: #fff; color: #202b4d; font: inherit; font-size: 13px; font-weight: 450; line-height: 1.25; transition: border-color 150ms ease, box-shadow 150ms ease; }
.interview-field :is(input, select) { height: 52px; }
.interview-field textarea { min-height: 96px; resize: vertical; line-height: 1.6; }
.interview-field :is(input, select, textarea):focus { border-color: #806be7; box-shadow: 0 0 0 3px rgb(123 102 255 / 13%); }
.interview-field :is(input, textarea)::placeholder { color: #a1a7b8; }
.interview-field small { color: #8a91a6; font-size: 10px; font-weight: 450; line-height: 1.5; }
.interview-form-error { margin: -2px 0 0; padding: 10px 12px; border-radius: 7px; background: #fff2f3; color: #a24456; font-size: 12px; line-height: 1.5; }
.interview-form-actions { display: flex; justify-content: flex-end; gap: 9px; padding-top: 2px; }
.interview-form-actions button { min-height: 39px; padding: 0 13px; border-radius: 8px; font-size: 12px; font-weight: 650; cursor: pointer; transition: transform 150ms ease, background 150ms ease, opacity 150ms ease; }
.interview-form-actions button:active { transform: translateY(1px); }
.interview-form-actions button:focus-visible { outline: 3px solid rgb(123 102 255 / 30%); outline-offset: 2px; }
.interview-form-actions button:disabled { opacity: .6; cursor: wait; }
.interview-cancel { border: 1px solid #ded9ec; background: #fff; color: #5d6680; }
.interview-cancel:hover:not(:disabled) { background: #f8f7fc; }
.interview-submit { border: 1px solid #6853d2; background: #705aef; color: #fff; box-shadow: 0 4px 10px rgb(91 71 190 / 18%); }
.interview-submit:hover:not(:disabled) { background: #624cd8; }
@keyframes interview-modal-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes interview-modal-rise { from { opacity: 0; transform: translateY(8px) scale(.99); } to { opacity: 1; transform: translateY(0) scale(1); } }
@media (max-width: 720px) {
  .interview-modal-backdrop { padding: 14px; }
  .interview-scheduler { max-height: 92dvh; border-radius: 15px; }
  .interview-modal-header { padding: 19px 19px 15px; }
  .interview-form { padding: 18px 19px 20px; }
  .interview-form { grid-template-columns: minmax(0, 1fr); }
  .interview-field:nth-of-type(3), .interview-field:nth-of-type(4), .interview-form-error, .interview-form-actions { grid-column: auto; }
}
@media (max-width: 460px) {
  .interview-modal-backdrop { padding: 10px; align-items: end; }
  .interview-scheduler { max-height: 94dvh; border-radius: 15px 15px 10px 10px; }
  .interview-modal-header { padding: 17px 16px 14px; gap: 10px; }
  .interview-form { padding: 16px; }
}
@media (prefers-reduced-motion: reduce) { .interview-modal-backdrop, .interview-scheduler { animation: none; } }
</style>
