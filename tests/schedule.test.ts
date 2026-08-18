import { describe, expect, it } from "vitest";
import { cronOccurrencesBetween, describeCron, nextCronOccurrence } from "@/lib/schedule";

describe("cron descriptions", () => {
  it("describes common schedules", () => {
    expect(describeCron("0 2 * * *")).toBe("Daily at 02:00");
    expect(describeCron("*/15 * * * *")).toBe("Every 15 minutes");
  });
  it("preserves unfamiliar expressions", () => expect(describeCron("0 4 * * 1")).toBe("0 4 * * 1"));

  it("calculates the next occurrence in the configured timezone", () => {
    expect(nextCronOccurrence("15 23 * * *", "UTC", new Date("2026-08-18T20:00:00Z"))?.toISOString()).toBe("2026-08-18T23:15:00.000Z");
    expect(nextCronOccurrence("0 2 * * 1", "Asia/Dubai", new Date("2026-08-16T22:30:00Z"))?.toISOString()).toBe("2026-08-23T22:00:00.000Z");
  });

  it("returns only real occurrences inside a window", () => {
    const rows = cronOccurrencesBetween("30 2 */3 * *", "UTC", new Date("2026-08-01T00:00:00Z"), new Date("2026-08-08T00:00:00Z"));
    expect(rows.map((row) => row.toISOString())).toEqual([
      "2026-08-01T02:30:00.000Z",
      "2026-08-04T02:30:00.000Z",
      "2026-08-07T02:30:00.000Z",
    ]);
  });
});
