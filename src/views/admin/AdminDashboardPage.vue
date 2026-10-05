<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import AdminWorkspaceLayout from "@/components/admin/AdminWorkspaceLayout.vue";
import UiIcon from "@/components/company/UiIcon.vue";
import { apiRequest } from "@/services/api";

const router = useRouter();
const searchQuery = ref("");
const userCount = ref<number | null>(null);
const companyCount = ref<number | null>(null);
const activeJobCount = ref<number | null>(null);
const pendingCompanyCount = ref<number | null>(null);
const userCountError = ref(false);
const companyCountError = ref(false);
const activeJobCountError = ref(false);
const pendingCompanyCountError = ref(false);
const openReportCount = ref<number | null>(null);
const openOnlyCount = ref<number | null>(null);
const inReviewCount = ref<number | null>(null);
const reportCountError = ref(false);
const metrics = computed(() => [
  {
    label: "Total users",
    value: userCount.value?.toLocaleString() ?? "—",
    note: userCountError.value ? "Unavailable" : userCount.value === null ? "Loading" : "Live data",
    error: userCountError.value,
  },
  {
    label: "Companies",
    value: companyCount.value?.toLocaleString() ?? "—",
    note: companyCountError.value ? "Unavailable" : companyCount.value === null ? "Loading" : "Live data",
    error: companyCountError.value,
  },
  {
    label: "Active jobs",
    value: activeJobCount.value?.toLocaleString() ?? "—",
    note: activeJobCountError.value ? "Unavailable" : activeJobCount.value === null ? "Loading" : "Live data",
    error: activeJobCountError.value,
  },
  {
    label: "Reported content",
    value:
      openReportCount.value === null
        ? "—"
        : openReportCount.value.toLocaleString(),
    note: reportCountError.value ? "Live queue unavailable" : "Live queue",
    error: reportCountError.value,
  },
]);

const connectionLabel = computed(() =>
  reportCountError.value
    ? "Unavailable"
    : openReportCount.value === null
      ? "Connecting"
      : "Connected",
);

async function loadDashboardData() {
  const [users, companies, jobs, open, inReview, pendingCompanies] = await Promise.allSettled([
    apiRequest<{ total: number }>("/admin/users?page=1&limit=1"),
    apiRequest<{ total: number }>("/admin/companies?page=1&limit=1"),
    apiRequest<{ total: number }>(
      "/admin/jobs?moderationStatus=APPROVED&status=PUBLISHED&page=1&limit=1",
    ),
    apiRequest<{ total: number }>("/admin/reports?status=OPEN&page=1&limit=1"),
    apiRequest<{ total: number }>(
      "/admin/reports?status=IN_REVIEW&page=1&limit=1",
    ),
    apiRequest<{ total: number }>(
      "/admin/companies?status=PENDING&page=1&limit=1",
    ),
  ]);

  userCountError.value = users.status === "rejected";
  if (users.status === "fulfilled") userCount.value = users.value.total;

  companyCountError.value = companies.status === "rejected";
  if (companies.status === "fulfilled") companyCount.value = companies.value.total;

  activeJobCountError.value = jobs.status === "rejected";
  if (jobs.status === "fulfilled") activeJobCount.value = jobs.value.total;

  pendingCompanyCountError.value = pendingCompanies.status === "rejected";
  if (pendingCompanies.status === "fulfilled") pendingCompanyCount.value = pendingCompanies.value.total;

  reportCountError.value =
    open.status === "rejected" || inReview.status === "rejected";
  if (open.status === "fulfilled") openOnlyCount.value = open.value.total;
  if (inReview.status === "fulfilled") inReviewCount.value = inReview.value.total;
  if (!reportCountError.value && open.status === "fulfilled" && inReview.status === "fulfilled") {
    openReportCount.value = open.value.total + inReview.value.total;
  } else {
    openReportCount.value = null;
  }
}

onMounted(() => {
  void loadDashboardData();
});

function searchReports() {
  const search = searchQuery.value.trim();
  void router.push({ path: "/admin/reports", query: search ? { search } : {} });
}
</script>

