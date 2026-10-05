<script setup lang="ts">
import { computed, ref } from "vue";
import UiIcon from "@/components/company/UiIcon.vue";
import { useAdminQueueCounts } from "@/services/adminQueueCounts";

const isOpen = ref(false);
const {
  openReportCount,
  inReviewReportCount,
  pendingCompanyCount,
  pendingJobCount,
  attentionCount,
  hasError,
  loading,
  refresh,
} = useAdminQueueCounts();

const notificationLabel = computed(() => {
  if (attentionCount.value === null) return "Notifications, queue total unavailable";
  const quantity = attentionCount.value;
  return `Notifications, ${quantity} ${quantity === 1 ? "item needs" : "items need"} attention`;
});

function toggleNotifications() {
  isOpen.value = !isOpen.value;
  if (isOpen.value) void refresh();
}
</script>

<template>
  <div class="notification-control" @keydown.esc="isOpen = false">
    <button
      class="notification-button"
      type="button"
      :aria-label="notificationLabel"
      aria-controls="admin-notifications-panel"
      :aria-expanded="isOpen"
      @click="toggleNotifications"
    >
      <UiIcon name="bell" :size="19" />
      <span
        v-if="attentionCount !== null && attentionCount > 0"
        class="notification-count"
        aria-hidden="true"
      >{{ attentionCount > 99 ? "99+" : attentionCount }}</span>
      <span
        v-else-if="attentionCount === null && !loading"
        class="notification-error-mark"
        aria-hidden="true"
      >!</span>
    </button>

    <section
      v-if="isOpen"
      id="admin-notifications-panel"
      class="notification-panel"
      aria-label="Admin notifications"
    >
      <div class="notification-panel-heading">
        <div>
          <p class="panel-kicker">Live queue totals</p>
          <h2>Needs your attention</h2>
        </div>
        <button
          class="notification-close"
          type="button"
          aria-label="Close notifications"
          @click="isOpen = false"
        >
          <UiIcon name="close" :size="16" />
        </button>
      </div>
      <p class="notification-explainer">Open work across moderation and verification—not unread messages.</p>

      <p v-if="loading && attentionCount === null" class="notification-state" role="status">
        Loading current queues…
      </p>
      <p v-else-if="hasError" class="notification-state notification-state-error" role="alert">
        One or more queue totals couldn’t be loaded. Refresh to try again.
      </p>
      <p v-else-if="attentionCount === 0" class="notification-state" role="status">
        All caught up. There are no items waiting for admin attention.
      </p>
      <div v-else class="notification-list">
        <router-link
          class="notification-item"
          to="/admin/reports?status=OPEN"
          @click="isOpen = false"
        >
          <span class="notification-item-copy">
            <strong>Open reports</strong>
            <small>New reports waiting for triage</small>
          </span>
          <span class="notification-item-count">{{ openReportCount ?? "—" }}</span>
          <UiIcon name="chevron" :size="15" />
        </router-link>
        <router-link
          class="notification-item"
          to="/admin/reports?status=IN_REVIEW"
          @click="isOpen = false"
        >
          <span class="notification-item-copy">
            <strong>In-review reports</strong>
            <small>Investigations still in progress</small>
          </span>
          <span class="notification-item-count">{{ inReviewReportCount ?? "—" }}</span>
          <UiIcon name="chevron" :size="15" />
        </router-link>
        <router-link
          class="notification-item"
          to="/admin/companies"
          @click="isOpen = false"
        >
          <span class="notification-item-copy">
            <strong>Company verification</strong>
            <small>Profiles waiting for approval</small>
          </span>
          <span class="notification-item-count">{{ pendingCompanyCount ?? "—" }}</span>
          <UiIcon name="chevron" :size="15" />
        </router-link>
        <router-link
          class="notification-item"
          to="/admin/jobs?moderationStatus=PENDING"
          @click="isOpen = false"
        >
          <span class="notification-item-copy">
            <strong>Job listings</strong>
            <small>Listings waiting for moderation</small>
          </span>
          <span class="notification-item-count">{{ pendingJobCount ?? "—" }}</span>
          <UiIcon name="chevron" :size="15" />
        </router-link>
      </div>

      <button
        class="notification-refresh"
        type="button"
        :disabled="loading"
        @click="refresh"
      >
        {{ loading ? "Refreshing…" : "Refresh queue totals" }}
      </button>
    </section>
  </div>
