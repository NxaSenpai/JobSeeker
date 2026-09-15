<script setup lang="ts">
import { computed, ref } from 'vue'
import CompanyPageHeader from '@/components/company/CompanyPageHeader.vue'

type Period = '30 days' | '90 days' | '12 months'
type SeriesPoint = { label: string; applications: number; shortlisted: number }

const selectedPeriod = ref<Period>('30 days')

function dateLabel(daysAgo: number) {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date)
}

function monthLabel(monthsAgo: number) {
  const date = new Date()
  date.setDate(1)
  date.setMonth(date.getMonth() - monthsAgo)
  return new Intl.DateTimeFormat('en', { month: 'short' }).format(date)
}

const datasets: Record<Period, SeriesPoint[]> = {
  '30 days': [
    { label: dateLabel(25), applications: 32, shortlisted: 5 },
    { label: dateLabel(20), applications: 28, shortlisted: 4 },
    { label: dateLabel(15), applications: 41, shortlisted: 8 },
    { label: dateLabel(10), applications: 55, shortlisted: 7 },
    { label: dateLabel(5), applications: 43, shortlisted: 6 },
    { label: dateLabel(0), applications: 47, shortlisted: 8 },
  ],
  '90 days': [
    { label: dateLabel(75), applications: 98, shortlisted: 16 },
    { label: dateLabel(60), applications: 115, shortlisted: 19 },
    { label: dateLabel(45), applications: 108, shortlisted: 18 },
    { label: dateLabel(30), applications: 132, shortlisted: 21 },
    { label: dateLabel(15), applications: 125, shortlisted: 22 },
    { label: dateLabel(0), applications: 164, shortlisted: 25 },
  ],
  '12 months': [
    { label: monthLabel(11), applications: 180, shortlisted: 29 },
    { label: monthLabel(10), applications: 188, shortlisted: 30 },
    { label: monthLabel(9), applications: 198, shortlisted: 31 },
    { label: monthLabel(8), applications: 204, shortlisted: 32 },
    { label: monthLabel(7), applications: 211, shortlisted: 33 },
    { label: monthLabel(6), applications: 216, shortlisted: 34 },
    { label: monthLabel(5), applications: 220, shortlisted: 35 },
    { label: monthLabel(4), applications: 224, shortlisted: 36 },
    { label: monthLabel(3), applications: 230, shortlisted: 37 },
    { label: monthLabel(2), applications: 240, shortlisted: 39 },
    { label: monthLabel(1), applications: 260, shortlisted: 40 },
    { label: monthLabel(0), applications: 313, shortlisted: 45 },
  ],
}

const periodMetrics: Record<Period, { applications: number; reviewed: number; shortlisted: number; hires: number }> = {
  '30 days': { applications: 246, reviewed: 84, shortlisted: 38, hires: 9 },
  '90 days': { applications: 742, reviewed: 452, shortlisted: 121, hires: 26 },
  '12 months': { applications: 2684, reviewed: 1920, shortlisted: 421, hires: 82 },
}
const chart = computed(() => datasets[selectedPeriod.value])
const metrics = computed(() => periodMetrics[selectedPeriod.value])
const chartMaximum = computed(() => Math.ceil(Math.max(...chart.value.map(point => point.applications)) / 20) * 20)
const funnel = computed(() => [
  { label: 'Applications', value: metrics.value.applications, width: 100, color: 'navy' },
  { label: 'Reviewed', value: metrics.value.reviewed, width: Math.round(metrics.value.reviewed / metrics.value.applications * 100), color: 'blue' },
  { label: 'Shortlisted', value: metrics.value.shortlisted, width: Math.round(metrics.value.shortlisted / metrics.value.applications * 100), color: 'lavender' },
  { label: 'Hired', value: metrics.value.hires, width: Math.max(12, Math.round(metrics.value.hires / metrics.value.applications * 100)), color: 'purple' },
])
</script>

