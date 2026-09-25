<script setup lang="ts">
import { ref, watch } from "vue";
import AccountPageFrame from "@/components/public/AccountPageFrame.vue";
import {
  listMyReports,
  reportCategoryLabels,
  reportStatusLabels,
  type ReportStatus,
  type UserReport,
} from "@/services/reports";

const reports = ref<UserReport[]>([]);
const status = ref<ReportStatus | "">("");
const page = ref(1);
const total = ref(0);
const loading = ref(true);
const error = ref("");
let requestVersion = 0;

async function loadReports() {
  const request = ++requestVersion;
  loading.value = true;
  error.value = "";
  try {
    const result = await listMyReports(page.value, 20, status.value);
    if (request !== requestVersion) return;
    reports.value = result.reports;
    total.value = result.total;
  } catch (cause) {
    if (request === requestVersion)
      error.value =
        cause instanceof Error
          ? cause.message
          : "Your reports could not be loaded.";
  } finally {
    if (request === requestVersion) loading.value = false;
  }
}

watch(status, () => {
  page.value = 1;
  void loadReports();
});
watch(
  page,
  () => {
    void loadReports();
  },
  { immediate: true },
);

function dateLabel(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
</script>

<template>
  <AccountPageFrame
    title="Your reports"
    description="Follow the review status of concerns you’ve sent to the JobSeeker team."
  >
    <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
      <p class="account-muted">
        {{ total }} {{ total === 1 ? "report" : "reports" }} submitted
      </p>
      <label class="account-field w-full sm:max-w-64"
        >Filter by status
        <select v-model="status">
          <option value="">All statuses</option>
          <option
            v-for="(label, value) in reportStatusLabels"
            :key="value"
            :value="value"
          >
            {{ label }}
          </option>
        </select>
      </label>
    </div>

    <p v-if="loading" role="status" class="account-muted">
      Loading your reports…
    </p>
    <p v-else-if="error" role="alert" class="account-feedback account-error">
      {{ error }}
      <button type="button" class="underline" @click="loadReports">
        Try again
      </button>
    </p>
    <div v-else-if="reports.length" class="grid gap-4">
      <article v-for="report in reports" :key="report.id" class="account-panel">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-lg font-semibold">
                {{ reportCategoryLabels[report.category] }}
              </h2>
              <span
                class="rounded-full px-3 py-1 text-xs font-semibold"
                :class="{
                  'bg-[#fff5df] text-[#8a5b00]': report.status === 'OPEN',
                  'bg-[#efedff] text-[#5742ca]': report.status === 'IN_REVIEW',
                  'bg-[#e9f7ee] text-[#276c48]': report.status === 'RESOLVED',
                  'bg-[#f0f0f2] text-[#5d6374]': report.status === 'DISMISSED',
                }"
                >{{ reportStatusLabels[report.status] }}</span
              >
            </div>
            <p class="mt-2 text-sm text-[#68708c]">
              {{ report.subjectType }} · {{ report.subjectId }}
            </p>
          </div>
          <time class="text-sm text-[#7a8097]" :datetime="report.createdAt"
            >Submitted {{ dateLabel(report.createdAt) }}</time
          >
        </div>
        <p class="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#414961]">
          {{ report.description }}
        </p>
        <div
          v-if="report.resolutionNote"
          class="mt-5 border-t border-[#eeecf2] pt-4"
        >
          <p
            class="text-xs font-semibold uppercase tracking-[0.1em] text-[#6a7190]"
          >
            Review update
          </p>
          <p class="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#414961]">
            {{ report.resolutionNote }}
          </p>
        </div>
      </article>
      <nav
        v-if="total > 20"
        class="flex flex-wrap items-center gap-3"
        aria-label="Report pages"
      >
        <button
          type="button"
          class="account-secondary"
          :disabled="page === 1 || loading"
          @click="page--"
        >
          Previous
        </button>
        <span class="account-muted"
          >Page {{ page }} of {{ Math.ceil(total / 20) }}</span
        >
        <button
          type="button"
          class="account-secondary"
          :disabled="page * 20 >= total || loading"
          @click="page++"
        >
          Next
        </button>
      </nav>
    </div>
    <div v-else class="account-empty">
      <h2>
        {{
          status
            ? `No ${reportStatusLabels[status].toLowerCase()} reports`
            : "No reports yet"
        }}
      </h2>
      <p>
        When you report a genuine concern, you’ll be able to follow its review
        here.
      </p>
      <router-link to="/jobs" class="account-primary">Browse jobs</router-link>
    </div>
  </AccountPageFrame>
</template>
