import { cn } from "@/lib/cn";
import type { HealthState, RunStatus } from "@/lib/types";

const HEALTH_STYLES: Record<HealthState, string> = {
  healthy:  "bg-state-healthy/12 text-state-healthy",
  running:  "bg-state-running/12 text-state-running",
  warning:  "bg-state-warning/12 text-state-warning",
  delayed:  "bg-state-warning/12 text-state-warning",
  stale:    "bg-state-stale/12 text-state-stale",
  failed:   "bg-state-failed/12 text-state-failed",
  stuck:    "bg-state-stuck/12 text-state-stuck",
  disabled: "bg-state-disabled/12 text-state-disabled",
  unknown:  "bg-state-unknown/12 text-state-unknown",
};

const RUN_STYLES: Partial<Record<RunStatus, string>> = {
  scheduled:                "bg-wolfie-soft text-wolfie-muted ring-wolfie-border",
  queued:                   "bg-state-running/12 text-state-running ring-state-running/30",
  running:                  "bg-state-running/12 text-state-running ring-state-running/30",
  succeeded:                "bg-state-healthy/12 text-state-healthy ring-state-healthy/30",
  succeeded_with_warnings:  "bg-state-warning/12 text-state-warning ring-state-warning/30",
  partial:                  "bg-state-warning/12 text-state-warning ring-state-warning/30",
  unchanged:                "bg-state-healthy/12 text-state-healthy ring-state-healthy/30",
  failed:                   "bg-state-failed/12  text-state-failed  ring-state-failed/30",
  timed_out:                "bg-state-failed/12  text-state-failed  ring-state-failed/30",
  cancelled:                "bg-state-disabled/12 text-state-disabled ring-state-disabled/30",
  skipped:                  "bg-state-disabled/12 text-state-disabled ring-state-disabled/30",
};

export function HealthBadge({ state, size = "sm" }: { state: HealthState; size?: "xs" | "sm" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-bold capitalize",
        size === "xs" ? "px-2 py-0.5 text-[10px]" : "px-2 py-1 text-[10px]",
        HEALTH_STYLES[state],
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          state === "running" && "animate-pulse",
        )}
        style={{ background: "currentColor" }}
      />
      {state}
    </span>
  );
}

export function RunStatusBadge({ status }: { status: RunStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold capitalize",
        RUN_STYLES[status] ?? "bg-wolfie-soft text-wolfie-muted ring-wolfie-border",
      )}
    >
      <span className={cn("size-1.5 rounded-full bg-current", status === "running" && "animate-pulse")} />
      {status.replaceAll("_", " ")}
    </span>
  );
}