<template>
  <div class="company-page analytics-page">
    <CompanyPageHeader eyebrow="Workspace / Analytics" title="Hiring analytics" description="Follow application volume and see where candidates move through your process.">
      <template #actions>
        <label class="period-control">Reporting period<select v-model="selectedPeriod"><option>30 days</option><option>90 days</option><option>12 months</option></select></label>
      </template>
    </CompanyPageHeader>

    <section class="analytics-summary" aria-label="Hiring results for selected period">
      <div><span>Applications</span><strong>{{ metrics.applications.toLocaleString() }}</strong><small>Received in this period</small></div>
      <div><span>Shortlisted</span><strong>{{ metrics.shortlisted.toLocaleString() }}</strong><small>{{ (metrics.shortlisted / metrics.applications * 100).toFixed(1) }}% of applications</small></div>
      <div><span>Hires</span><strong>{{ metrics.hires }}</strong><small>{{ (metrics.hires / metrics.applications * 100).toFixed(1) }}% of applications</small></div>
    </section>

    <section class="analytics-grid">
      <article class="analytics-panel volume-panel">
        <div class="panel-head"><div><h3>Application volume</h3><p>Applications received and shortlisted.</p></div><div class="chart-legend"><span><i class="legend-applications" />Applications</span><span><i class="legend-shortlisted" />Shortlisted</span></div></div>
        <div class="bar-chart" role="img" :aria-label="`Applications and shortlisted candidates over the last ${selectedPeriod}`">
          <div class="chart-axis"><span>{{ chartMaximum }}</span><span>{{ Math.round(chartMaximum * .75) }}</span><span>{{ Math.round(chartMaximum * .5) }}</span><span>{{ Math.round(chartMaximum * .25) }}</span><span>0</span></div>
          <div class="chart-plot"><div v-for="line in 4" :key="line" class="chart-line" :style="{ top: `${(line - 1) * 25}%` }" /><div v-for="point in chart" :key="point.label" class="chart-column"><div class="bar-pair"><i class="applications-bar" :style="{ height: `${point.applications / chartMaximum * 100}%` }" :title="`${point.applications} applications`" /><i class="shortlisted-bar" :style="{ height: `${point.shortlisted / chartMaximum * 100}%` }" :title="`${point.shortlisted} shortlisted`" /></div><span>{{ point.label }}</span></div></div>
        </div>
        <p class="chart-footnote">{{ selectedPeriod === '30 days' ? 'Each bar represents five days.' : selectedPeriod === '90 days' ? 'Each bar represents about two weeks.' : 'Monthly totals for the last 12 months.' }}</p>
      </article>

      <article class="analytics-panel funnel-panel">
        <div class="panel-head"><div><h3>Hiring stages</h3><p>Candidate progress in the selected period.</p></div></div>
        <div class="funnel-list"><div v-for="stage in funnel" :key="stage.label" class="funnel-row"><div class="funnel-label"><span>{{ stage.label }}</span><strong>{{ stage.value.toLocaleString() }}</strong></div><div class="funnel-track"><i :class="`funnel-${stage.color}`" :style="{ width: `${stage.width}%` }" /></div></div></div>
        <div class="stage-rates"><div><span>Reviewed</span><strong>{{ (metrics.reviewed / metrics.applications * 100).toFixed(1) }}%</strong></div><div><span>Shortlisted</span><strong>{{ (metrics.shortlisted / metrics.applications * 100).toFixed(1) }}%</strong></div><div><span>Hired</span><strong>{{ (metrics.hires / metrics.applications * 100).toFixed(1) }}%</strong></div></div>
      </article>
    </section>

    <p class="data-note">Figures are based on the current workspace sample data.</p>
  </div>
</template>