<template>
  <AdminWorkspaceLayout
    v-model:search="searchQuery"
    title="Platform overview"
    @search="searchReports"
  >
    <section class="welcome-row" aria-labelledby="welcome-title">
      <div>
        <p class="section-kicker">Today’s platform priorities</p>
        <h2 id="welcome-title">Platform activity</h2>
      </div>
    </section>

    <section class="summary-strip" aria-label="Platform summary">
      <div v-for="metric in metrics" :key="metric.label" class="summary-item">
        <span>{{ metric.label }}</span>
        <strong>{{ metric.value }}</strong>
        <small :class="metric.error ? 'error-note' : 'live-note'">
          {{ metric.note }}
        </small>
      </div>
    </section>

    <section class="operations-grid" aria-label="Admin operations">
      <article class="pipeline-panel">
        <div class="panel-heading">
          <div>
            <p class="panel-kicker">Moderation queue</p>
            <h3>Reports needing action</h3>
            <p>Open a report to review the evidence and record a decision.</p>
          </div>
        </div>
        <div class="pipeline-stages">
          <router-link class="pipeline-stage" to="/admin/reports?status=OPEN">
            <div class="stage-copy">
              <span>Open reports</span>
              <small>Submitted by job seekers and companies</small>
            </div>
            <strong>{{ openOnlyCount === null ? "—" : openOnlyCount }}</strong>
            <span class="stage-detail">Needs review</span>
            <UiIcon name="chevron" :size="16" />
          </router-link>
          <router-link class="pipeline-stage" to="/admin/reports?status=IN_REVIEW">
            <div class="stage-copy">
              <span>In-review reports</span>
              <small>Reports currently being investigated</small>
            </div>
            <strong>{{ inReviewCount === null ? "—" : inReviewCount }}</strong>
            <span class="stage-detail">Continue review</span>
            <UiIcon name="chevron" :size="16" />
          </router-link>
          <router-link class="pipeline-stage" to="/admin/companies">
            <div class="stage-copy">
              <span>Company verification</span>
              <small>Review company owners and profiles</small>
            </div>
            <strong>{{ pendingCompanyCountError ? "—" : pendingCompanyCount ?? "—" }}</strong>
            <span class="stage-detail">{{ pendingCompanyCountError ? "Queue unavailable" : "Pending accounts" }}</span>
            <UiIcon name="chevron" :size="16" />
          </router-link>
        </div>
        <p class="pipeline-insight">
          <strong>Connection status:</strong> {{ connectionLabel }}
          <span v-if="reportCountError"> — the report API could not be reached.</span>
          <span v-else> — this count comes from the backend report queue.</span>
        </p>
      </article>

      <aside class="role-watch-panel" aria-labelledby="coverage-title">
        <div class="panel-heading">
          <div>
            <p class="panel-kicker">Admin coverage</p>
            <h3 id="coverage-title">What’s available</h3>
          </div>
        </div>
        <div class="coverage-list">
          <div class="coverage-item">
            <span class="coverage-mark connected"><UiIcon name="chart" :size="15" /></span>
            <span><strong>Report moderation</strong><small>Live queue and review actions</small></span>
            <b>Live</b>
          </div>
          <div class="coverage-item">
            <span class="coverage-mark"><UiIcon name="users" :size="15" /></span>
            <span><strong>User management</strong><small>Search, review, suspend, and restore accounts</small></span>
            <b>Live</b>
          </div>
          <div class="coverage-item">
            <span class="coverage-mark"><UiIcon name="building" :size="15" /></span>
            <span><strong>Company verification</strong><small>Review queue and audited decisions</small></span>
            <b>Live</b>
          </div>
          <div class="coverage-item">
            <span class="coverage-mark"><UiIcon name="briefcase" :size="15" /></span>
            <span><strong>Job moderation</strong><small>Review, reject, hide, and restore listings</small></span>
            <b>Live</b>
          </div>
          <div class="coverage-item">
            <span class="coverage-mark"><UiIcon name="clock" :size="15" /></span>
            <span><strong>Audit log</strong><small>Search recorded admin decisions</small></span>
            <b>Live</b>
          </div>
        </div>
      </aside>
    </section>

    <section class="panel table-panel" aria-labelledby="feature-status-title">
      <div class="panel-heading table-heading">
        <div>
          <p class="panel-kicker">Platform controls</p>
          <h3 id="feature-status-title">Admin feature status</h3>
          <p>Core review queues connect to protected, audited moderation endpoints.</p>
        </div>
      </div>
      <div class="feature-table">
        <div class="feature-row feature-head">
          <span>Area</span><span>Connection</span><span>Next step</span>
        </div>
        <div class="feature-row">
          <strong>Report moderation</strong>
          <span class="feature-status feature-live"><i /> Connected to API</span>
          <router-link to="/admin/reports">Open queue <UiIcon name="chevron" :size="14" /></router-link>
        </div>
        <div class="feature-row">
          <strong>Company verification</strong>
          <span class="feature-status feature-live"><i /> Connected to API</span>
          <router-link to="/admin/companies">Open review queue <UiIcon name="chevron" :size="14" /></router-link>
        </div>
        <div class="feature-row">
          <strong>User management</strong>
          <span class="feature-status feature-live"><i /> Connected to API</span>
          <router-link to="/admin/users">Open accounts <UiIcon name="chevron" :size="14" /></router-link>
        </div>
        <div class="feature-row">
          <strong>Job moderation</strong>
          <span class="feature-status feature-live"><i /> Connected to API</span>
          <router-link to="/admin/jobs">Open job queue <UiIcon name="chevron" :size="14" /></router-link>
        </div>
        <div class="feature-row">
          <strong>Admin audit log</strong>
          <span class="feature-status feature-live"><i /> Connected to API</span>
          <router-link to="/admin/audit">Review activity <UiIcon name="chevron" :size="14" /></router-link>
        </div>
      </div>
    </section>
  </AdminWorkspaceLayout>
