import { cn } from "@/lib/cn";
import type { ReactNode } from "react";
import { Activity, AlertTriangle, CheckCircle2, CircleGauge, Clock3, XCircle } from "lucide-react";

type Props = {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "healthy" | "warning" | "failed" | "running" | "stale";
  icon?: ReactNode;
};

const TONE = {
  default: { text: "text-wolfie-ink", bg: "bg-wolfie-soft", iconText: "text-wolfie-muted", icon: CircleGauge },
  healthy: { text: "text-state-healthy", bg: "bg-state-healthy/10", iconText: "text-state-healthy", icon: CheckCircle2 },
  warning: { text: "text-state-warning", bg: "bg-state-warning/10", iconText: "text-state-warning", icon: AlertTriangle },
  failed:  { text: "text-state-failed", bg: "bg-state-failed/10", iconText: "text-state-failed", icon: XCircle },
  running: { text: "text-state-running", bg: "bg-state-running/10", iconText: "text-state-running", icon: Activity },
  stale:   { text: "text-state-warning", bg: "bg-state-warning/10", iconText: "text-state-warning", icon: Clock3 },
};

export function MetricCard({ label, value, hint, tone = "default", icon }: Props) {
  const style = TONE[tone];
  const Icon = style.icon;
  return (
    <div className="metric-card surface group min-h-[105px] p-[15px]">
      <div className="flex items-center gap-[10px] text-xs text-[#344054]">
        <span className={cn("metric-icon grid size-[34px] place-items-center rounded-full", style.bg, style.iconText)}>
          {icon ?? <Icon className={cn("size-4", style.iconText)} />}
        </span>
        <span>{label}</span>
      </div>
      <div className={cn("mb-[3px] mt-2 truncate text-[27px] font-[750] tracking-[-.04em] tabular", style.text)}>{value}</div>
      {hint && <small className="text-[11px] text-wolfie-muted">{hint}</small>}
    </div>
  );
}
