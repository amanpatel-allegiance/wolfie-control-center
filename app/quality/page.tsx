import { redirect } from "next/navigation";
import { CalendarRange, CircleAlert, Database, FileCheck2, GitCompareArrows, SlidersHorizontal } from "lucide-react";
import { getAllDatasetSnapshots, getPipelineHealth } from "@/lib/data";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { EmptyState } from "@/components/EmptyState";
import { QuerySelect } from "@/components/SelectMenu";
import { QualityTrendChart } from "@/components/QualityTrendChart";
import { formatNumber, formatRelative } from "@/lib/format";
import { hasDashboardAccess } from "@/lib/dashboard-access";
import { sourceLabel } from "@/lib/source-label";

export const dynamic = "force-dynamic";

const rangeOptions = [
  { value: "7", label: "Last 7 days", description: "Recent snapshot health" },
  { value: "30", label: "Last 30 days", description: "Monthly quality window" },
  { value: "90", label: "Last 90 days", description: "Quarterly quality window" },
  { value: "all", label: "All snapshots", description: "Up to the latest 500 records" },
];

export default async function QualityPage({ searchParams }: { searchParams: Promise<{ range?: string; source?: string }> }) {
  if (!(await hasDashboardAccess())) redirect("/login");
  const [params, pipelines, snapshots] = await Promise.all([searchParams, getPipelineHealth(), getAllDatasetSnapshots()]);
  const range = rangeOptions.some((option) => option.value === params.range) ? params.range! : "7";
  const pipelineById = new Map(pipelines.map((pipeline) => [pipeline.id, pipeline]));
  const sources = [...new Set(pipelines.map((pipeline) => pipeline.source_key))].sort();
  const source = sources.includes(params.source ?? "") ? params.source! : "all";
  const cutoff = range === "all" ? 0 : Date.now() - Number(range) * 86_400_000;
  const filteredSnapshots = snapshots.filter((snapshot) => {
    if (cutoff && new Date(snapshot.snapshot_at).getTime() < cutoff) return false;
    if (source !== "all" && pipelineById.get(snapshot.pipeline_id)?.source_key !== source) return false;
    return true;
  });
  const latest = new Map<string, typeof snapshots[number]>();
  for (const snapshot of filteredSnapshots) {
    const key = `${snapshot.pipeline_id}:${snapshot.dataset}`;
    if (!latest.has(key)) latest.set(key, snapshot);
  }
  const reported = [...latest.values()];
  const failed = reported.filter((snapshot) => (snapshot.duplicate_count ?? 0) > 0 || (snapshot.rejected_count ?? 0) > 0);
  const schemaChanges = reported.filter((snapshot) => snapshot.schema_version);
  const monitored = new Set(reported.map((snapshot) => snapshot.pipeline_id));
  const sourceOptions = [{ value: "all", label: "All sources", description: "Every connected provider" }, ...sources.map((value) => ({ value, label: sourceLabel(value) }))];

  return <section>
    <PageHeader title="Data quality" description={`${reported.length} latest dataset snapshots in the selected period`} actions={<><QuerySelect param="range" value={range} defaultValue="7" options={rangeOptions} icon={<CalendarRange/>} ariaLabel="Select quality period"/><QuerySelect param="source" value={source} defaultValue="all" options={sourceOptions} icon={<SlidersHorizontal/>} ariaLabel="Filter quality by source"/></>}/>
    <div className="ref-metrics"><MetricCard label="Passing checks" value={reported.length ? reported.length - failed.length : "—"} hint="Latest real snapshots" tone="healthy" icon={<FileCheck2 className="size-4"/>}/><MetricCard label="Failed checks" value={failed.length} hint="Duplicate or rejection signals" tone={failed.length ? "failed" : "default"} icon={<CircleAlert className="size-4"/>}/><MetricCard label="Datasets monitored" value={monitored.size} hint={`${pipelines.length} pipelines registered`} tone="running" icon={<Database className="size-4"/>}/><MetricCard label="Schema versions" value={schemaChanges.length} hint="Snapshots reporting a schema" tone={schemaChanges.length ? "warning" : "default"} icon={<GitCompareArrows className="size-4"/>}/></div>
    <div className="ref-quality-grid"><div className="surface overflow-hidden"><div className="ref-card-head"><h2>Quality telemetry by dataset</h2></div>{reported.length ? <div className="overflow-auto"><table className="data-table min-w-[680px]"><thead><tr><th>Dataset</th><th>Total rows</th><th>Distinct keys</th><th>Duplicates</th><th>Rejected</th><th>Snapshot</th></tr></thead><tbody>{reported.map((snapshot) => <tr key={snapshot.id}><td className="name"><strong>{snapshot.dataset}</strong><small>{pipelineById.get(snapshot.pipeline_id)?.name ?? `Pipeline ${snapshot.pipeline_id}`}</small></td><td><span className="ref-heat">{snapshot.total_rows == null ? "—" : formatNumber(snapshot.total_rows)}</span></td><td>{snapshot.distinct_business_keys == null ? "—" : formatNumber(snapshot.distinct_business_keys)}</td><td><span className={`ref-heat ${(snapshot.duplicate_count ?? 0) > 0 ? "warn" : ""}`}>{snapshot.duplicate_count ?? "—"}</span></td><td><span className={`ref-heat ${(snapshot.rejected_count ?? 0) > 0 ? "fail" : ""}`}>{snapshot.rejected_count ?? "—"}</span></td><td>{formatRelative(snapshot.snapshot_at)}</td></tr>)}</tbody></table></div> : <EmptyState title="Quality telemetry unavailable" description="No production snapshots match the selected source and time window."/>}</div>
      <div className="surface overflow-hidden"><div className="ref-card-head"><h2>Issues requiring attention</h2><span className="ml-auto text-[11px] text-wolfie-muted">{failed.length} detected</span></div>{failed.length ? <div className="overflow-auto"><table className="data-table"><thead><tr><th>Issue</th><th>Dataset</th><th>Severity</th><th>Rows</th></tr></thead><tbody>{failed.map((snapshot) => <tr key={snapshot.id}><td>{(snapshot.duplicate_count ?? 0) > 0 ? "Duplicate records" : "Rejected rows"}</td><td>{snapshot.dataset}</td><td><span className={`status ${(snapshot.rejected_count ?? 0) > 0 ? "critical" : "warning"}`}>{(snapshot.rejected_count ?? 0) > 0 ? "Critical" : "Warning"}</span></td><td>{formatNumber((snapshot.duplicate_count ?? 0) + (snapshot.rejected_count ?? 0))}</td></tr>)}</tbody></table></div> : <EmptyState title="No measured quality issues" description={reported.length ? "Latest snapshots report no duplicates or rejected rows." : "No snapshots are available for evaluation."}/>}</div></div>
    <div className="ref-grid-even mt-[14px]"><div className="surface overflow-hidden"><div className="ref-card-head"><h2>Quality trend</h2><span className="ml-auto text-[11px] text-wolfie-muted">Pass rate by snapshot date</span></div><QualityTrendChart snapshots={filteredSnapshots}/></div><div className="surface overflow-hidden"><div className="ref-card-head"><h2>Recent schema versions</h2></div>{schemaChanges.length ? <div className="overflow-auto"><table className="data-table"><thead><tr><th>Dataset</th><th>Version</th><th>Observed</th><th>Status</th></tr></thead><tbody>{schemaChanges.slice(0, 8).map((snapshot) => <tr key={snapshot.id}><td>{snapshot.dataset}</td><td><span className="ref-heat">{snapshot.schema_version}</span></td><td>{formatRelative(snapshot.snapshot_at)}</td><td><span className="status success">Observed</span></td></tr>)}</tbody></table></div> : <EmptyState title="No schema telemetry" description="No snapshot in this period reports a schema version."/>}</div></div>
  </section>;
}
