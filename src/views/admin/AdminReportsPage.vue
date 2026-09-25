<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import BrandLogo from "@/components/landing/BrandLogo.vue";
import {
  dismissAdminReport,
  getAdminReport,
  listAdminReports,
  reportCategoryLabels,
  reportStatusLabels,
  resolveAdminReport,
  startAdminReportReview,
  type AdminReport,
  type ReportCategory,
  type ReportStatus,
  type ReportSubjectType,
} from "@/services/reports";
import {
  clearAuthSession,
  currentUser,
  displayNameForUser,
  initialsForUser,
} from "@/services/auth";

const router = useRouter();
const reports = ref<AdminReport[]>([]);
const total = ref(0);
const page = ref(1);
const limit = 20;
const statusFilter = ref<ReportStatus | "">("");
const subjectTypeFilter = ref<ReportSubjectType | "">("");
const categoryFilter = ref<ReportCategory | "">("");
const searchInput = ref("");
const appliedSearch = ref("");
const loading = ref(true);
const loadError = ref("");
const selectedId = ref("");
const selectedReport = ref<AdminReport | null>(null);
const detailLoading = ref(false);
const detailError = ref("");
const actionError = ref("");
const actionMessage = ref("");
const actionBusy = ref(false);
const decisionNote = ref("");
let listVersion = 0;

const adminName = computed(() =>
  currentUser.value ? displayNameForUser(currentUser.value) : "Administrator",
);
const adminInitials = computed(() =>
  currentUser.value ? initialsForUser(currentUser.value) : "AD",
);
const selectedSubjectTitle = computed(() => {
  const subject = selectedReport.value?.subject;
  if (!subject)
    return selectedReport.value?.subjectId ?? "Item no longer available";
  const title = subject.title ?? subject.name;
  if (typeof title === "string" && title.trim()) return title;
  const fullName = [subject.firstName, subject.lastName]
    .filter(
      (value): value is string =>
        typeof value === "string" && Boolean(value.trim()),
    )
    .join(" ");
  return (
    fullName ||
    (typeof subject.email === "string"
      ? subject.email
      : (selectedReport.value?.subjectId ?? "Reported item"))
  );
});

async function loadQueue() {
  const request = ++listVersion;
  loading.value = true;
  loadError.value = "";
  try {
    const result = await listAdminReports({
      page: page.value,
      limit,
      status: statusFilter.value,
      subjectType: subjectTypeFilter.value,
      category: categoryFilter.value,
      search: appliedSearch.value,
    });
    if (request !== listVersion) return;
    reports.value = result.reports;
    total.value = result.total;
  } catch (cause) {
    if (request === listVersion)
      loadError.value =
        cause instanceof Error
          ? cause.message
          : "The report queue could not be loaded.";
  } finally {
    if (request === listVersion) loading.value = false;
  }
}

watch(
  page,
  () => {
    void loadQueue();
  },
  { immediate: true },
);

async function applyFilters() {
  appliedSearch.value = searchInput.value.trim();
  if (page.value !== 1) page.value = 1;
  else await loadQueue();
}

async function selectReport(report: AdminReport) {
  selectedId.value = report.id;
  selectedReport.value = null;
  detailError.value = "";
  actionError.value = "";
  actionMessage.value = "";
  decisionNote.value = "";
  detailLoading.value = true;
  try {
    const result = await getAdminReport(report.id);
    if (selectedId.value === report.id) selectedReport.value = result.report;
  } catch (cause) {
    if (selectedId.value === report.id)
      detailError.value =
        cause instanceof Error
          ? cause.message
          : "Report details could not be loaded.";
  } finally {
    if (selectedId.value === report.id) detailLoading.value = false;
  }
}

function closeDetails() {
  selectedId.value = "";
  selectedReport.value = null;
  detailError.value = "";
  actionError.value = "";
  actionMessage.value = "";
  decisionNote.value = "";
}

