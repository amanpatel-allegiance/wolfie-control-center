import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, AlertTriangle, CalendarRange, Check, CheckCircle2, CircleAlert, CircleGauge, CircleX, Play, Rows3, X } from "lucide-react";
import { getAlerts, getOverviewKpis, getPipelineHealth, getRecentRuns, getWorkspaceDailyStats } from "@/lib/data";
import { changedRows, processedRows } from "@/lib/run-stats";
import { formatDuration, formatNumber, formatRelative } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { HealthBadge, RunStatusBadge } from "@/components/StatusBadge";
import { RunSuccessTrend } from "@/components/RunSuccessTrend";
import { AutoRefreshButton } from "@/components/AutoRefreshButton";
import { hasDashboardAccess } from "@/lib/dashboard-access";
import { compactSourceLabel, sourceLabel } from "@/lib/source-label";
import { QuerySelect } from "@/components/SelectMenu";
import { deriveLiveHealthIncidents } from "@/lib/incidents";

export const dynamic = "force-dynamic";
const good = new Set(["succeeded", "succeeded_with_warnings", "unchanged"]);
const attentionState = new Set(["warning", "delayed", "stale", "failed", "stuck", "unknown"]);

const periodOptions = [
  { value: "24h", label: "Last 24 hours", description: "Live operational window" },
  { value: "7d", label: "Last 7 days", description: "Short-term performance" },
  { value: "30d", label: "Last 30 days", description: "Monthly operating view" },
];
const trendOptions = [
  { value: "7", label: "7 days" },
  { value: "14", label: "14 days" },
  { value: "30", label: "30 days" },
];

