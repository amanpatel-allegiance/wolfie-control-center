import Link from "next/link";
import { redirect } from "next/navigation";
import { Database, Info } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { getAllDatasetSnapshots, getPipelineHealth } from "@/lib/data";
import { MetricCard } from "@/components/MetricCard";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { formatNumber, formatRelative } from "@/lib/format";

export const dynamic = "force-dynamic";
export default async function QualityPage() {
  const sb = await supabaseServer(); const { data } = await sb.auth.getUser(); if (!data.user) redirect("/login");
  const [pipelines, snapshots] = await Promise.all([getPipelineHealth(), getAllDatasetSnapshots()]);
  const covered = new Set(snapshots.map((s) => s.pipeline_id)); const latest = new Map<number, typeof snapshots[number]>(); for (const item of snapshots) if (!latest.has(item.pipeline_id)) latest.set(item.pipeline_id, item);
  const duplicates = snapshots.reduce((sum, s) => sum + (s.duplicate_count ?? 0), 0); const rejected = snapshots.reduce((sum, s) => sum + (s.rejected_count ?? 0), 0);
  return <div className="space-y-4"><PageHeader eyebrow="Observability" title="Data quality" description="Dataset snapshot coverage and quality counters reported by production pipelines."/>
    <section className="metrics-strip grid grid-cols-2 gap-3 lg:grid-cols-4"><MetricCard label="Snapshot coverage" value={`${covered.size}/${pipelines.length}`} hint="Pipelines reporting snapshots" tone={covered.size === pipelines.length && pipelines.length ? "healthy" : "warning"}/><MetricCard label="Snapshot records" value={snapshots.length}/><MetricCard label="Duplicates reported" value={formatNumber(duplicates)} tone={duplicates ? "warning" : "default"}/><MetricCard label="Rows rejected" value={formatNumber(rejected)} tone={rejected ? "failed" : "default"}/></section>
    {!snapshots.length && <div className="flex gap-3 rounded-[10px] border border-state-running/20 bg-state-running/[.055] p-4"><Info className="size-4 shrink-0 text-state-running"/><p className="text-[11px] leading-5 text-wolfie-muted"><b className="text-wolfie-ink">Quality telemetry is not available yet.</b> The production snapshot table is configured but contains no records. Scores and trends are intentionally withheld until pipelines begin publishing real snapshot metrics.</p></div>}
    <section className="surface overflow-hidden"><div className="card-header"><div><h2 className="card-heading">Pipeline coverage</h2><p className="card-copy">Availability of measured dataset quality telemetry</p></div></div>{pipelines.length ? <div className="overflow-x-auto"><table className="data-table min-w-[850px]"><thead><tr><th className="text-left">Pipeline</th><th className="text-left">Source</th><th className="text-left">Telemetry</th><th className="text-left">Latest dataset</th><th className="text-right">Rows</th><th className="text-right">Duplicates</th><th className="text-left">Last snapshot</th></tr></thead><tbody>{pipelines.map((p) => { const snap = latest.get(p.id); return <tr key={p.id}><td><Link className="font-semibold hover:text-wolfie-accent" href={`/pipelines/${p.key}?tab=quality`}>{p.name}</Link><div className="text-[10px] text-wolfie-muted">{p.key}</div></td><td>{p.source_key}</td><td><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${snap ? "bg-state-healthy/10 text-state-healthy" : "bg-wolfie-soft text-wolfie-muted"}`}>{snap ? "Reporting" : "Unavailable"}</span></td><td className="font-mono text-[10px]">{snap?.dataset ?? "—"}</td><td className="text-right tabular">{snap?.total_rows == null ? "—" : formatNumber(snap.total_rows)}</td><td className="text-right tabular">{snap?.duplicate_count == null ? "—" : formatNumber(snap.duplicate_count)}</td><td className="text-wolfie-muted">{snap ? formatRelative(snap.snapshot_at) : "—"}</td></tr>; })}</tbody></table></div> : <EmptyState title="No pipelines registered" description="The production pipeline registry returned no records." icon={Database}/>}</section>
  </div>;
}