async function startReview() {
  if (!selectedReport.value || actionBusy.value) return;
  actionBusy.value = true;
  actionError.value = "";
  actionMessage.value = "";
  try {
    const result = await startAdminReportReview(selectedReport.value.id);
    selectedReport.value = result.report;
    actionMessage.value = "Review started. The report is now marked in review.";
    await loadQueue();
  } catch (cause) {
    actionError.value =
      cause instanceof Error ? cause.message : "Review could not be started.";
  } finally {
    actionBusy.value = false;
  }
}

async function closeReport(decision: "resolve" | "dismiss") {
  if (!selectedReport.value || actionBusy.value) return;
  const note = decisionNote.value.trim();
  if (note.length < 3) {
    actionError.value =
      "Add a review note of at least 3 characters before closing this report.";
    return;
  }
  actionBusy.value = true;
  actionError.value = "";
  actionMessage.value = "";
  try {
    const result =
      decision === "resolve"
        ? await resolveAdminReport(selectedReport.value.id, note)
        : await dismissAdminReport(selectedReport.value.id, note);
    selectedReport.value = result.report;
    decisionNote.value = "";
    actionMessage.value =
      decision === "resolve"
        ? "Report resolved and recorded in the audit log."
        : "Report dismissed and recorded in the audit log.";
    await loadQueue();
  } catch (cause) {
    actionError.value =
      cause instanceof Error
        ? cause.message
        : "The report decision could not be saved.";
  } finally {
    actionBusy.value = false;
  }
}

function subjectFacts(report: AdminReport) {
  const subject = report.subject;
  if (!subject) return [];
  const fields: [string, unknown][] =
    report.subjectType === "JOB"
      ? [
          ["Company", subject.company],
          ["Location", subject.location],
          ["Listing status", subject.status],
          ["Moderation", subject.moderationStatus],
        ]
      : report.subjectType === "COMPANY"
        ? [
            ["Industry", subject.industry],
            ["Location", subject.location],
            ["Website", subject.website],
            ["Verified", subject.isVerified],
          ]
        : [
            ["Role", subject.role],
            ["Email verified", subject.emailVerified],
            ["Joined", subject.createdAt],
          ];
  return fields.filter(
    ([, value]) => value !== null && value !== undefined && value !== "",
  );
}

