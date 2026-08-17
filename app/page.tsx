import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, ArrowUpRight, CheckCircle2, Clock3, Database, Radio, Rows3, ShieldCheck } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { getAlerts, getOverviewKpis, getPipelineHealth, getRecentRuns, getWorkspaceDailyStats } from "@/lib/data";
import { changedRows, processedRows } from "@/lib/run-stats";
import { formatDuration, formatNumber, formatRelative } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { RefreshButton } from "@/components/RefreshButton";
import { MetricCard } from "@/components/MetricCard";
import { HealthBadge, RunStatusBadge } from "@/components/StatusBadge";
import { FreshnessBar } from "@/components/FreshnessBar";
import { OperationalCard } from "@/components/OperationalCard";
import { RunSuccessTrend } from "@/components/RunSuccessTrend";

export const dynamic = "force-dynamic";

const good = new Set(["succeeded", "succeeded_with_warnings", "unchanged"]);
const severity: Record<string, number> = { stuck: 0, failed: 1, stale: 2, warning: 3, delayed: 4, running: 5, unknown: 6, disabled: 7, healthy: 8 };

export default async function OverviewPage() {
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  if (!data.user) redirect("/login");
  const [kpis, pipelines, runs, alerts, daily] = await Promise.all([getOverviewKpis(), getPipelineHealth(), getRecentRuns({ limit: 300 }), getAlerts("open"), getWorkspaceDailyStats(14)]);
  const completed = runs.filter((run) => !["queued", "running", "scheduled"].includes(run.status));
  const successful = completed.filter((run) => good.has(run.status));
  const successRate = completed.length ? Math.round(successful.length / completed.length * 100) : null;
  const dayAgo = Date.now() - 86_400_000;
  const last24 = runs.filter((run) => new Date(run.started_at).getTime() >= dayAgo);
  const last24Rows = last24.reduce((sum, run) => sum + (changedRows(run) ?? 0), 0);
  const attention = [...pipelines].filter((p) => !["healthy", "disabled"].includes(p.health_state)).sort((a, b) => (severity[a.health_state] ?? 99) - (severity[b.health_state] ?? 99)).slice(0, 7);
  const latestByPipeline = new Map(runs.map((run) => [run.pipeline_id, run]));
  const sources = new Map<string, typeof pipelines>();
  for (const p of pipelines) sources.set(p.source_key, [...(sources.get(p.source_key) ?? []), p]);
  const operational = attention.length === 0 && alerts.length === 0;

  return <div className="space-y-4">
    <PageHeader eyebrow="Production workspace" title="Operations overview" description="Live reliability, freshness and throughput from the production control-plane tables." actions={<RefreshButton />} />

    <section className={`flex flex-col gap-3 rounded-[10px] border px-4 py-3 sm:flex-row sm:items-center ${operational ? "border-state-healthy/20 bg-state-healthy/[.055]" : "border-state-warning/25 bg-state-warning/[.065]"}`}>
      <span className={`grid size-9 shrink-0 place-items-center rounded-full ${operational ? "bg-state-healthy/10 text-state-healthy" : "bg-state-warning/10 text-state-warning"}`}>{operational ? <ShieldCheck className="size-[18px]"/> : <AlertTriangle className="size-[18px]"/>}</span>
      <div className="min-w-0 flex-1"><div className="text-xs font-semibold">{operational ? "All monitored systems are operational" : `${attention.length} pipeline${attention.length === 1 ? " requires" : "s require"} attention`}</div><div className="mt-0.5 text-[11px] text-wolfie-muted">{operational ? "No open incidents or unhealthy pipelines were reported." : `${alerts.length} open incident${alerts.length === 1 ? "" : "s"}; review operational severity below.`}</div></div>
      <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-wolfie-muted"><Radio className="size-3 text-state-healthy"/>Live production telemetry</span>
    </section>

    <section className="metrics-strip grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      <MetricCard label="Healthy pipelines" value={`${kpis.healthy}/${kpis.pipelines_total}`} hint={kpis.healthy_pct == null ? "No pipelines" : `${Math.round(kpis.healthy_pct)}% fleet health`} tone="healthy" />
      <MetricCard label="Success rate" value={successRate == null ? "—" : `${successRate}%`} hint={`Across ${completed.length} retained runs`} tone={successRate != null && successRate >= 90 ? "healthy" : "warning"}/>
      <MetricCard label="Runs · 24 hours" value={last24.length} hint={`${last24.filter((run) => !good.has(run.status)).length} non-successful`} tone="running"/>
      <MetricCard label="Rows changed · 24h" value={formatNumber(last24Rows)} hint="Reported by pipeline stats" />
      <MetricCard label="Open incidents" value={alerts.length} hint={alerts.length ? "Needs review" : "Queue is clear"} tone={alerts.length ? "failed" : "healthy"}/>
    </section>

    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(330px,.7fr)]">
      <OperationalCard title="Pipelines requiring attention" description="Live health states ordered by operational severity" action={{ href: "/pipelines", label: "View all" }}>
        {attention.length ? <div className="overflow-x-auto"><table className="data-table min-w-[760px]"><thead><tr><th className="text-left">Pipeline</th><th className="text-left">Health</th><th className="text-left">Latest run</th><th className="text-left">Freshness / SLA</th><th className="text-right">Rows changed</th></tr></thead><tbody>{attention.map((p) => { const run = latestByPipeline.get(p.id); return <tr key={p.id}><td><Link href={`/pipelines/${p.key}`} className="group font-semibold hover:text-wolfie-accent">{p.name}<ArrowUpRight className="ml-1 inline size-3 opacity-0 group-hover:opacity-100"/></Link><div className="mt-0.5 text-[10px] text-wolfie-muted">{p.source_key} · {p.key}</div></td><td><HealthBadge state={p.health_state}/></td><td>{p.latest_status ? <RunStatusBadge status={p.latest_status}/> : "—"}<div className="mt-1 text-[10px] text-wolfie-muted">{formatRelative(p.latest_started_at)}</div></td><td className="w-[170px]"><FreshnessBar hours={p.freshness_hours} slaHours={p.freshness_sla_hours}/></td><td className="text-right tabular">{run && changedRows(run) != null ? formatNumber(changedRows(run)!) : "—"}</td></tr>; })}</tbody></table></div> : <div className="empty-panel"><div><CheckCircle2 className="mx-auto size-7 text-state-healthy"/><div className="mt-3 text-xs font-semibold">No pipelines require attention</div><div className="mt-1 text-[11px] text-wolfie-muted">Every enabled pipeline is currently inside its health policy.</div></div></div>}
      </OperationalCard>

      <OperationalCard title="Freshness by source" description="Oldest pipeline compared with its SLA">
        <div className="divide-y divide-wolfie-border/80">{[...sources.entries()].map(([source, list]) => { const worst = [...list].sort((a,b) => ((b.freshness_hours ?? 0) / Math.max(b.freshness_sla_hours, 1)) - ((a.freshness_hours ?? 0) / Math.max(a.freshness_sla_hours, 1)))[0]; return <div key={source} className="px-4 py-3"><div className="mb-2 flex items-center justify-between"><span className="text-[11px] font-semibold">{source}</span><span className="text-[10px] text-wolfie-muted">{list.length} pipeline{list.length === 1 ? "" : "s"}</span></div><FreshnessBar hours={worst.freshness_hours} slaHours={worst.freshness_sla_hours}/></div>; })}</div>
      </OperationalCard>
    </div>

    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(330px,.7fr)]">
      <OperationalCard title="Run success trend" description="Daily success rate across production pipelines · 14 days" action={{ href: "/runs", label: "Run history" }}><RunSuccessTrend rows={daily}/></OperationalCard>
      <OperationalCard title="Recent activity" description="Latest runs and incident activity" action={{ href: "/runs", label: "View all" }}>
        <div className="divide-y divide-wolfie-border/80">{runs.slice(0, 7).map((run) => <Link key={run.id} href={`/runs/${run.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-wolfie-soft"><span className={`grid size-8 shrink-0 place-items-center rounded-full ${good.has(run.status) ? "bg-state-healthy/10 text-state-healthy" : run.status === "running" ? "bg-state-running/10 text-state-running" : "bg-state-failed/10 text-state-failed"}`}>{run.status === "running" ? <Clock3 className="size-3.5"/> : <Rows3 className="size-3.5"/>}</span><div className="min-w-0 flex-1"><div className="truncate text-[11px] font-semibold">{run.pipeline_name ?? run.pipeline_key ?? "Unmapped run"}</div><div className="mt-0.5 text-[10px] text-wolfie-muted">#{run.id} · {formatDuration(run.duration_s)} · {processedRows(run) == null ? "rows unavailable" : `${formatNumber(processedRows(run)!)} processed`}</div></div><span className="text-[10px] text-wolfie-muted">{formatRelative(run.started_at)}</span></Link>)}</div>
      </OperationalCard>
    </div>
  </div>;
}
