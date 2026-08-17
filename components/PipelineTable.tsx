import Link from "next/link";
import type { PipelineHealthRow } from "@/lib/types";
import { HealthBadge, RunStatusBadge } from "@/components/StatusBadge";
import { FreshnessBar } from "@/components/FreshnessBar";
import { formatRelative, formatDuration } from "@/lib/format";
import { ArrowUpRight, Database } from "lucide-react";

export function PipelineTable({ rows }: { rows: PipelineHealthRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="surface border-dashed p-10 text-center text-wolfie-muted">
        <Database className="mx-auto mb-3 size-7 opacity-40" />
        No pipelines match these filters.
      </div>
    );
  }
  return (
    <div className="table-shell overflow-x-auto">
      <table className="data-table min-w-[1100px]">
        <thead>
          <tr>
            <th className="text-left">Pipeline</th><th className="text-left">Source</th><th className="text-left">Health</th><th className="text-left">Latest run</th><th className="text-left">Freshness</th><th className="text-left">Schedule</th><th className="text-left">Scheduler</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id ?? r.key}>
              <td>
                <Link href={`/pipelines/${r.key}`} className="group inline-flex items-center gap-1 font-semibold text-wolfie-ink hover:text-wolfie-accent">
                  {r.name}<ArrowUpRight className="size-3 opacity-0 transition group-hover:opacity-100" />
                </Link>
                <div className="text-2xs text-wolfie-muted">{r.key}</div>
              </td>
              <td>
                <div className="font-medium">{r.source_key}</div>
                <div className="text-2xs text-wolfie-muted">{r.jurisdiction ?? "—"}</div>
              </td>
              <td>
                <HealthBadge state={r.health_state} />
              </td>
              <td className="whitespace-nowrap">
                <div className="flex flex-col gap-1">
                  {r.latest_status && <RunStatusBadge status={r.latest_status} />}
                  <span className="text-2xs text-wolfie-muted">{formatRelative(r.latest_started_at)}</span>
                </div>
              </td>
              <td className="min-w-[180px]">
                <FreshnessBar hours={r.freshness_hours} slaHours={r.freshness_sla_hours} />
              </td>
              <td className="text-2xs text-wolfie-muted">
                <code className="rounded bg-wolfie-soft px-1 py-0.5 tabular">{r.schedule_expression || "—"}</code>
                <div>{r.schedule_timezone}</div>
              </td>
              <td className="text-2xs text-wolfie-muted">
                {r.scheduler}
                {r.expected_duration_s && (
                  <div>~ {formatDuration(r.expected_duration_s)}</div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
