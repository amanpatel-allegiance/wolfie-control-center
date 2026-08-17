import Link from "next/link";
import { redirect } from "next/navigation";
import { Info } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { getPipelines } from "@/lib/data";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { formatDuration } from "@/lib/format";
import { describeCron } from "@/lib/schedule";

export const dynamic = "force-dynamic";
export default async function SchedulesPage() {
  const sb = await supabaseServer(); const { data } = await sb.auth.getUser(); if (!data.user) redirect("/login");
  const pipelines = await getPipelines(); const enabled = pipelines.filter((p) => p.enabled); const schedulers = new Set(pipelines.map((p) => p.scheduler));
  return <div className="space-y-4"><PageHeader eyebrow="Orchestration" title="Schedules" description="Production cadence, ownership and runtime guardrails from the pipeline registry."/>
    <section className="metrics-strip grid grid-cols-2 gap-3 lg:grid-cols-4"><MetricCard label="Scheduled pipelines" value={enabled.filter((p) => p.schedule_expression).length} tone="healthy"/><MetricCard label="Enabled" value={`${enabled.length}/${pipelines.length}`}/><MetricCard label="Schedulers" value={schedulers.size}/><MetricCard label="Timezone" value={pipelines[0]?.schedule_timezone ?? "—"} hint="Registry default"/></section>
    <div className="flex gap-3 rounded-[10px] border border-state-running/20 bg-state-running/[.055] p-4"><Info className="size-4 shrink-0 text-state-running"/><p className="text-[11px] leading-5 text-wolfie-muted"><b className="text-wolfie-ink">Read-only scheduler registry.</b> External scheduler configurations remain the source of truth. This page does not claim that edits here are propagated.</p></div>
    <section className="table-shell overflow-x-auto"><div className="card-header"><div><h2 className="card-heading">Schedule registry</h2><p className="card-copy">Every configured production cadence</p></div></div><table className="data-table min-w-[1080px]"><thead><tr><th className="text-left">Pipeline</th><th className="text-left">Cadence</th><th className="text-left">Expression</th><th className="text-left">Scheduler</th><th className="text-left">Timezone</th><th className="text-left">Strategy</th><th className="text-right">Freshness SLA</th><th className="text-right">Expected / timeout</th><th className="text-left">State</th></tr></thead><tbody>{pipelines.map((p) => <tr key={p.id}><td><Link href={`/pipelines/${p.key}?tab=configuration`} className="font-semibold hover:text-wolfie-accent">{p.name}</Link><div className="text-[10px] text-wolfie-muted">{p.source_key} · {p.key}</div></td><td>{describeCron(p.schedule_expression)}</td><td className="font-mono text-[10px] text-wolfie-muted">{p.schedule_expression ?? "—"}</td><td>{p.scheduler}</td><td>{p.schedule_timezone}</td><td className="capitalize">{p.refresh_strategy}</td><td className="text-right tabular">{p.freshness_sla_hours}h</td><td className="text-right tabular">{formatDuration(p.expected_duration_s)} / {formatDuration(p.timeout_s)}</td><td><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${p.enabled ? "bg-state-healthy/10 text-state-healthy" : "bg-wolfie-soft text-wolfie-muted"}`}>{p.enabled ? "Enabled" : "Disabled"}</span></td></tr>)}</tbody></table></section>
  </div>;
}