function dateLabel(value: string) {
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function signOut() {
  clearAuthSession();
  void router.replace({ name: "AuthPage" });
}
</script>

<template>
  <div class="min-h-screen bg-[#f7f7f7] text-[#171717]">
    <header class="border-b border-[#e3e3e3] bg-[#fbfaf7]">
      <div
        class="mx-auto flex max-w-[1440px] items-center gap-6 px-6 py-5 sm:px-10 lg:px-12"
      >
        <BrandLogo variant="dark" />
        <span
          class="hidden border-l border-[#d8d8d4] pl-6 text-xs font-semibold uppercase tracking-[0.16em] text-[#888] sm:inline"
          >Admin console</span
        >
        <div class="ml-auto flex items-center gap-3">
          <router-link
            to="/admin"
            class="hidden text-sm font-semibold text-[#555] hover:text-black sm:inline"
            >Dashboard</router-link
          >
          <span
            class="grid size-9 place-items-center rounded-full bg-[#e5e5e5] text-xs font-semibold text-[#333]"
            >{{ adminInitials }}</span
          >
          <span class="hidden text-sm font-semibold text-[#333] sm:inline">{{
            adminName
          }}</span>
          <button
            type="button"
            class="rounded-lg border border-[#cfcfcb] px-3 py-2 text-xs font-semibold text-[#444] transition hover:bg-white"
            @click="signOut"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
      <div
        class="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"
      >
        <div>
          <router-link
            to="/admin"
            class="text-sm font-semibold text-[#696969] hover:text-black"
            >← Admin overview</router-link
          >
          <p
            class="mt-7 text-xs font-semibold uppercase tracking-[0.16em] text-[#777]"
          >
            Trust &amp; safety
          </p>
          <h1 class="mt-2 text-4xl font-semibold tracking-[-0.05em]">
            Report review
          </h1>
          <p class="mt-3 max-w-2xl text-sm leading-6 text-[#777]">
            Review user-submitted concerns, record a decision, and use
            moderation tools only when the evidence supports it.
          </p>
        </div>
        <div class="border border-[#dededb] bg-white px-5 py-4 sm:min-w-44">
          <p class="text-xs uppercase tracking-[0.12em] text-[#777]">
            Matching reports
          </p>
          <p class="mt-2 text-3xl font-semibold tracking-[-0.04em]">
            {{ total }}
          </p>
        </div>
      </div>

      <form
        class="mb-6 grid gap-3 border border-[#e1e1de] bg-white p-4 sm:grid-cols-2 lg:grid-cols-[minmax(200px,1fr)_170px_190px_180px_auto] lg:items-end"
        @submit.prevent="applyFilters"
      >
        <label class="grid gap-1.5 text-xs font-semibold text-[#555]"
          >Search
          <input
            v-model="searchInput"
            maxlength="120"
            placeholder="Description, target ID, category"
            class="min-h-11 rounded-md border border-[#d8d8d4] px-3 text-sm font-normal text-[#222] focus-visible:outline-2 focus-visible:outline-[#393939]"
          />
        </label>
        <label class="grid gap-1.5 text-xs font-semibold text-[#555]"
          >Status
          <select
            v-model="statusFilter"
            class="min-h-11 rounded-md border border-[#d8d8d4] bg-white px-3 text-sm font-normal text-[#222]"
          >
            <option value="">Open + in review</option>
            <option
              v-for="(label, value) in reportStatusLabels"
              :key="value"
              :value="value"
            >
              {{ label }}
            </option>
          </select>
        </label>
        <label class="grid gap-1.5 text-xs font-semibold text-[#555]"
          >Reported item
          <select
            v-model="subjectTypeFilter"
            class="min-h-11 rounded-md border border-[#d8d8d4] bg-white px-3 text-sm font-normal text-[#222]"
          >
            <option value="">All item types</option>
            <option value="JOB">Job</option>
            <option value="COMPANY">Company</option>
            <option value="USER">Account</option>
          </select>
        </label>
        <label class="grid gap-1.5 text-xs font-semibold text-[#555]"
          >Reason
          <select
            v-model="categoryFilter"
            class="min-h-11 rounded-md border border-[#d8d8d4] bg-white px-3 text-sm font-normal text-[#222]"
          >
            <option value="">All reasons</option>
            <option
              v-for="(label, value) in reportCategoryLabels"
              :key="value"
              :value="value"
            >
              {{ label }}
            </option>
          </select>
        </label>
        <button
          type="submit"
          class="min-h-11 rounded-md bg-[#222] px-5 text-sm font-semibold text-white transition hover:bg-black"
        >
          Apply filters
        </button>
      </form>

      <div
        v-if="loadError"
        role="alert"
        class="mb-5 border border-[#f0c9ce] bg-[#fff1f2] p-4 text-sm text-[#963448]"
      >
        {{ loadError }}
        <button type="button" class="ml-2 underline" @click="loadQueue">
          Try again
        </button>
      </div>

      <div
        class="grid items-start gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]"
      >
        <section
          class="border border-[#e1e1de] bg-white"
          aria-labelledby="queue-heading"
        >
          <div
            class="flex items-center justify-between gap-4 border-b border-[#e9e9e6] px-5 py-4"
          >
            <div>
              <p class="text-xs uppercase tracking-[0.13em] text-[#888]">
                Admin queue
              </p>
              <h2 id="queue-heading" class="mt-1 text-lg font-semibold">
                {{
                  statusFilter
                    ? reportStatusLabels[statusFilter]
                    : "Needs attention"
                }}
              </h2>
            </div>
            <span class="text-sm text-[#777]">Page {{ page }}</span>
          </div>
          <p v-if="loading" role="status" class="px-5 py-8 text-sm text-[#777]">
            Loading reports…
          </p>
          <div v-else-if="reports.length" class="divide-y divide-[#ededeb]">
            <button
              v-for="report in reports"
              :key="report.id"
              type="button"
              class="block w-full px-5 py-5 text-left transition hover:bg-[#fafaf8] focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#333]"
              :class="{ 'bg-[#f4f4f1]': selectedId === report.id }"
              :aria-label="`Review report about ${report.subject?.title ?? report.subject?.name ?? report.subjectId}`"
              :aria-pressed="selectedId === report.id"
              @click="selectReport(report)"
            >
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span
                    class="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#737373]"
                    >{{ report.subjectType }} ·
                    {{ reportCategoryLabels[report.category] }}</span
                  >
                  <h3 class="mt-2 text-base font-semibold">
                    {{
                      report.subject?.title ??
                      report.subject?.name ??
                      report.subject?.email ??
                      report.subjectId
                    }}
                  </h3>
                </div>
                <span
                  class="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  :class="
                    report.status === 'OPEN'
                      ? 'bg-[#fff1d6] text-[#855a07]'
                      : 'bg-[#efedff] text-[#5742ca]'
                  "
                  >{{ reportStatusLabels[report.status] }}</span
                >
              </div>
              <p class="mt-3 line-clamp-2 text-sm leading-6 text-[#626262]">
                {{ report.description }}
              </p>
              <div
                class="mt-4 flex flex-wrap justify-between gap-2 text-xs text-[#888]"
              >
                <span>{{
                  report.reporter?.email ?? "Reporter unavailable"
                }}</span
                ><time :datetime="report.createdAt">{{
                  dateLabel(report.createdAt)
                }}</time>
              </div>
            </button>
          </div>
          <div
            v-else-if="!loading && !loadError"
            class="px-5 py-12 text-center"
          >
            <h3 class="font-semibold">No reports match this view</h3>
            <p class="mt-2 text-sm leading-6 text-[#777]">
              New user reports will appear here for review.
            </p>
          </div>
          <nav
            v-if="total > limit"
            class="flex items-center justify-between border-t border-[#e9e9e6] px-5 py-4"
            aria-label="Report queue pages"
          >
            <button
              type="button"
              class="rounded-md border border-[#d7d7d2] px-3 py-2 text-sm font-semibold disabled:opacity-40"
              :disabled="page === 1 || loading"
              @click="page--"
            >
              Previous
            </button>
            <span class="text-sm text-[#777]"
              >{{ page }} / {{ Math.ceil(total / limit) }}</span
            >
            <button
              type="button"
              class="rounded-md border border-[#d7d7d2] px-3 py-2 text-sm font-semibold disabled:opacity-40"
              :disabled="page * limit >= total || loading"
              @click="page++"
            >
              Next
            </button>
          </nav>
        </section>

        <section
          class="min-h-[420px] border border-[#e1e1de] bg-white"
          aria-labelledby="report-detail-heading"
        >
          <template v-if="selectedId">
            <div
              class="flex items-start justify-between gap-4 border-b border-[#e9e9e6] px-5 py-4 sm:px-7"
            >
              <div>
                <p class="text-xs uppercase tracking-[0.13em] text-[#888]">
                  Report details
                </p>
                <h2
                  id="report-detail-heading"
                  class="mt-1 text-lg font-semibold"
                >
                  {{ selectedReport ? selectedSubjectTitle : "Loading report" }}
                </h2>
              </div>
              <button
                type="button"
                class="rounded-md border border-[#d7d7d2] px-3 py-2 text-xs font-semibold text-[#555] hover:bg-[#f4f4f2]"
                @click="closeDetails"
              >
                Close
              </button>
            </div>
            <p
              v-if="detailLoading"
              role="status"
              class="px-5 py-8 text-sm text-[#777]"
            >
              Loading report details…
            </p>
            <p
              v-else-if="detailError"
              role="alert"
              class="m-5 rounded-lg bg-[#fff1f2] p-4 text-sm text-[#963448]"
            >
              {{ detailError }}
            </p>
            <div v-else-if="selectedReport" class="space-y-6 p-5 sm:p-7">
              <div class="flex flex-wrap items-center gap-2">
                <span
                  class="rounded-full bg-[#f0f0ed] px-3 py-1 text-xs font-semibold text-[#555]"
                  >{{ selectedReport.subjectType }}</span
                >
                <span
                  class="rounded-full bg-[#f0f0ed] px-3 py-1 text-xs font-semibold text-[#555]"
                  >{{ reportCategoryLabels[selectedReport.category] }}</span
                >
                <span
                  class="rounded-full px-3 py-1 text-xs font-semibold"
                  :class="
                    selectedReport.status === 'OPEN'
                      ? 'bg-[#fff1d6] text-[#855a07]'
                      : selectedReport.status === 'IN_REVIEW'
                        ? 'bg-[#efedff] text-[#5742ca]'
                        : 'bg-[#e9f7ee] text-[#276c48]'
                  "
                  >{{ reportStatusLabels[selectedReport.status] }}</span
                >
              </div>

              <div
                class="grid gap-4 border-y border-[#ededeb] py-4 text-sm sm:grid-cols-2"
              >
                <div>
                  <p class="text-xs uppercase tracking-[0.1em] text-[#888]">
                    Reported item
                  </p>
                  <p class="mt-1 break-words font-semibold">
                    {{ selectedSubjectTitle }}
                  </p>
                  <p class="mt-1 break-all text-xs text-[#777]">
                    {{ selectedReport.subjectType }} ·
                    {{ selectedReport.subjectId }}
                  </p>
                </div>
                <div>
                  <p class="text-xs uppercase tracking-[0.1em] text-[#888]">
                    Submitted by
                  </p>
                  <p class="mt-1 font-semibold">
                    {{
                      selectedReport.reporter?.email ?? "Reporter unavailable"
                    }}
                  </p>
                  <p class="mt-1 text-xs text-[#777]">
                    {{ selectedReport.reporter?.role ?? "Unknown role" }} ·
                    {{ dateLabel(selectedReport.createdAt) }}
                  </p>
                </div>
              </div>

              <dl
                v-if="subjectFacts(selectedReport).length"
                class="grid gap-x-6 gap-y-3 rounded-lg bg-[#f7f7f5] p-4 sm:grid-cols-2"
              >
                <div
                  v-for="[label, value] in subjectFacts(selectedReport)"
                  :key="label"
                  class="min-w-0"
                >
                  <dt
                    class="text-[11px] uppercase tracking-[0.1em] text-[#888]"
                  >
                    {{ label }}
                  </dt>
                  <dd class="mt-1 break-words text-sm font-medium text-[#444]">
                    {{ value }}
                  </dd>
                </div>
              </dl>

              <div>
                <h3
                  class="text-xs font-semibold uppercase tracking-[0.12em] text-[#777]"
                >
                  Reporter’s explanation
                </h3>
                <p
                  class="mt-3 whitespace-pre-wrap break-words rounded-lg border border-[#e6e6e3] bg-white p-4 text-sm leading-7 text-[#3e3e3e]"
                >
                  {{ selectedReport.description }}
                </p>
              </div>

              <div
                v-if="selectedReport.resolutionNote"
                class="rounded-lg border border-[#e4e4df] bg-[#f8f8f6] p-4"
              >
                <p
                  class="text-xs font-semibold uppercase tracking-[0.1em] text-[#777]"
                >
                  Decision note
                </p>
                <p
                  class="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#444]"
                >
                  {{ selectedReport.resolutionNote }}
                </p>
                <p
                  v-if="selectedReport.reviewedBy"
                  class="mt-3 text-xs text-[#777]"
                >
                  Reviewed by {{ selectedReport.reviewedBy.email
                  }}<span v-if="selectedReport.reviewedAt">
                    · {{ dateLabel(selectedReport.reviewedAt) }}</span
                  >
                </p>
              </div>

              <p
                v-if="actionError"
                role="alert"
                class="rounded-lg bg-[#fff1f2] px-4 py-3 text-sm text-[#963448]"
              >
                {{ actionError }}
              </p>
              <p
                v-if="actionMessage"
                role="status"
                class="rounded-lg bg-[#edf7f0] px-4 py-3 text-sm text-[#276c48]"
              >
                {{ actionMessage }}
              </p>

              <div
                v-if="
                  selectedReport.status === 'OPEN' ||
                  selectedReport.status === 'IN_REVIEW'
                "
                class="space-y-4 border-t border-[#ededeb] pt-5"
              >
                <button
                  v-if="selectedReport.status === 'OPEN'"
                  type="button"
                  class="rounded-md border border-[#c9c9c3] px-4 py-2.5 text-sm font-semibold text-[#333] transition hover:bg-[#f4f4f2] disabled:opacity-50"
                  :disabled="actionBusy"
                  @click="startReview"
                >
                  {{ actionBusy ? "Saving…" : "Start review" }}
                </button>
                <label
                  class="grid gap-2 text-sm font-semibold text-[#444]"
                  for="decision-note"
                  >Decision note
                  <span class="font-normal text-[#777]"
                    >Required when resolving or dismissing (3–500
                    characters)</span
                  >
                  <textarea
                    id="decision-note"
                    v-model="decisionNote"
                    minlength="3"
                    maxlength="500"
                    rows="3"
                    class="resize-y rounded-md border border-[#d8d8d4] px-3 py-2.5 font-normal leading-6 focus-visible:outline-2 focus-visible:outline-[#333]"
                    placeholder="Summarize what you reviewed and why you reached this decision."
                  />
                </label>
                <div class="flex flex-wrap gap-3">
                  <button
                    type="button"
                    class="rounded-md bg-[#245f40] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1c5035] disabled:cursor-not-allowed disabled:opacity-50"
                    :disabled="actionBusy || decisionNote.trim().length < 3"
                    @click="closeReport('resolve')"
                  >
                    {{ actionBusy ? "Saving…" : "Resolve report" }}
                  </button>
                  <button
                    type="button"
                    class="rounded-md border border-[#c9c9c3] px-4 py-2.5 text-sm font-semibold text-[#555] transition hover:bg-[#f4f4f2] disabled:cursor-not-allowed disabled:opacity-50"
                    :disabled="actionBusy || decisionNote.trim().length < 3"
                    @click="closeReport('dismiss')"
                  >
                    Dismiss report
                  </button>
                </div>
                <p class="text-xs leading-5 text-[#777]">
                  Closing this report records the review outcome. Hide a job or
                  suspend an account separately only when the evidence warrants
                  enforcement.
                </p>
              </div>
            </div>
          </template>
          <div
            v-else
            class="grid min-h-[420px] place-content-center justify-items-center px-8 text-center"
          >
            <div
              class="grid size-12 place-items-center rounded-full bg-[#ededeb] text-xl text-[#555]"
              aria-hidden="true"
            >
              ↗
            </div>
            <h2 id="report-detail-heading" class="mt-4 text-lg font-semibold">
              Select a report to review
            </h2>
            <p class="mt-2 max-w-sm text-sm leading-6 text-[#777]">
              The full description and a safe summary of the reported item will
              appear here.
            </p>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>