</template>

<style scoped>
.welcome-row { display: flex; align-items: flex-end; justify-content: space-between; gap: 32px; margin-bottom: 20px; }
.section-kicker, .panel-kicker { margin: 0 0 9px; color: #5643b9; font-size: 12px; font-weight: 600; letter-spacing: .09em; text-transform: uppercase; }
.welcome-row h2 { max-width: 650px; margin: 0 0 7px; color: #19233c; font-size: clamp(31px, 3.3vw, 44px); font-weight: 600; line-height: 1.05; letter-spacing: -.05em; text-wrap: balance; }
.summary-strip { margin-bottom: 22px; border-top: 1px solid #e2e4e8; border-bottom: 1px solid #e2e4e8; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); }
.summary-item { min-width: 0; padding: 15px 22px 16px; display: grid; grid-template-columns: auto auto 1fr; align-items: baseline; column-gap: 9px; }
.summary-item + .summary-item { border-left: 1px solid #e2e4e8; }
.summary-item > span { grid-column: 1 / -1; margin-bottom: 4px; color: #657088; font-size: 12px; font-weight: 500; }
.summary-item strong { color: #19233c; font-size: 25px; font-weight: 600; line-height: 1; letter-spacing: -.045em; font-variant-numeric: tabular-nums; }
.summary-item small { min-width: 0; overflow: hidden; color: #40506b; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.summary-item .live-note { color: #267554; font-weight: 600; }
.summary-item .error-note { color: #a13c45; font-weight: 600; }
.operations-grid { margin-bottom: 22px; display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(300px, .8fr); gap: 22px; align-items: stretch; }
.pipeline-panel, .role-watch-panel, .panel { min-width: 0; padding: 25px 26px; border: 1px solid #e2e4e8; border-radius: 8px; background: #fff; box-shadow: 0 8px 25px rgb(25 35 60 / 4%); }
.panel-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.panel-heading h3 { margin: 0 0 5px; color: #19233c; font-size: 20px; font-weight: 600; letter-spacing: -.025em; }
.panel-heading p:not(.panel-kicker) { margin: 0; color: #657088; font-size: 14px; line-height: 1.45; }
.panel-kicker { margin-bottom: 5px; }
.pipeline-stages { margin-top: 24px; display: grid; }
.pipeline-stage { width: 100%; min-height: 64px; padding: 0 4px; border: 0; border-top: 1px solid #e2e4e8; display: grid; grid-template-columns: minmax(145px, .9fr) 38px minmax(125px, 1fr) 16px; align-items: center; gap: 13px; background: transparent; color: inherit; text-align: left; text-decoration: none; cursor: pointer; transition: background 180ms ease, transform 180ms ease; }
.pipeline-stage:hover { background: #fbfbf9; }
.stage-copy { min-width: 0; display: grid; gap: 3px; }
.stage-copy span { color: #19233c; font-size: 13px; font-weight: 600; }
.stage-copy small { overflow: hidden; color: #657088; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.pipeline-stage > strong { color: #19233c; font-size: 16px; font-weight: 600; font-variant-numeric: tabular-nums; text-align: right; }
.stage-detail { color: #657088; font-size: 12px; }
.pipeline-stage > .ui-icon { color: #657088; transition: transform 180ms ease, color 180ms ease; }
.pipeline-stage:hover > .ui-icon { color: #5643b9; transform: translateX(2px); }
.pipeline-insight { margin: 20px 0 0; padding: 13px 0 0; border-top: 1px solid #e2e4e8; color: #40506b; font-size: 13px; line-height: 1.5; }
.pipeline-insight strong { color: #19233c; font-weight: 600; }
.coverage-list { margin-top: 18px; display: grid; }
.coverage-item { min-height: 67px; padding: 10px 0; border-top: 1px solid #e2e4e8; display: grid; grid-template-columns: 31px minmax(0, 1fr) auto; align-items: center; gap: 10px; }
.coverage-mark { width: 29px; height: 29px; border-radius: 7px; display: grid; place-items: center; background: #f3f4f7; color: #657088; }
.coverage-mark.connected { background: #f0eefb; color: #5643b9; }
.coverage-item > span:nth-child(2) { min-width: 0; display: grid; gap: 3px; }
.coverage-item strong { overflow: hidden; color: #19233c; font-size: 12px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.coverage-item small { color: #657088; font-size: 10px; }
.coverage-item b { color: #267554; font-size: 10px; font-weight: 600; }
.coverage-item .api-available { color: #5643b9; }
.table-panel { margin-bottom: 20px; padding: 25px 26px 10px; }
.table-heading { margin-bottom: 18px; }
.feature-table { width: 100%; }
.feature-row { min-height: 55px; border-top: 1px solid #e2e4e8; display: grid; grid-template-columns: minmax(180px, 1.2fr) minmax(150px, .9fr) minmax(135px, auto); align-items: center; gap: 18px; }
.feature-head { min-height: 35px; color: #657088; font-size: 10px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; }
.feature-row > strong { color: #19233c; font-size: 12px; font-weight: 600; }
.feature-status { color: #657088; font-size: 11px; }
.feature-live { display: inline-flex; align-items: center; gap: 7px; color: #267554; font-weight: 600; }
.feature-live i { width: 7px; height: 7px; border-radius: 2px; background: #4a9b72; }
.feature-row a { width: fit-content; padding: 0; border: 0; display: inline-flex; align-items: center; gap: 3px; background: transparent; color: #5643b9; text-decoration: none; font-size: 11px; font-weight: 600; }
.feature-row a:hover { text-decoration: underline; }
.feature-unavailable { color: #8992a0; font-size: 11px; }

@media (max-width: 1180px) {
  .operations-grid { grid-template-columns: 1fr; }
}
@media (max-width: 760px) {
  .operations-grid { gap: 18px; margin-bottom: 18px; }
  .pipeline-panel, .role-watch-panel, .panel { padding-right: 18px; padding-left: 18px; }
}
@media (max-width: 620px) {
  .welcome-row { align-items: flex-start; flex-direction: column; gap: 16px; }
  .welcome-row h2 { font-size: clamp(27px, 7vw, 36px); }
  .summary-strip { margin-right: -18px; margin-left: -18px; display: flex; overflow-x: auto; overscroll-behavior-x: contain; scrollbar-width: none; }
  .summary-strip::-webkit-scrollbar { display: none; }
  .summary-item { min-width: 190px; flex: 0 0 190px; padding: 14px 18px 15px; }
  .pipeline-stage { grid-template-columns: minmax(120px, 1fr) 32px 95px 15px; gap: 7px; }
  .stage-detail { font-size: 10px; }
  .feature-head { display: none; }
  .feature-row { padding: 12px 0; grid-template-columns: minmax(0, 1fr) auto; gap: 7px 12px; }
  .feature-row > strong { grid-column: 1 / -1; }
}
</style>
