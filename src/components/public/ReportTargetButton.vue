<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import { useRoute } from "vue-router";
import { currentUser } from "@/services/auth";
import { ApiRequestError } from "@/services/api";
import {
  reportCategoryLabels,
  submitReport,
  type CreateReportInput,
  type ReportCategory,
  type ReportSubjectType,
} from "@/services/reports";

const props = defineProps<{
  subjectType: ReportSubjectType;
  subjectId: string;
  subjectLabel: string;
}>();

const route = useRoute();
const dialog = ref<HTMLDialogElement>();
const descriptionInput = ref<HTMLTextAreaElement>();
const category = ref<ReportCategory>("SCAM");
const description = ref("");
const pending = ref(false);
const error = ref("");
const submitted = ref(false);
const canSubmit = computed(
  () => description.value.trim().length >= 20 && !pending.value,
);
const categories = Object.entries(reportCategoryLabels) as [
  ReportCategory,
  string,
][];

async function openDialog() {
  if (!currentUser.value) return;
  error.value = "";
  submitted.value = false;
  category.value = "SCAM";
  description.value = "";
  dialog.value?.showModal();
  await nextTick();
  descriptionInput.value?.focus();
}

function closeDialog() {
  if (dialog.value?.open) dialog.value.close();
}

function onBackdropClick(event: MouseEvent) {
  if (event.target === dialog.value) closeDialog();
}

async function sendReport() {
  if (!canSubmit.value) return;
  pending.value = true;
  error.value = "";
  const input: CreateReportInput = {
    subjectType: props.subjectType,
    subjectId: props.subjectId,
    category: category.value,
    description: description.value.trim(),
  };
  try {
    await submitReport(input);
    submitted.value = true;
  } catch (cause) {
    if (cause instanceof ApiRequestError && cause.status === 404) {
      error.value = `This ${props.subjectType.toLowerCase()} is a sample item or is no longer available, so it cannot be reported.`;
    } else {
      error.value =
        cause instanceof Error
          ? cause.message
          : "Your report could not be submitted. Please try again.";
    }
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <template v-if="currentUser?.role === 'USER'">
    <button
      type="button"
      class="inline-flex min-h-10 items-center justify-center rounded-lg border border-current/20 px-4 py-2 text-sm font-semibold text-current transition hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#705aef]"
      @click="openDialog"
    >
      Report
      {{
        subjectType === "JOB"
          ? "this job"
          : subjectType === "COMPANY"
            ? "this company"
            : "this account"
      }}
    </button>
    <dialog
      ref="dialog"
      class="report-dialog w-[min(560px,calc(100vw-28px))] max-w-none rounded-2xl bg-white p-0 text-[#20243a] shadow-2xl"
      aria-labelledby="report-dialog-title"
      @click="onBackdropClick"
    >
      <div class="p-6 sm:p-8">
        <div class="flex items-start justify-between gap-5">
          <div>
            <p
              class="text-xs font-semibold uppercase tracking-[0.14em] text-[#725ed7]"
            >
              Community safety
            </p>
            <h2
              id="report-dialog-title"
              class="mt-2 text-2xl font-semibold tracking-[-0.03em]"
            >
              Report {{ subjectLabel }}
            </h2>
            <p class="mt-2 text-sm leading-6 text-[#68708c]">
              Tell our team what concerns you. Reports are reviewed by an
              administrator.
            </p>
          </div>
          <button
            type="button"
            class="grid size-9 shrink-0 place-items-center rounded-full border border-[#e5e2ee] text-lg text-[#59617b] hover:bg-[#f7f6fb]"
            aria-label="Close report form"
            @click="closeDialog"
          >
            ×
          </button>
        </div>

        <div
          v-if="submitted"
          role="status"
          class="mt-6 rounded-xl border border-[#d5ebdf] bg-[#f1faf4] p-5"
        >
          <p class="font-semibold text-[#246c46]">Report submitted</p>
          <p class="mt-2 text-sm leading-6 text-[#4a7059]">
            Thank you for helping keep JobSeeker safe. You can check the review
            status from your reports page.
          </p>
          <div class="mt-4 flex flex-wrap gap-3">
            <router-link
              to="/reports"
              class="rounded-lg bg-[#276c48] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1f5d3c]"
              @click="closeDialog"
              >View my reports</router-link
            >
            <button
              type="button"
              class="rounded-lg border border-[#cfe2d5] px-4 py-2.5 text-sm font-semibold text-[#276c48]"
              @click="closeDialog"
            >
              Done
            </button>
          </div>
        </div>

        <form v-else class="mt-6 grid gap-5" @submit.prevent="sendReport">
          <p
            v-if="error"
            role="alert"
            class="rounded-lg bg-[#fff1f2] px-4 py-3 text-sm leading-6 text-[#a3384b]"
          >
            {{ error }}
          </p>
          <label class="grid gap-2 text-sm font-semibold" for="report-category">
            Reason for report
            <select
              id="report-category"
              v-model="category"
              class="min-h-12 rounded-lg border border-[#dcd9e7] bg-white px-3.5 font-normal text-[#29304a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#705aef]"
            >
              <option
                v-for="[value, label] in categories"
                :key="value"
                :value="value"
              >
                {{ label }}
              </option>
            </select>
          </label>
          <label
            class="grid gap-2 text-sm font-semibold"
            for="report-description"
          >
            What should our team know?
            <textarea
              id="report-description"
              ref="descriptionInput"
              v-model="description"
              required
              minlength="20"
              maxlength="3000"
              rows="5"
              placeholder="Share specific details that will help us review this report."
              class="resize-y rounded-lg border border-[#dcd9e7] px-3.5 py-3 font-normal leading-6 text-[#29304a] placeholder:text-[#9a9caf] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#705aef]"
            />
            <span class="font-normal text-[#7a8097]"
              >{{ description.trim().length }}/3000 characters · at least 20
              required</span
            >
          </label>
          <p class="text-xs leading-5 text-[#7a8097]">
            Only report genuine concerns. Sample or removed items cannot be
            submitted for review.
          </p>
          <div
            class="flex flex-wrap justify-end gap-3 border-t border-[#eeecf2] pt-5"
          >
            <button
              type="button"
              class="rounded-lg border border-[#ddd9e9] px-4 py-2.5 text-sm font-semibold text-[#555d76] hover:bg-[#f8f7fb]"
              @click="closeDialog"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="rounded-lg bg-[#5742ca] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4632b6] disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="!canSubmit"
            >
              {{ pending ? "Submitting…" : "Submit report" }}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  </template>
  <router-link
    v-else-if="!currentUser"
    :to="{ name: 'AuthPage', query: { redirect: route.fullPath } }"
    class="inline-flex min-h-10 items-center justify-center rounded-lg border border-current/20 px-4 py-2 text-sm font-semibold text-current transition hover:bg-black/5"
  >
    Sign in to report
  </router-link>
</template>

<style scoped>
.report-dialog {
  border: 0;
}
.report-dialog::backdrop {
  background: rgb(18 22 39 / 48%);
  backdrop-filter: blur(3px);
}
</style>
