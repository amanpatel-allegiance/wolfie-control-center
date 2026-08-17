import { cn } from "@/lib/cn";
import { sla } from "@/lib/health";

export function FreshnessBar({ hours, slaHours }: { hours: number | null; slaHours: number }) {
  if (hours == null) return <span className="text-2xs text-wolfie-muted">never succeeded</span>;
  const { level, pct } = sla(hours, slaHours);
  const width = Math.min(100, pct);
  const color = {
    ok: "bg-state-healthy",
    warn: "bg-state-warning",
    danger: "bg-state-stale",
    breach: "bg-state-failed",
  }[level];
  return (
    <div className="w-full min-w-[130px]">
      <div className="flex items-center justify-between text-2xs text-wolfie-muted tabular">
        <span className="font-semibold text-wolfie-ink">{hours.toFixed(hours < 10 ? 1 : 0)}h old</span>
        <span>{Math.round(pct)}% of SLA</span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#EDF0F3]" title={`Freshness SLA: ${slaHours} hours`}>
        <div className={cn("h-full rounded-full transition-[width] duration-500", color)} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
