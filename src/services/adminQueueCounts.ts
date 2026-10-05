import { computed, readonly, ref } from "vue";
import { io, type Socket } from "socket.io-client";
import { apiRequest } from "@/services/api";
import { getAuthSession } from "@/services/auth";

type QueueTotal = { total: number };

const apiBaseUrl = (
  import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1"
).replace(/\/$/, "");

const openReportCount = ref<number | null>(null);
const inReviewReportCount = ref<number | null>(null);
const pendingCompanyCount = ref<number | null>(null);
const pendingJobCount = ref<number | null>(null);
const loading = ref(false);
let requestId = 0;
let activeSocket: Socket | null = null;
let activeToken: string | null = null;
let refreshTimer: number | null = null;

const reportCount = computed(() =>
  openReportCount.value === null || inReviewReportCount.value === null
    ? null
    : openReportCount.value + inReviewReportCount.value,
);

const attentionCount = computed(() => {
  if (
    reportCount.value === null ||
    pendingCompanyCount.value === null ||
    pendingJobCount.value === null
  ) {
    return null;
  }

  return reportCount.value + pendingCompanyCount.value + pendingJobCount.value;
});

const hasError = computed(
  () =>
    !loading.value &&
    (reportCount.value === null ||
      pendingCompanyCount.value === null ||
      pendingJobCount.value === null),
);

export async function refreshAdminQueueCounts() {
  const currentRequestId = ++requestId;
  loading.value = true;

  const [open, inReview, pendingCompanies, pendingJobs] = await Promise.allSettled([
    apiRequest<QueueTotal>("/admin/reports?status=OPEN&page=1&limit=1"),
    apiRequest<QueueTotal>("/admin/reports?status=IN_REVIEW&page=1&limit=1"),
    apiRequest<QueueTotal>("/admin/companies?status=PENDING&page=1&limit=1"),
    apiRequest<QueueTotal>("/admin/jobs?moderationStatus=PENDING&page=1&limit=1"),
  ]);

  // Ignore older responses when a newer snapshot request finishes first.
  if (currentRequestId !== requestId) return;

  openReportCount.value = open.status === "fulfilled" ? open.value.total : null;
  inReviewReportCount.value =
    inReview.status === "fulfilled" ? inReview.value.total : null;
  pendingCompanyCount.value =
    pendingCompanies.status === "fulfilled" ? pendingCompanies.value.total : null;
  pendingJobCount.value =
    pendingJobs.status === "fulfilled" ? pendingJobs.value.total : null;
  loading.value = false;
}

function isQueueUpdate(value: unknown): value is { updatedAt: string } {
  if (!value || typeof value !== "object") return false;
  const updatedAt = (value as { updatedAt?: unknown }).updatedAt;
  return typeof updatedAt === "string" && Number.isFinite(Date.parse(updatedAt));
}

function disconnectQueueSocket() {
  if (refreshTimer !== null) window.clearTimeout(refreshTimer);
  refreshTimer = null;
  activeSocket?.removeAllListeners();
  activeSocket?.disconnect();
  activeSocket = null;
  activeToken = null;
}

export function startAdminQueueRealtime() {
  const session = getAuthSession();
  if (!session || session.user.role !== "ADMIN") {
    stopAdminQueueRealtime();
    return;
  }

  if (activeSocket && activeToken === session.accessToken) {
    void refreshAdminQueueCounts();
    return;
  }

  disconnectQueueSocket();
  activeToken = session.accessToken;
  void refreshAdminQueueCounts();

  const apiUrl = new URL(apiBaseUrl, window.location.origin);
  const socket = io(`${apiUrl.origin}/notifications`, {
    auth: { token: session.accessToken },
    transports: ["websocket"],
    reconnection: true,
    timeout: 10_000,
  });
  activeSocket = socket;

  socket.on("connect", () => {
    if (getAuthSession()?.accessToken === session.accessToken) {
      // REST provides the authoritative count snapshot, including events missed
      // while the browser was disconnected from the live socket.
      void refreshAdminQueueCounts();
    }
  });
  socket.on("admin.queues.updated", (value: unknown) => {
    if (
      getAuthSession()?.accessToken !== session.accessToken ||
      !isQueueUpdate(value)
    ) {
      return;
    }
    if (refreshTimer !== null) window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => {
      refreshTimer = null;
      void refreshAdminQueueCounts();
    }, 120);
  });
}

export function stopAdminQueueRealtime() {
  disconnectQueueSocket();
  requestId += 1;
  loading.value = false;
}

export function useAdminQueueCounts() {
  return {
    openReportCount: readonly(openReportCount),
    inReviewReportCount: readonly(inReviewReportCount),
    reportCount,
    pendingCompanyCount: readonly(pendingCompanyCount),
    pendingJobCount: readonly(pendingJobCount),
    attentionCount,
    hasError,
    loading: readonly(loading),
    refresh: refreshAdminQueueCounts,
  };
}
