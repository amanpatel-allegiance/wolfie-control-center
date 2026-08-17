import type { StageRow } from "@/lib/types";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/cn";

function stageDurSec(s: StageRow): number | null {
  if (!s.finished_at) return null;
  return Math.max(0, (new Date(s.finished_at).getTime() - new Date(s.started_at).getTime()) / 1000);
}

export function StageTimeline({ stages }: { stages: StageRow[] }) {
  if (stages.length === 0) {
    return (
      <div className="surface border-dashed px-4 py-10 text-center text-sm text-wolfie-muted">
        No stage-level telemetry — instrument this pipeline to see per-stage timing.
      </div>
    );
  }
  const total = stages.reduce((acc, s) => acc + (stageDurSec(s) ?? 0), 0) || 1;
  return (
    <div className="surface overflow-hidden">
      <div className="border-b border-wolfie-border px-5 py-4 eyebrow">
        Stage timeline
      </div>
      <ul className="divide-y divide-wolfie-border/80">
        {stages.map((s) => {
          const dur = stageDurSec(s);
          const width = ((dur ?? 0) / total) * 100;
          return (
            <li key={s.id} className="grid grid-cols-[120px_1fr_80px] items-center gap-3 px-5 py-3.5 text-sm sm:grid-cols-[160px_1fr_100px_80px]">
              <div>
                <div className="font-medium">{s.stage}</div>
                <div className="text-2xs text-wolfie-muted">{s.status}</div>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-wolfie-soft">
                <div
                  className={cn(
                    "h-full rounded-full",
                    s.status === "succeeded" ? "bg-state-healthy" :
                    s.status === "failed"    ? "bg-state-failed"  :
                    s.status === "running"   ? "bg-state-running" : "bg-state-disabled",
                  )}
                  style={{ width: `${Math.max(2, width)}%` }}
                />
              </div>
              <div className="hidden text-right text-2xs text-wolfie-muted tabular sm:block">
                {s.input_count != null || s.output_count != null ? (
                  <>{s.input_count ?? "—"} → {s.output_count ?? "—"}</>
                ) : "—"}
              </div>
              <div className="text-2xs tabular text-right">{formatDuration(dur)}</div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
