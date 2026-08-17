import Link from "next/link";
import type { Run } from "@/lib/types";
import { RunStatusBadge } from "@/components/StatusBadge";
import { formatDuration, formatRelative } from "@/lib/format";
import { ArrowUpRight } from "lucide-react";

export function RunsList({ runs, showPipeline = true, limit }: { runs: Run[]; showPipeline?: boolean; limit?: number }) {
  const rows = typeof limit === "number" ? runs.slice(0, limit) : runs;
  if (rows.length === 0) {
    return <div className="surface border-dashed px-4 py-10 text-center text-sm text-wolfie-muted">No runs to display</div>;
  }
  return (
    <div className="table-shell overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th className="text-left">Run</th>
            {showPipeline && <th className="text-left">Pipeline</th>}
            <th className="text-left">Status</th>
            <th className="text-left">Trigger</th>
            <th className="text-left">Started</th>
            <th className="text-right">Duration</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-wolfie-soft/50">
              <td className="tabular">
                <Link href={`/runs/${r.id}`} className="group inline-flex items-center gap-1 font-semibold text-wolfie-ink hover:text-wolfie-accent">#{r.id}<ArrowUpRight className="size-3 opacity-0 transition group-hover:opacity-100" /></Link>
                <div className="text-2xs text-wolfie-muted truncate max-w-[220px]">{r.kind}</div>
              </td>
              {showPipeline && (
                <td>
                  {r.pipeline_key ? (
                    <Link href={`/pipelines/${r.pipeline_key}`} className="font-medium text-wolfie-ink hover:text-wolfie-accent">
                      {r.pipeline_name ?? r.pipeline_key}
                    </Link>
                  ) : (
                    <span className="text-wolfie-muted">unmapped</span>
                  )}
                </td>
              )}
              <td><RunStatusBadge status={r.status} /></td>
              <td className="text-2xs text-wolfie-muted">{r.trigger}{r.attempt > 1 && ` · attempt ${r.attempt}`}</td>
              <td className="whitespace-nowrap text-2xs text-wolfie-muted">{formatRelative(r.started_at)}</td>
              <td className="text-right text-2xs text-wolfie-muted tabular">{formatDuration(r.duration_s)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
