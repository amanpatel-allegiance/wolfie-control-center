import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import {
  getCurrentRole,
  getDailyStats,
  getDatasetSnapshots,
  getPipelineByKey,
  getRecentRuns,
} from "@/lib/data";
import { HealthBadge } from "@/components/StatusBadge";
import { MetricCard } from "@/components/MetricCard";
import { FreshnessBar } from "@/components/FreshnessBar";
import { RunsList } from "@/components/RunsList";
import { RunDurationChart } from "@/components/RunDurationChart";
import { ManualRunButton } from "@/components/ManualRunButton";
import { formatDuration, formatRelative, formatUtc, redactSecrets } from "@/lib/format";
import { ArrowLeft, Clock3, Database, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PipelineDetail({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  if (!data.user) redirect("/login");

  const p = await getPipelineByKey(key);
  if (!p) notFound();

  const [role, runs, daily, snapshots] = await Promise.all([
    getCurrentRole(),
    getRecentRuns({ pipelineKey: key, limit: 30 }),
    getDailyStats(p.id, 30),
    getDatasetSnapshots(p.id, 5),
  ]);

  const canRun = role === "operator" || role === "admin";
  const okRuns = runs.filter((r) => r.status === "succeeded" || r.status === "succeeded_with_warnings" || r.status === "unchanged").length;
  const successRate = runs.length > 0 ? Math.round((okRuns / runs.length) * 100) : null;

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-4 flex items-center gap-2 text-xs text-wolfie-muted">
          <Link href="/pipelines" className="inline-flex items-center gap-1 font-medium hover:text-wolfie-accent"><ArrowLeft className="size-3.5" /> Pipelines</Link>
          <span className="text-wolfie-border">/</span><span>{p.source_key}</span>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="eyebrow mb-2">Pipeline detail</div>
            <h1 className="page-title">{p.name}</h1>
            <p className="page-copy">{p.description ?? p.key}</p>
          </div>
          <div className="flex items-center gap-2">
            <HealthBadge state={p.health_state} />
            <ManualRunButton pipelineKey={p.key} canRun={canRun} scheduler={p.scheduler} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <MetricCard label="Freshness" value={p.freshness_hours != null ? `${p.freshness_hours.toFixed(1)}h` : "—"} hint={`SLA ${p.freshness_sla_hours}h`} />
        <MetricCard label="Last success" value={p.last_success_started_at ? formatRelative(p.last_success_started_at) : "never"} />
        <MetricCard label="Last failure" value={p.last_failure_started_at ? formatRelative(p.last_failure_started_at) : "none"} />
        <MetricCard label="Success rate" value={successRate != null ? `${successRate}%` : "—"} hint={`over last ${runs.length} runs`} />
        <MetricCard label="Expected duration" value={p.expected_duration_s ? formatDuration(p.expected_duration_s) : "—"} hint={p.timeout_s ? `timeout ${formatDuration(p.timeout_s)}` : undefined} />
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="surface p-5">
          <div className="flex items-center gap-2 eyebrow"><Clock3 className="size-4 text-wolfie-accent" />Schedule</div>
          <div className="mt-4 inline-flex rounded-lg bg-wolfie-soft px-2.5 py-1.5 font-mono text-sm tabular">{p.schedule_expression || "—"}</div>
          <div className="mt-2 text-xs text-wolfie-muted">
            {p.schedule_timezone} · scheduler: <b>{p.scheduler}</b>
          </div>
          <div className="mt-1 text-xs text-wolfie-muted">strategy: {p.refresh_strategy}</div>
          {p.repository && (
            <a href={p.repository} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-wolfie-accent hover:underline">
              {p.repository.replace("https://github.com/", "")}<ExternalLink className="size-3" />
            </a>
          )}
        </div>

        <div className="surface p-5">
          <div className="flex items-center gap-2 eyebrow"><Database className="size-4 text-wolfie-accent" />Destinations</div>
          <ul className="mt-4 flex flex-wrap gap-2">
            {p.destination_tables.map((t, index) => (
              <li key={`${t}-${index}`} className="rounded-lg bg-wolfie-soft px-2.5 py-1.5 font-mono text-2xs">{t}</li>
            ))}
          </ul>
        </div>

        <div className="surface p-5">
          <div className="eyebrow">Freshness</div>
          <div className="mt-4">
            <FreshnessBar hours={p.freshness_hours} slaHours={p.freshness_sla_hours} />
          </div>
          <div className="mt-3 text-xs leading-5 text-wolfie-muted">
            data last materially changed: {p.last_change_at ? formatUtc(p.last_change_at) : "unknown"}
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Run history <span className="font-normal text-wolfie-muted">· 30 days</span></h2>
        <RunDurationChart data={daily} />
      </section>

      {p.latest_status === "failed" && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Latest error</h2>
          <pre className="overflow-auto rounded-2xl border border-state-failed/20 bg-state-failed/[.04] p-5 text-2xs whitespace-pre-wrap tabular text-state-failed">
            {redactSecrets(runs[0]?.error) || "(no message)"}
          </pre>
        </section>
      )}

      {snapshots.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold tracking-tight">Recent dataset snapshots</h2>
          <div className="table-shell overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left">Dataset</th>
                  <th className="px-4 py-2 text-right">Total rows</th>
                  <th className="px-4 py-2 text-right">Inserted</th>
                  <th className="px-4 py-2 text-right">Updated</th>
                  <th className="px-4 py-2 text-right">Unchanged</th>
                  <th className="px-4 py-2 text-left">Snapshot</th>
                </tr>
              </thead>
              <tbody>
                {snapshots.map((s: any) => (
                  <tr key={s.id}>
                    <td className="px-4 py-2 font-mono text-2xs">{s.dataset}</td>
                    <td className="px-4 py-2 text-right tabular">{(s.total_rows ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-2 text-right tabular">{(s.inserted_count ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-2 text-right tabular">{(s.updated_count ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-2 text-right tabular">{(s.unchanged_count ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-2 text-2xs text-wolfie-muted">{formatUtc(s.snapshot_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Recent runs</h2>
        <RunsList runs={runs} showPipeline={false} />
      </section>
    </div>
  );
}
