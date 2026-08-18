import type { AlertEvent, PipelineHealthRow } from "@/lib/types";

export type LiveHealthIncident = {
  key: string;
  pipeline: PipelineHealthRow;
  severity: "warning" | "critical";
  title: string;
  description: string;
  firedAt: string;
};

const actionableStates = new Set(["warning", "delayed", "stale", "failed", "stuck", "unknown"]);

function thresholdCrossedAt(pipeline: PipelineHealthRow) {
  if (pipeline.health_state === "failed") return pipeline.last_failure_started_at ?? pipeline.latest_started_at;
  if (pipeline.health_state === "stuck") return pipeline.latest_heartbeat_at ?? pipeline.latest_started_at;
  if (pipeline.health_state === "stale" && pipeline.last_success_finished_at) {
    const threshold = new Date(pipeline.last_success_finished_at).getTime() + pipeline.freshness_sla_hours * 3_600_000;
    if (Number.isFinite(threshold)) return new Date(threshold).toISOString();
  }
  return pipeline.latest_finished_at ?? pipeline.latest_started_at ?? pipeline.last_success_finished_at;
}

function incidentCopy(pipeline: PipelineHealthRow) {
  const freshness = pipeline.freshness_hours == null ? "unknown" : `${pipeline.freshness_hours.toFixed(1)}h`;
  switch (pipeline.health_state) {
    case "failed":
      return `The latest recorded production run failed. Current data freshness is ${freshness}.`;
    case "stuck":
      return "The latest production run exceeded its timeout without a recent heartbeat.";
    case "stale":
      return `Data freshness is ${freshness}, beyond the configured ${pipeline.freshness_sla_hours}h SLA.`;
    case "warning":
    case "delayed":
      return `The latest production telemetry reports ${pipeline.latest_status?.replaceAll("_", " ") ?? pipeline.health_state}.`;
    default:
      return "No successful production execution has been associated with this registered pipeline.";
  }
}

export function deriveLiveHealthIncidents(pipelines: PipelineHealthRow[], events: AlertEvent[] = []): LiveHealthIncident[] {
  const pipelinesWithPersistedEvents = new Set(
    events
      .filter((event) => event.status !== "resolved" && event.status !== "expired" && event.pipeline_id != null)
      .map((event) => event.pipeline_id),
  );

  return pipelines
    .filter((pipeline) => pipeline.enabled && actionableStates.has(pipeline.health_state) && !pipelinesWithPersistedEvents.has(pipeline.id))
    .map((pipeline) => {
      const severeStaleness = pipeline.health_state === "stale"
        && pipeline.freshness_hours != null
        && pipeline.freshness_hours >= pipeline.freshness_sla_hours * 2;
      const severity: LiveHealthIncident["severity"] = pipeline.health_state === "failed" || pipeline.health_state === "stuck" || severeStaleness ? "critical" : "warning";
      return {
        key: `health-${pipeline.id}`,
        pipeline,
        severity,
        title: `${pipeline.name} is ${pipeline.health_state}`,
        description: incidentCopy(pipeline),
        firedAt: thresholdCrossedAt(pipeline) ?? new Date(0).toISOString(),
      };
    })
    .sort((left, right) => {
      if (left.severity !== right.severity) return left.severity === "critical" ? -1 : 1;
      return new Date(right.firedAt).getTime() - new Date(left.firedAt).getTime();
    });
}
