import { redirect } from "next/navigation";
import Link from "next/link";
import { Activity, AlertCircle, CheckCircle2, ChevronRight, CircleDot, Clock3, Radio, Server, ShieldCheck, TriangleAlert } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { getAlerts, getOverviewKpis, getPipelineHealth, getRecentRuns, getWorkspaceDailyStats } from "@/lib/data";
import { MetricCard } from "@/components/MetricCard";
import { formatNumber, formatRelative, formatUtc } from "@/lib/format";
import { RunsList } from "@/components/RunsList";
import { PageHeader } from "@/components/PageHeader";
import { RefreshButton } from "@/components/RefreshButton";
import { OverviewCharts } from "@/components/OverviewCharts";
import { PipelinePerformanceChart } from "@/components/PipelinePerformanceChart";

export const dynamic = "force-dynamic";

const successfulStatuses = new Set(["succeeded", "succeeded_with_warnings", "unchanged"]);
const terminalStatuses = new Set(["succeeded", "succeeded_with_warnings", "partial", "unchanged", "failed", "timed_out", "cancelled", "skipped"]);

export default async function OverviewPage() {
  const sb = await supabaseServer();
  const { data: userData } = await sb.auth.getUser();
  if (!userData.user) redirect("/login");

  const [kpis, pipelines, runs, alerts, dailyStats] = await Promise.all([
    getOverviewKpis(), getPipelineHealth(), getRecentRuns({ limit: 300 }), getAlerts("open"), getWorkspaceDailyStats(30),
  ]);
  const generatedAt = new Date().toISOString();
  const completedRuns = runs.filter((run) => terminalStatuses.has(run.status));
  const successfulRuns = completedRuns.filter((run) => successfulStatuses.has(run.status));
  const successRate = completedRuns.length ? Math.round((successfulRuns.length / completedRuns.length) * 100) : null;
  const activeCount = kpis.running;
  const unhealthyCount = kpis.warning + kpis.stale + kpis.failed + kpis.stuck;
  const fleetHealth = kpis.pipelines_total ? Math.round((kpis.healthy / kpis.pipelines_total) * 100) : null;
  const rowsWritten = dailyStats.reduce((sum, row) => sum + row.rows_written, 0);
  const health = (["healthy", "running", "warning", "delayed", "stale", "failed", "stuck", "disabled", "unknown"] as const).map((state) => ({
    state,
    value: pipelines.filter((pipeline) => pipeline.health_state === state).length,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Production workspace"
        title="Data operations"
        description={<>Production pipeline reliability, throughput, and execution telemetry · updated {formatUtc(generatedAt)}</>}
        actions={<><span className="hidden h-10 items-center gap-2 rounded-lg border border-state-healthy/20 bg-state-healthy/[.06] px-3 text-xs font-semibold text-state-healthy sm:inline-flex"><Radio className="size-3.5" />Live telemetry</span><RefreshButton /></>}
      />

      <section className="relative overflow-hidden rounded-xl bg-wolfie-navy px-5 py-4 text-white shadow-card">
        <div className="absolute right-0 top-0 h-full w-64 bg-[radial-gradient(circle_at_right,rgba(79,70,229,.28),transparent_65%)]" />
        <div className="relative flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <span className={`grid size-10 place-items-center rounded-lg ${unhealthyCount || alerts.length ? "bg-state-warning/15 text-state-warning" : "bg-state-healthy/15 text-state-healthy"}`}>{unhealthyCount || alerts.length ? <TriangleAlert className="size-5" /> : <ShieldCheck className="size-5" />}</span>
            <div><div className="text-sm font-semibold">{unhealthyCount || alerts.length ? "Attention required" : "All systems operational"}</div><div className="mt-0.5 text-[11px] text-white/45">{unhealthyCount ? `${unhealthyCount} pipeline${unhealthyCount === 1 ? " is" : "s are"} outside normal state` : "All monitored pipelines are inside policy"}</div></div>
          </div>
          <div className="grid grid-cols-2 gap-x-7 gap-y-3 sm:flex sm:items-center sm:gap-7">
            <div className="flex items-center gap-2"><Server className="size-3.5 text-white/35" /><div><div className="text-[9px] uppercase tracking-wider text-white/35">Fleet</div><div className="mt-0.5 text-xs font-semibold tabular">{kpis.pipelines_total} pipelines</div></div></div>
            <div className="flex items-center gap-2"><Activity className="size-3.5 text-state-running" /><div><div className="text-[9px] uppercase tracking-wider text-white/35">Active</div><div className="mt-0.5 text-xs font-semibold tabular">{activeCount} running</div></div></div>
            <div className="flex items-center gap-2"><AlertCircle className="size-3.5 text-state-failed" /><div><div className="text-[9px] uppercase tracking-wider text-white/35">Incidents</div><div className="mt-0.5 text-xs font-semibold tabular">{alerts.length} open</div></div></div>
            <div className="flex items-center gap-2"><Clock3 className="size-3.5 text-white/35" /><div><div className="text-[9px] uppercase tracking-wider text-white/35">Last run</div><div className="mt-0.5 text-xs font-semibold">{formatRelative(runs[0]?.started_at)}</div></div></div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Fleet health" value={fleetHealth == null ? "—" : `${fleetHealth}%`} hint={`${kpis.healthy} of ${kpis.pipelines_total} healthy`} tone={fleetHealth != null && fleetHealth >= 90 ? "healthy" : "warning"} />
        <MetricCard label="Run success" value={successRate == null ? "—" : `${successRate}%`} hint={`${successfulRuns.length} successful of ${completedRuns.length}`} tone={successRate != null && successRate >= 95 ? "healthy" : "warning"} />
        <MetricCard label="Executions" value={completedRuns.length} hint="Production runs in retained history" tone="running" />
        <MetricCard label="Rows written" value={formatNumber(rowsWritten)} hint="Across the last 30 days" tone="default" />
      </section>

      <OverviewCharts dailyStats={dailyStats} health={health} generatedAt={generatedAt} />

      <PipelinePerformanceChart pipelines={pipelines} dailyStats={dailyStats} generatedAt={generatedAt} />

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <section className="surface overflow-hidden">
          <div className="flex items-center justify-between border-b border-wolfie-border px-5 py-4">
            <div><h2 className="text-sm font-semibold">Incident feed</h2><p className="mt-1 text-xs text-wolfie-muted">Open alerts requiring action</p></div>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${alerts.length ? "bg-state-failed/10 text-state-failed" : "bg-state-healthy/10 text-state-healthy"}`}>{alerts.length} open</span>
          </div>
          {alerts.length === 0 ? (
            <div className="grid min-h-64 place-items-center px-6 py-10 text-center"><div><span className="mx-auto grid size-11 place-items-center rounded-full bg-state-healthy/10 text-state-healthy"><CheckCircle2 className="size-5" /></span><div className="mt-3 text-sm font-semibold">Incident queue is clear</div><p className="mt-1 text-xs text-wolfie-muted">No unresolved alerts.</p></div></div>
          ) : (
            <ul className="divide-y divide-wolfie-border/80">
              {alerts.slice(0, 5).map((alert) => (
                <li key={alert.id} className="group px-5 py-3.5 transition hover:bg-state-failed/[.025]">
                  <div className="flex gap-3"><span className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg ${alert.severity === "critical" ? "bg-state-failed/10 text-state-failed" : "bg-state-warning/10 text-state-warning"}`}><AlertCircle className="size-3.5" /></span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div className="truncate text-xs font-semibold">{alert.title}</div><span className="shrink-0 text-[10px] text-wolfie-muted">{formatRelative(alert.fired_at)}</span></div><p className="mt-1 line-clamp-2 text-[11px] leading-4 text-wolfie-muted">{alert.description ?? "No additional context provided."}</p></div></div>
                </li>
              ))}
              <li><Link href="/alerts" className="flex items-center justify-center gap-1 px-5 py-3 text-xs font-semibold text-wolfie-accent hover:bg-wolfie-soft">Open incident center <ChevronRight className="size-3.5" /></Link></li>
            </ul>
          )}
        </section>
        <section className="min-w-0">
          <div className="mb-3 flex items-end justify-between"><div><h2 className="text-base font-semibold tracking-tight">Recent executions</h2><p className="mt-1 text-xs text-wolfie-muted">Latest activity across every monitored pipeline</p></div><div className="hidden items-center gap-1.5 text-[10px] text-wolfie-muted sm:flex"><CircleDot className="size-3" />Live production history</div></div>
          <RunsList runs={runs} limit={8} />
        </section>
      </div>
    </div>
  );
}
