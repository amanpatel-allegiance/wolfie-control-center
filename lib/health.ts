// Central, testable health-state logic. Mirrors the SQL view wcc_v_pipeline_health
// so the UI can also compute freshness client-side for live-running pipelines.

import type { HealthState, RunStatus } from "@/lib/types";

export type HealthInput = {
  enabled: boolean;
  latest_status: RunStatus | null;
  latest_started_at: string | null;      // ISO
  latest_heartbeat_at: string | null;    // ISO
  last_success_started_at: string | null;
  freshness_sla_hours: number;
  timeout_s: number | null;
  now?: Date;
};

const HEARTBEAT_STUCK_MINUTES = 30;

/** hours between two ISO timestamps (a - b) */
export function hoursBetween(a: string | Date, b: string | Date): number {
  const ta = typeof a === "string" ? new Date(a).getTime() : a.getTime();
  const tb = typeof b === "string" ? new Date(b).getTime() : b.getTime();
  return (ta - tb) / 3_600_000;
}

/** precedence: disabled > stuck > failed > running > stale > warning > healthy > unknown */
export function computeHealthState(input: HealthInput): HealthState {
  const now = input.now ?? new Date();

  if (!input.enabled) return "disabled";

  // Stuck detection: status=running, heartbeat missing/old, timeout exceeded
  if (input.latest_status === "running" && input.latest_started_at) {
    const hbAge = input.latest_heartbeat_at
      ? (now.getTime() - new Date(input.latest_heartbeat_at).getTime()) / 60_000
      : Infinity;
    const startedAgeSec = (now.getTime() - new Date(input.latest_started_at).getTime()) / 1000;
    const timeoutSec = input.timeout_s ?? 2 * 3600;
    if (hbAge > HEARTBEAT_STUCK_MINUTES && startedAgeSec > timeoutSec) {
      return "stuck";
    }
    return "running";
  }

  if (input.latest_status === "queued") return "running";

  if (input.latest_status === "failed" || input.latest_status === "timed_out") return "failed";

  if (!input.last_success_started_at) return "unknown";

  const freshnessHours = hoursBetween(now, input.last_success_started_at);
  if (freshnessHours > input.freshness_sla_hours) return "stale";

  if (input.latest_status === "succeeded_with_warnings" || input.latest_status === "partial") {
    return "warning";
  }

  if (input.latest_status === "succeeded" || input.latest_status === "unchanged") return "healthy";

  return "unknown";
}

export function sla(hours: number, slaHours: number) {
  const pct = (hours / slaHours) * 100;
  if (pct < 60) return { level: "ok" as const, pct };
  if (pct < 90) return { level: "warn" as const, pct };
  if (pct < 100) return { level: "danger" as const, pct };
  return { level: "breach" as const, pct };
}
