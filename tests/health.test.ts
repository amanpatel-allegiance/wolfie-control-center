import { describe, expect, it } from "vitest";
import { computeHealthState, sla, hoursBetween } from "@/lib/health";

const NOW = new Date("2026-08-17T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3600_000).toISOString();

describe("computeHealthState precedence", () => {
  const base = {
    enabled: true,
    latest_status: null as any,
    latest_started_at: null as any,
    latest_heartbeat_at: null as any,
    last_success_started_at: null as any,
    freshness_sla_hours: 24,
    timeout_s: 3600,
    now: NOW,
  };

  it("returns 'disabled' when enabled=false, regardless of status", () => {
    expect(computeHealthState({ ...base, enabled: false, latest_status: "succeeded" })).toBe("disabled");
  });

  it("returns 'stuck' when running + no heartbeat + past timeout", () => {
    expect(
      computeHealthState({
        ...base,
        latest_status: "running",
        latest_started_at: hoursAgo(3), // > 3600s
        latest_heartbeat_at: hoursAgo(2), // > 30m stale
      }),
    ).toBe("stuck");
  });

  it("returns 'running' when running + fresh heartbeat", () => {
    expect(
      computeHealthState({
        ...base,
        latest_status: "running",
        latest_started_at: hoursAgo(0.5),
        latest_heartbeat_at: hoursAgo(0.01),
      }),
    ).toBe("running");
  });

  it("returns 'failed' when latest is failed even if a past run succeeded within SLA", () => {
    expect(
      computeHealthState({
        ...base,
        latest_status: "failed",
        last_success_started_at: hoursAgo(1),
      }),
    ).toBe("failed");
  });

  it("returns 'stale' when last success older than SLA", () => {
    expect(
      computeHealthState({
        ...base,
        latest_status: "succeeded",
        last_success_started_at: hoursAgo(48),
        freshness_sla_hours: 24,
      }),
    ).toBe("stale");
  });

  it("returns 'warning' on partial/succeeded_with_warnings within SLA", () => {
    expect(
      computeHealthState({
        ...base,
        latest_status: "partial",
        last_success_started_at: hoursAgo(6),
      }),
    ).toBe("warning");
  });

  it("returns 'healthy' on succeeded within SLA", () => {
    expect(
      computeHealthState({
        ...base,
        latest_status: "succeeded",
        last_success_started_at: hoursAgo(6),
      }),
    ).toBe("healthy");
  });

  it("returns 'unknown' when no successful run has ever happened", () => {
    expect(computeHealthState({ ...base, latest_status: "queued" })).toBe("running");
    expect(computeHealthState({ ...base, latest_status: null })).toBe("unknown");
  });
});

describe("sla levels", () => {
  it("classifies bands", () => {
    expect(sla(10, 100).level).toBe("ok");
    expect(sla(70, 100).level).toBe("warn");
    expect(sla(95, 100).level).toBe("danger");
    expect(sla(120, 100).level).toBe("breach");
  });
});

describe("hoursBetween", () => {
  it("computes positive difference", () => {
    expect(Math.round(hoursBetween("2026-08-17T12:00:00Z", "2026-08-17T09:00:00Z"))).toBe(3);
  });
});