</template>

<style scoped>
.notification-control { position: relative; flex: 0 0 auto; }
.notification-button { position: relative; width: 42px; height: 42px; border: 1px solid #e2e4e8; border-radius: 9px; display: grid; place-items: center; background: #fff; color: #40506b; cursor: pointer; transition: border-color 180ms ease, background 180ms ease, color 180ms ease; }
.notification-button:hover, .notification-button[aria-expanded="true"] { border-color: #c9ced7; background: #f0eefb; color: #5643b9; }
.notification-button:focus-visible, .notification-close:focus-visible, .notification-refresh:focus-visible, .notification-item:focus-visible { outline: 3px solid rgb(106 86 207 / 35%); outline-offset: 2px; }
.notification-count, .notification-error-mark { position: absolute; top: -6px; right: -6px; min-width: 19px; height: 19px; padding: 0 4px; border: 2px solid #f6f6f3; border-radius: 999px; display: grid; place-items: center; background: #b34b54; color: #fff; font-size: 10px; font-weight: 700; line-height: 1; font-variant-numeric: tabular-nums; }
.notification-error-mark { min-width: 17px; height: 17px; background: #a66a19; }
.notification-panel { position: absolute; top: calc(100% + 12px); right: 0; z-index: 50; width: min(360px, calc(100vw - 36px)); padding: 19px; border: 1px solid #e2e4e8; border-radius: 10px; background: #fff; box-shadow: 0 16px 45px rgb(25 35 60 / 17%); color: #19233c; }
.notification-panel-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.notification-panel-heading .panel-kicker { margin: 0 0 5px; color: #5643b9; font-size: 10px; font-weight: 600; letter-spacing: .09em; text-transform: uppercase; }
.notification-panel-heading h2 { margin: 0; color: #19233c; font-size: 18px; font-weight: 600; letter-spacing: -.03em; }
.notification-close { width: 29px; height: 29px; border: 1px solid #e2e4e8; border-radius: 7px; display: grid; flex: 0 0 auto; place-items: center; background: #fff; color: #657088; cursor: pointer; }
.notification-close:hover { background: #f0eefb; color: #5643b9; }
.notification-explainer { margin: 8px 0 14px; color: #657088; font-size: 12px; line-height: 1.45; }
.notification-list { display: grid; }
.notification-item { min-height: 58px; padding: 9px 0; border-top: 1px solid #e2e4e8; display: grid; grid-template-columns: minmax(0, 1fr) 29px 15px; align-items: center; gap: 10px; color: inherit; text-decoration: none; }
.notification-item:hover .notification-item-copy strong, .notification-item:hover > .ui-icon { color: #5643b9; }
.notification-item-copy { min-width: 0; display: grid; gap: 3px; }
.notification-item-copy strong { color: #19233c; font-size: 12px; font-weight: 600; }
.notification-item-copy small { overflow: hidden; color: #657088; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.notification-item-count { min-width: 25px; color: #19233c; text-align: right; font-size: 13px; font-weight: 600; font-variant-numeric: tabular-nums; }
.notification-item > .ui-icon { color: #8790a0; }
.notification-state { margin: 0; padding: 17px 0; border-top: 1px solid #e2e4e8; color: #657088; font-size: 12px; line-height: 1.5; }
.notification-state-error { color: #a13c45; }
.notification-refresh { width: 100%; min-height: 34px; margin-top: 9px; border: 1px solid #e2e4e8; border-radius: 7px; background: #fbfbf9; color: #40506b; font-size: 11px; font-weight: 600; cursor: pointer; }
.notification-refresh:hover:not(:disabled) { border-color: #c9ced7; background: #f0eefb; color: #5643b9; }
.notification-refresh:disabled { color: #8992a0; cursor: wait; }
</style>