export default async function OverviewPage({ searchParams }: { searchParams: Promise<{ range?: string; trend?: string }> }) {
  if (!(await hasDashboardAccess())) redirect("/login");
  const params = await searchParams;
  const period = periodOptions.some((option) => option.value === params.range) ? params.range! : "24h";
  const selectedTrendDays = [7, 14, 30].includes(Number(params.trend)) ? Number(params.trend) : 14;
  const periodDays = period === "7d" ? 7 : period === "30d" ? 30 : 1;
  const periodLabel = period === "24h" ? "last 24h" : `last ${periodDays} days`;
  const [kpis, pipelines, runs, alerts, daily] = await Promise.all([getOverviewKpis(), getPipelineHealth(), getRecentRuns({ limit: 500 }), getAlerts("open").catch(() => []), getWorkspaceDailyStats(30)]);
  const periodStart = Date.now() - periodDays * 86_400_000; const periodRuns = runs.filter((r) => new Date(r.started_at).getTime() >= periodStart); const completedPeriod = periodRuns.filter((r) => !["queued","running","scheduled"].includes(r.status)); const failedPeriod = completedPeriod.filter((r) => !good.has(r.status)); const rowsProcessed = periodRuns.reduce((sum,r) => sum + (processedRows(r) ?? 0), 0);
  const trendDays = new Set(daily.map((row) => row.day));
  const runTrend = new Map<string, { pipeline_id: number; day: string; succeeded: number; partial: number; failed: number; total: number; avg_duration_s: number | null; rows_written: number; durationTotal: number; durationCount: number }>();
  for (const run of runs) {
    const day = run.started_at.slice(0, 10); if (new Date(run.started_at).getTime() < Date.now() - 30 * 86_400_000 || ["queued","running","scheduled"].includes(run.status)) continue;
    const item = runTrend.get(day) ?? { pipeline_id: 0, day, succeeded: 0, partial: 0, failed: 0, total: 0, avg_duration_s: null, rows_written: 0, durationTotal: 0, durationCount: 0 };
    item.total += 1; item.rows_written += processedRows(run) ?? 0;
    if (run.status === "succeeded" || run.status === "unchanged") item.succeeded += 1; else if (run.status === "succeeded_with_warnings" || run.status === "partial") item.partial += 1; else item.failed += 1;
    if (run.duration_s != null) { item.durationTotal += run.duration_s; item.durationCount += 1; item.avg_duration_s = item.durationTotal / item.durationCount; }
    runTrend.set(day, item);
  }
  const unfilteredTrendRows = trendDays.size >= 2 ? daily : [...runTrend.values()].map(({ durationTotal: _durationTotal, durationCount: _durationCount, ...row }) => row);
  const trendStart = new Date(Date.now() - (selectedTrendDays - 1) * 86_400_000).toISOString().slice(0, 10);
  const trendRows = unfilteredTrendRows.filter((row) => row.day >= trendStart);
  const withinSla = pipelines.filter((p) => p.freshness_hours != null && p.freshness_hours <= p.freshness_sla_hours).length; const slaPct = pipelines.length ? Math.round(withinSla / pipelines.length * 1000) / 10 : null; const attention = pipelines.filter((p) => attentionState.has(p.health_state)); const incidentCount = alerts.length + deriveLiveHealthIncidents(pipelines, alerts).length; const pipelineRows = [...pipelines].sort((a,b) => (attentionState.has(b.health_state) ? 1 : 0) - (attentionState.has(a.health_state) ? 1 : 0)).slice(0,5); const latestByPipeline = new Map(runs.map((r) => [r.pipeline_id,r]));
  const sourceGroups = new Map<string, typeof pipelines>(); for (const p of pipelines) sourceGroups.set(p.source_key,[...(sourceGroups.get(p.source_key) ?? []),p]);
  const activity = runs.slice(0,4);
  return <section>
    <PageHeader title="Operations overview" description="Live health across every extraction and sync pipeline" actions={<><QuerySelect param="range" value={period} defaultValue="24h" options={periodOptions} icon={<CalendarRange/>} ariaLabel="Select overview period"/><AutoRefreshButton/><Link href="/pipelines" className="ref-btn ref-btn-primary"><Play className="fill-current" />Run pipeline</Link></>}/>

    <div className="ref-health-banner surface"><span className="ref-health-good"><Check className="size-3.5" strokeWidth={3} /></span><strong>Platform {attention.length || incidentCount ? "requires attention" : "healthy"} · {withinSla} of {pipelines.length} pipelines within SLA</strong><div className="ref-health-links"><Link href="/pipelines?state=warning" className="ref-warn-link inline-flex items-center gap-1.5"><AlertTriangle className="size-3.5" />{attention.length} pipeline{attention.length === 1 ? "" : "s"} nearing or outside SLA</Link><Link href="/incidents" className="ref-danger-link inline-flex items-center gap-1.5"><CircleAlert className="size-3.5" />{incidentCount} active condition{incidentCount === 1 ? "" : "s"}</Link></div></div>

    <div className="ref-metrics"><MetricCard label="Healthy" value={kpis.healthy} hint={`${withinSla} within freshness SLA`} tone="healthy" icon={<CheckCircle2 className="size-4" />}/><MetricCard label="Running" value={kpis.running} hint={`${periodRuns.length} runs in ${periodLabel}`} tone="running" icon={<Activity className="size-4" />}/><MetricCard label="SLA compliance" value={slaPct == null ? "—" : `${slaPct}%`} hint={`${withinSla} of ${pipelines.length} pipelines`} tone={slaPct != null && slaPct >= 90 ? "healthy" : "warning"} icon={<CircleGauge className="size-4" />}/><MetricCard label="Rows processed" value={formatNumber(rowsProcessed)} hint={`Reported in ${periodLabel}`} tone="running" icon={<Rows3 className="size-4" />}/><MetricCard label="Failed runs" value={failedPeriod.length} hint={`${completedPeriod.length} completed in ${periodLabel}`} tone={failedPeriod.length ? "failed" : "healthy"} icon={<CircleX className="size-4" />}/></div>

    <div className="ref-grid-main"><div className="surface overflow-hidden"><div className="ref-card-head"><h2>Pipeline health</h2><Link href="/pipelines">View all pipelines →</Link></div><div className="overflow-auto"><table className="data-table min-w-[720px]"><thead><tr><th>Pipeline</th><th>Status</th><th>Freshness</th><th>Last run</th><th>Duration</th><th>Row delta</th><th>Next run</th></tr></thead><tbody>{pipelineRows.map((p) => { const run = latestByPipeline.get(p.id); return <tr key={p.id}><td className="name"><Link href={`/pipelines/${p.key}`}><strong>{p.name}</strong></Link><small>{compactSourceLabel(p.source_key)}</small></td><td><HealthBadge state={p.health_state}/></td><td>{formatRelative(p.last_change_at ?? p.last_success_started_at)}</td><td>{formatRelative(p.latest_started_at)}</td><td>{formatDuration(run?.duration_s)}</td><td className={(run && (changedRows(run) ?? 0) > 0) ? "text-state-healthy" : ""}>{run && changedRows(run) != null ? `+${formatNumber(changedRows(run)!)}` : "—"}</td><td>{p.schedule_expression ? "Scheduled" : "—"}</td></tr>; })}</tbody></table></div></div>
      <div className="surface overflow-hidden"><div className="ref-card-head"><h2>Freshness by source</h2><Link href="/pipelines">View all</Link></div><div className="px-[14px] py-[10px]">{[...sourceGroups.entries()].slice(0,5).map(([source,list]) => { const worst = [...list].sort((a,b) => ((b.freshness_hours ?? 0)/Math.max(b.freshness_sla_hours,1))-((a.freshness_hours ?? 0)/Math.max(a.freshness_sla_hours,1)))[0]; const pct = worst.freshness_hours == null ? 0 : Math.round(worst.freshness_hours / Math.max(worst.freshness_sla_hours,1) * 100); const tone = pct > 100 ? "text-state-failed" : pct > 75 ? "text-state-warning" : "text-wolfie-ink"; return <div key={source} className="grid grid-cols-[130px_1fr_48px] items-center gap-[10px] py-[9px] text-[11px]" title={`${sourceLabel(source)} is using ${pct}% of its freshness SLA`}><span className="truncate">{sourceLabel(source)}</span><div className="h-1.5 overflow-hidden rounded-full bg-[#EDF0F3]"><i className={`block h-full rounded-full ${pct > 100 ? "bg-state-failed" : pct > 75 ? "bg-state-warning" : "bg-state-healthy"}`} style={{width:`${Math.min(100,pct)}%`}}/></div><b className={`text-right tabular ${tone}`}>{pct}%</b></div>; })}</div></div>
    </div>

    <div className="ref-grid-even"><div className="surface overflow-hidden"><div className="ref-card-head"><h2>Run success rate</h2><QuerySelect param="trend" value={String(selectedTrendDays)} defaultValue="14" options={trendOptions} className="ref-chart-select ml-auto" ariaLabel="Select chart period"/></div><RunSuccessTrend rows={trendRows}/></div><div className="surface overflow-hidden"><div className="ref-card-head"><h2>Recent activity</h2><Link href="/runs">View all</Link></div><ul className="ref-activity">{activity.map((run) => { const ok = good.has(run.status); const running = run.status === "running"; return <li key={run.id}><span className={`ref-event-dot ${ok ? "bg-state-healthy/10 text-state-healthy" : running ? "bg-state-running/10 text-state-running" : "bg-state-failed/10 text-state-failed"}`}>{ok ? <Check className="size-2.5"/> : running ? <Activity className="size-2.5"/> : <X className="size-2.5"/>}</span><div><Link href={`/runs/${run.id}`}>{run.pipeline_name ?? run.pipeline_key ?? `Run ${run.id}`} {ok ? "completed" : run.status}</Link><small>{formatDuration(run.duration_s)} · Run {run.id}{processedRows(run) != null ? ` · ${formatNumber(processedRows(run)!)} rows` : ""}</small></div><RunStatusBadge status={run.status}/></li>; })}{!activity.length && <li><span className="ref-event-dot bg-wolfie-soft"><Rows3 className="size-2.5"/></span><div>No run activity reported<small>The production run view returned no rows.</small></div></li>}</ul></div></div>
  </section>;
}
