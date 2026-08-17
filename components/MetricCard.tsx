import { cn } from "@/lib/cn";
import { Activity, AlertTriangle, CheckCircle2, CircleGauge, Clock3, XCircle } from "lucide-react";

type Props = {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "healthy" | "warning" | "failed" | "running" | "stale";
};

const TONE = {
  default: { text: "text-wolfie-ink", bg: "bg-wolfie-soft", line: "bg-wolfie-muted", icon: CircleGauge },
  healthy: { text: "text-wolfie-ink", bg: "bg-state-healthy/10", line: "bg-state-healthy", icon: CheckCircle2 },
  warning: { text: "text-wolfie-ink", bg: "bg-state-warning/10", line: "bg-state-warning", icon: AlertTriangle },
  failed:  { text: "text-wolfie-ink", bg: "bg-state-failed/10", line: "bg-state-failed", icon: XCircle },
  running: { text: "text-wolfie-ink", bg: "bg-state-running/10", line: "bg-state-running", icon: Activity },
  stale:   { text: "text-wolfie-ink", bg: "bg-state-stale/10", line: "bg-state-stale", icon: Clock3 },
};

export function MetricCard({ label, value, hint, tone = "default" }: Props) {
  const style = TONE[tone];
  const Icon = style.icon;
  return (
    <div className="surface group relative overflow-hidden p-4 transition-colors hover:border-wolfie-muted/35 sm:p-5">
      <div className={cn("absolute inset-x-0 top-0 h-0.5", style.line)} />
      <div className="flex items-start justify-between gap-3">
        <div className="eyebrow">{label}</div>
        <span className={cn("grid size-8 place-items-center rounded-lg", style.bg)}>
          <Icon className={cn("size-4", tone === "default" ? "text-wolfie-muted" : tone === "healthy" ? "text-state-healthy" : tone === "warning" ? "text-state-warning" : tone === "failed" ? "text-state-failed" : tone === "running" ? "text-state-running" : "text-state-stale")} />
        </span>
      </div>
      <div className={cn("mt-3 truncate text-2xl font-semibold tracking-[-.025em] tabular sm:text-[1.75rem]", style.text)}>{value}</div>
      {hint && <div className="mt-1 text-2xs text-wolfie-muted">{hint}</div>}
    </div>
  );
}