<style scoped>
.company-page { color: var(--ink); }
.period-control { min-width: 156px; display: grid; gap: 6px; color: #7783a5; font-size: 11px; font-weight: 600; }
.period-control select { min-height: 38px; padding: 0 30px 0 11px; border: 1px solid var(--line); border-radius: 7px; background: #fff; color: var(--ink-soft); font-size: 13px; outline: 0; }
.period-control select:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgb(123 102 255 / 12%); }
.analytics-summary { margin: -1px 0 22px; border: 1px solid var(--line); border-radius: 10px; display: grid; grid-template-columns: repeat(3, 1fr); background: #fff; }
.analytics-summary > div { min-height: 113px; padding: 17px 22px; display: grid; align-content: start; gap: 5px; }
.analytics-summary > div + div { border-left: 1px solid var(--line); }
.analytics-summary span { color: var(--muted); font-size: 12px; }
.analytics-summary strong { color: var(--ink); font-size: 28px; font-weight: 600; letter-spacing: -.04em; font-variant-numeric: tabular-nums; }
.analytics-summary small { color: #7783a5; font-size: 11px; }
.analytics-grid { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(285px, .8fr); gap: 18px; align-items: start; }
.analytics-panel { min-width: 0; min-height: 391px; padding: 22px; border: 1px solid var(--line); border-radius: 10px; background: #fff; box-shadow: 0 8px 24px rgb(11 43 130 / 4%); }
.panel-head { min-height: 39px; display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.panel-head h3 { margin: 0; color: var(--ink); font-size: 16px; font-weight: 600; letter-spacing: -.01em; }
.panel-head p { margin: 5px 0 0; color: var(--muted); font-size: 12px; line-height: 1.5; }
.chart-legend { display: flex; gap: 13px; color: var(--muted); font-size: 11px; white-space: nowrap; }
.chart-legend span { display: inline-flex; align-items: center; gap: 5px; }
.chart-legend i { width: 7px; height: 7px; border-radius: 2px; }
.legend-applications, .applications-bar { background: var(--accent); }
.legend-shortlisted, .shortlisted-bar { background: #c6bef4; }
.bar-chart { height: 263px; margin-top: 25px; display: flex; }
.chart-axis { width: 32px; padding: 0 4px 24px 0; display: flex; flex-direction: column; justify-content: space-between; color: #8692b2; font-size: 11px; font-variant-numeric: tabular-nums; }
.chart-plot { position: relative; min-width: 0; flex: 1; padding: 0 8px 25px; display: flex; align-items: stretch; justify-content: space-around; }
.chart-line { position: absolute; right: 0; left: 0; border-top: 1px dashed #e8e4f7; }
.chart-column { z-index: 1; width: 12%; display: flex; align-items: center; flex-direction: column; justify-content: flex-end; color: #7b87a8; font-size: 11px; }
.bar-pair { width: 100%; height: calc(100% - 25px); display: flex; align-items: flex-end; justify-content: center; gap: 3px; }
.bar-pair i { width: clamp(7px, 1.2vw, 13px); min-height: 2px; border-radius: 3px 3px 0 0; }
.chart-column > span { position: absolute; bottom: 0; white-space: nowrap; transform: translateY(2px); }
.chart-footnote { margin: 5px 0 0 32px; color: #8290b4; font-size: 11px; }
.funnel-list { margin-top: 28px; display: grid; gap: 22px; }
.funnel-row { display: grid; gap: 8px; }
.funnel-label { display: flex; justify-content: space-between; gap: 15px; color: var(--muted); font-size: 12px; }
.funnel-label strong { color: var(--ink); font-size: 13px; font-variant-numeric: tabular-nums; }
.funnel-track { height: 8px; border-radius: 6px; overflow: hidden; background: #f1effa; }
.funnel-track i { display: block; height: 100%; min-width: 7px; border-radius: inherit; }
.funnel-navy { background: #0b2b82; }.funnel-blue { background: #5269b2; }.funnel-lavender { background: #bcb1f5; }.funnel-purple { background: #7b66ff; }
.stage-rates { margin-top: 27px; padding-top: 17px; border-top: 1px solid var(--line); display: grid; gap: 10px; }
.stage-rates div { display: flex; justify-content: space-between; color: var(--muted); font-size: 12px; }
.stage-rates strong { color: var(--ink-soft); font-size: 12px; font-variant-numeric: tabular-nums; }
.data-note { margin: 14px 0 0; color: #8a94b1; font-size: 11px; }
@media (max-width: 980px) { .analytics-grid { grid-template-columns: 1fr; } .funnel-panel { min-height: 0; } }
@media (max-width: 620px) { .analytics-summary > div { min-height: 98px; padding: 14px 12px; } .analytics-summary strong { font-size: 24px; } .analytics-panel { padding: 18px 14px; } .panel-head { flex-direction: column; } .chart-legend { gap: 11px; } .bar-chart { height: 230px; } .chart-column { font-size: 10px; } }
</style>
