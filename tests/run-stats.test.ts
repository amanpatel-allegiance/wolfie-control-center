import { describe, expect, it } from "vitest";
import { changedRows, processedRows, rejectedRows, runMode } from "@/lib/run-stats";

describe("run stat normalization", () => {
  it("uses direct counters when present", () => {
    const run = { stats: { rows_seen: 120, rows_upserted: 14, rows_rejected: 2, mode: "incremental" }, warning_count: 0, kind: "sync" };
    expect(processedRows(run)).toBe(120); expect(changedRows(run)).toBe(14); expect(rejectedRows(run)).toBe(2); expect(runMode(run)).toBe("incremental");
  });
  it("sums entity upsert counters without inventing unavailable values", () => {
    expect(changedRows({ stats: { emirates_rows_upserted: 4, areas_rows_upserted: 6 } })).toBe(10);
    expect(processedRows({ stats: {} })).toBeNull();
  });
});
