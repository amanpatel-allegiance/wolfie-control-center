import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, Check, Rows3, X } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { getAlerts, getOverviewKpis, getPipelineHealth, getRecentRuns, getWorkspaceDailyStats } from "@/lib/data";
import { changedRows, processedRows } from "@/lib/run-stats";
import { formatDuration, formatNumber, formatRelative } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { HealthBadge, RunStatusBadge } from "@/components/StatusBadge";
import { RunSuccessTrend } from "@/components/RunSuccessTrend";
import { AutoRefreshButton } from "@/components/AutoRefreshButton";
import { isLocalDashboardPreview } from "@/lib/local-preview";
import { compactSourceLabel, sourceLabel } from "@/lib/source-label";

export const dynamic = "force-dynamic";
const good = new Set(["succeeded", "succeeded_with_warnings", "unchanged"]);
const attentionState = new Set(["warning", "delayed", "stale", "failed", "stuck", "unknown"]);

export default async function OverviewPage() {
  const sb = await supabaseServer(); const { data } = await sb.auth.getUser(); if (!data.user && !isLocalDashboardPreview()) redirect("/login");
  const [kpis, pipelines, runs, alerts, daily] = await Promise.all([getOverviewKpis(), getPipelineHealth(), getRecentRuns({ limit: 300 }), getAlerts("open"), getWorkspaceDailyStats(14)]);
  const dayAgo = Date.now() - 86_400_000; const last24 = runs.filter((r) => new Date(r.started_at).getTime() >= dayAgo); const completed24 = last24.filter((r) => !["queued","running","scheduled"].includes(r.status)); const failed24 = completed24.filter((r) => !good.has(r.status)); const rowsProcessed = last24.reduce((sum,r) => sum + (processedRows(r) ?? 0), 0);
  const trendDays = new Set(daily.map((row) => row.day));
  const runTrend = new Map<string, { pipeline_id: number; day: string; succeeded: number; partial: number; failed: number; total: number; avg_duration_s: number | null; rows_written: number; durationTotal: number; durationCount: number }>();
  for (const run of runs) {
    const day = run.started_at.slice(0, 10); if (new Date(run.started_at).getTime() < Date.now() - 14 * 86_400_000 || ["queued","running","scheduled"].includes(run.status)) continue;
    const item = runTrend.get(day) ?? { pipeline_id: 0, day, succeeded: 0, partial: 0, failed: 0, total: 0, avg_duration_s: null, rows_written: 0, durationTotal: 0, durationCount: 0 };
    item.total += 1; item.rows_written += processedRows(run) ?? 0;
    if (run.status === "succeeded" || run.status === "unchanged") item.succeeded += 1; else if (run.status === "succeeded_with_warnings" || run.status === "partial") item.partial += 1; else item.failed += 1;
    if (run.duration_s != null) { item.durationTotal += run.duration_s; item.durationCount += 1; item.avg_duration_s = item.durationTotal / item.durationCount; }
    runTrend.set(day, item);
  }
  const trendRows = trendDays.size >= 2 ? daily : [...runTrend.values()].map(({ durationTotal: _durationTotal, durationCount: _durationCount, ...row }) => row);
  const withinSla = pipelines.filter((p) => p.freshness_hours != null && p.freshness_hours <= p.freshness_sla_hours).length; const slaPct = pipelines.length ? Math.round(withinSla / pipelines.length * 1000) / 10 : null; const attention = pipelines.filter((p) => attentionState.has(p.health_state)); const pipelineRows = [...pipelines].sort((a,b) => (attentionState.has(b.health_state) ? 1 : 0) - (attentionState.has(a.health_state) ? 1 : 0)).slice(0,5); const latestByPipeline = new Map(runs.map((r) => [r.pipeline_id,r]));
  const sourceGroups = new Map<string, typeof pipelines>(); for (const p of pipelines) sourceGroups.set(p.source_key,[...(sourceGroups.get(p.source_key) ?? []),p]);
  const activity = runs.slice(0,4);
  return <section>
    <PageHeader title="Operations overview" description="Live health across every extraction and sync pipeline" actions={<><button className="ref-btn">▣ Last 24 hours⌄</button><AutoRefreshButton/><Link href="/pipelines" className="ref-btn ref-btn-primary">▶ Run pipeline</Link></>}/>

    <div className="ref-health-banner surface"><span className="ref-health-good">✓</span><strong>Platform {attention.length || alerts.length ? "requires attention" : "healthy"} · {withinSla} of {pipelines.length} pipelines within SLA</strong><div className="ref-health-links"><Link href="/pipelines?state=warning" className="ref-warn-link">△ {attention.length} pipeline{attention.length === 1 ? "" : "s"} nearing or outside SLA</Link><Link href="/alerts" className="ref-danger-link">! {alerts.length} incident{alerts.length === 1 ? "" : "s"} open</Link></div></div>

    <div className="ref-metrics"><MetricCard label="Healthy" value={kpis.healthy} hint={`${withinSla} within freshness SLA`} tone="healthy" icon="✓"/><MetricCard label="Running" value={kpis.running} hint={`${last24.length} runs in last 24h`} tone="running" icon="▷"/><MetricCard label="SLA compliance" value={slaPct == null ? "—" : `${slaPct}%`} hint={`${withinSla} of ${pipelines.length} pipelines`} tone={slaPct != null && slaPct >= 90 ? "healthy" : "warning"} icon="◇"/><MetricCard label="Rows processed" value={formatNumber(rowsProcessed)} hint="Reported in last 24h" tone="running" icon="▤"/><MetricCard label="Failed runs" value={failed24.length} hint={`${completed24.length} completed in last 24h`} tone={failed24.length ? "failed" : "healthy"} icon="×"/></div>

    <div className="ref-grid-main"><div className="surface overflow-hidden"><div className="ref-card-head"><h2>Pipeline health</h2><Link href="/pipelines">View all pipelines →</Link></div><div className="overflow-auto"><table className="data-table min-w-[720px]"><thead><tr><th>Pipeline</th><th>Status</th><th>Freshness</th><th>Last run</th><th>Duration</th><th>Row delta</th><th>Next run</th></tr></thead><tbody>{pipelineRows.map((p) => { const run = latestByPipeline.get(p.id); return <tr key={p.id}><td className="name"><Link href={`/pipelines/${p.key}`}><strong>{p.name}</strong></Link><small>{compactSourceLabel(p.source_key)}</small></td><td><HealthBadge state={p.health_state}/></td><td>{formatRelative(p.last_change_at ?? p.last_success_started_at)}</td><td>{formatRelative(p.latest_started_at)}</td><td>{formatDuration(run?.duration_s)}</td><td className={(run && (changedRows(run) ?? 0) > 0) ? "text-state-healthy" : ""}>{run && changedRows(run) != null ? `+${formatNumber(changedRows(run)!)}` : "—"}</td><td>{p.schedule_expression ? "Scheduled" : "—"}</td></tr>; })}</tbody></table></div></div>
      <div className="surface overflow-hidden"><div className="ref-card-head"><h2>Freshness by source</h2><Link href="/pipelines">View all</Link></div><div className="px-[14px] py-[10px]">{[...sourceGroups.entries()].slice(0,5).map(([source,list]) => { const worst = [...list].sort((a,b) => ((b.freshness_hours ?? 0)/Math.max(b.freshness_sla_hours,1))-((a.freshness_hours ?? 0)/Math.max(a.freshness_sla_hours,1)))[0]; const pct = worst.freshness_hours == null ? 0 : Math.round(worst.freshness_hours / Math.max(worst.freshness_sla_hours,1) * 100); const tone = pct > 100 ? "text-state-failed" : pct > 75 ? "text-state-warning" : "text-wolfie-ink"; return <div key={source} className="grid grid-cols-[130px_1fr_48px] items-center gap-[10px] py-[9px] text-[11px]" title={`${sourceLabel(source)} is using ${pct}% of its freshness SLA`}><span className="truncate">{sourceLabel(source)}</span><div className="h-1.5 overflow-hidden rounded-full bg-[#EDF0F3]"><i className={`block h-full rounded-full ${pct > 100 ? "bg-state-failed" : pct > 75 ? "bg-state-warning" : "bg-state-healthy"}`} style={{width:`${Math.min(100,pct)}%`}}/></div><b className={`text-right tabular ${tone}`}>{pct}%</b></div>; })}</div></div>
    </div>

    <div className="ref-grid-even"><div className="surface overflow-hidden"><div className="ref-card-head"><h2>Run success rate</h2><span className="ml-auto text-[11px] text-wolfie-muted">14 days⌄</span></div><RunSuccessTrend rows={trendRows}/></div><div className="surface overflow-hidden"><div className="ref-card-head"><h2>Recent activity</h2><Link href="/runs">View all</Link></div><ul className="ref-activity">{activity.map((run) => { const ok = good.has(run.status); const running = run.status === "running"; return <li key={run.id}><span className={`ref-event-dot ${ok ? "bg-state-healthy/10 text-state-healthy" : running ? "bg-state-running/10 text-state-running" : "bg-state-failed/10 text-state-failed"}`}>{ok ? <Check className="size-2.5"/> : running ? <Activity className="size-2.5"/> : <X className="size-2.5"/>}</span><div><Link href={`/runs/${run.id}`}>{run.pipeline_name ?? run.pipeline_key ?? `Run ${run.id}`} {ok ? "completed" : run.status}</Link><small>{formatDuration(run.duration_s)} · Run {run.id}{processedRows(run) != null ? ` · ${formatNumber(processedRows(run)!)} rows` : ""}</small></div><RunStatusBadge status={run.status}/></li>; })}{!activity.length && <li><span className="ref-event-dot bg-wolfie-soft"><Rows3 className="size-2.5"/></span><div>No run activity reported<small>The production run view returned no rows.</small></div></li>}</ul></div></div>
  </section>;
}
