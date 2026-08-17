import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { getRun, getRunLogs, getRunStages } from "@/lib/data";
import { RunStatusBadge } from "@/components/StatusBadge";
import { MetricCard } from "@/components/MetricCard";
import { StageTimeline } from "@/components/StageTimeline";
import { formatDuration, formatUtc, redactSecrets } from "@/lib/format";
import { ArrowLeft, Braces, TerminalSquare } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RunDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  if (!data.user) redirect("/login");

  const runId = Number(id);
  if (!Number.isFinite(runId)) notFound();

  const [run, stages, logs] = await Promise.all([
    getRun(runId),
    getRunStages(runId),
    getRunLogs(runId, 300),
  ]);
  if (!run) notFound();

  const stats: any = run.stats ?? {};

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-4 flex items-center gap-2 text-xs text-wolfie-muted">
          <Link href="/pipelines" className="inline-flex items-center gap-1 font-medium hover:text-wolfie-accent"><ArrowLeft className="size-3.5" /> Pipelines</Link>
          <span className="text-wolfie-border">/</span>
          {run.pipeline_key ? (
            <Link href={`/pipelines/${run.pipeline_key}`} className="hover:underline">{run.pipeline_key}</Link>
          ) : (
            <span>(unmapped)</span>
          )}
          <span className="text-wolfie-border">/</span>
          <span>run #{run.id}</span>
        </div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="eyebrow mb-2">Execution detail</div>
            <h1 className="page-title">Run #{run.id}</h1>
            <p className="page-copy font-mono">{run.kind} · corr {run.correlation_id.slice(0, 8)}</p>
          </div>
          <RunStatusBadge status={run.status} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <MetricCard label="Started"    value={formatUtc(run.started_at)} />
        <MetricCard label="Finished"   value={run.finished_at ? formatUtc(run.finished_at) : "—"} />
        <MetricCard label="Duration"   value={formatDuration(run.duration_s)} />
        <MetricCard label="Trigger"    value={run.trigger} hint={`attempt ${run.attempt}`} />
        <MetricCard label="Environment" value={run.environment} hint={run.commit_sha ? `sha ${run.commit_sha.slice(0, 7)}` : undefined} />
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Stages</h2>
        <StageTimeline stages={stages} />
      </section>

      {Object.keys(stats).length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold tracking-tight"><Braces className="size-5 text-wolfie-accent" />Counters &amp; stats</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Object.entries(stats)
              .filter(([, v]) => typeof v === "number" || typeof v === "string" || typeof v === "boolean")
              .slice(0, 12)
              .map(([k, v]) => (
                <MetricCard key={k} label={k} value={String(v)} />
              ))}
          </div>
          <details className="mt-3">
            <summary className="cursor-pointer text-xs font-medium text-wolfie-muted hover:text-wolfie-ink">Full stats JSON</summary>
            <pre className="surface mt-2 overflow-auto p-4 text-2xs whitespace-pre-wrap tabular">
              {JSON.stringify(stats, null, 2)}
            </pre>
          </details>
        </section>
      )}

      {(run.error || run.error_details) && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-state-failed">Error</h2>
          <pre className="overflow-auto rounded-2xl border border-state-failed/20 bg-state-failed/[.04] p-5 text-2xs whitespace-pre-wrap tabular text-state-failed">
            {redactSecrets(run.error ?? "")}
            {run.error_details ? `\n\n${JSON.stringify(run.error_details, null, 2)}` : ""}
          </pre>
        </section>
      )}

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold tracking-tight"><TerminalSquare className="size-5 text-wolfie-accent" />Logs</h2>
        {logs.length === 0 ? (
          <div className="surface border-dashed px-4 py-10 text-center text-sm text-wolfie-muted">
            No log messages
          </div>
        ) : (
          <div className="surface max-h-[520px] overflow-auto font-mono">
            <table className="w-full text-2xs">
              <thead className="bg-wolfie-soft sticky top-0 uppercase tracking-wide text-wolfie-muted">
                <tr>
                  <th className="px-3 py-1.5 text-left w-40">time</th>
                  <th className="px-3 py-1.5 text-left w-16">level</th>
                  <th className="px-3 py-1.5 text-left">message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-wolfie-border/60">
                {logs.map((l: any) => (
                  <tr key={l.id}>
                    <td className="px-3 py-1 whitespace-nowrap tabular">{formatUtc(l.created_at)}</td>
                    <td className={`px-3 py-1 font-medium ${l.level === "error" ? "text-state-failed" : l.level === "warn" ? "text-state-warning" : "text-wolfie-muted"}`}>{l.level}</td>
                    <td className="px-3 py-1"><span className="whitespace-pre-wrap tabular">{redactSecrets(l.message)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
