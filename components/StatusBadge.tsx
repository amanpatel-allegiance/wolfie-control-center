import { cn } from "@/lib/cn";
import type { HealthState, RunStatus } from "@/lib/types";

const HEALTH_STYLES: Record<HealthState, string> = {
  healthy:  "bg-[#E9F8F1] text-[#087950]",
  running:  "bg-[#EDF4FF] text-[#1D5CCC]",
  warning:  "bg-[#FFF6E5] text-[#A55C00]",
  delayed:  "bg-[#FFF6E5] text-[#A55C00]",
  stale:    "bg-[#FFF6E5] text-[#A55C00]",
  failed:   "bg-[#FFF0F0] text-[#C92E2E]",
  stuck:    "bg-[#FFF0F0] text-[#C92E2E]",
  disabled: "bg-[#F2F4F7] text-[#667085]",
  unknown:  "bg-[#F2F4F7] text-[#667085]",
};

const RUN_STYLES: Partial<Record<RunStatus, string>> = {
  scheduled:                "bg-[#F2F4F7] text-[#667085]",
  queued:                   "bg-[#EDF4FF] text-[#1D5CCC]",
  running:                  "bg-[#EDF4FF] text-[#1D5CCC]",
  succeeded:                "bg-[#E9F8F1] text-[#087950]",
  succeeded_with_warnings:  "bg-[#FFF6E5] text-[#A55C00]",
  partial:                  "bg-[#FFF6E5] text-[#A55C00]",
  unchanged:                "bg-[#E9F8F1] text-[#087950]",
  failed:                   "bg-[#FFF0F0] text-[#C92E2E]",
  timed_out:                "bg-[#FFF0F0] text-[#C92E2E]",
  cancelled:                "bg-[#F2F4F7] text-[#667085]",
  skipped:                  "bg-[#F2F4F7] text-[#667085]",
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
