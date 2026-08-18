import { describe, expect, it } from "vitest";
import { deriveLiveHealthIncidents } from "@/lib/incidents";
import type { PipelineHealthRow } from "@/lib/types";

const pipeline = (overrides: Partial<PipelineHealthRow>): PipelineHealthRow => ({
  id: 1,
  key: "example",
  name: "Example Pipeline",
  description: null,
  source_id: 1,
  source_key: "example",
  jurisdiction: null,
  repository: null,
  scheduler: "github_actions",
  schedule_expression: "0 2 * * *",
  schedule_timezone: "UTC",
  refresh_strategy: "incremental",
  freshness_sla_hours: 24,
  expected_duration_s: null,
  timeout_s: null,
  destination_tables: [],
  enabled: true,
  latest_run_id: 10,
  latest_status: "succeeded",
  latest_started_at: "2026-08-15T01:55:00Z",
  latest_finished_at: "2026-08-15T02:00:00Z",
  latest_heartbeat_at: null,
  last_success_run_id: 10,
  last_success_started_at: "2026-08-15T01:55:00Z",
  last_success_finished_at: "2026-08-15T02:00:00Z",
  last_failure_run_id: null,
  last_failure_started_at: null,
  last_change_at: null,
  freshness_hours: 72,
  data_age_hours: 72,
  health_state: "stale",
  ...overrides,
});

describe("live health incidents", () => {
  it("derives a critical incident from real severe staleness", () => {
    const [incident] = deriveLiveHealthIncidents([pipeline({})]);
    expect(incident.severity).toBe("critical");
    expect(incident.firedAt).toBe("2026-08-16T02:00:00.000Z");
    expect(incident.description).toContain("72.0h");
  });

  it("does not duplicate a pipeline with a persisted open event", () => {
    const incidents = deriveLiveHealthIncidents([pipeline({})], [{ pipeline_id: 1, status: "open" } as never]);
    expect(incidents).toHaveLength(0);
  });
});
