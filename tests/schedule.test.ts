import { describe, expect, it } from "vitest";
import { describeCron } from "@/lib/schedule";

describe("cron descriptions", () => {
  it("describes common schedules", () => {
    expect(describeCron("0 2 * * *")).toBe("Daily at 02:00");
    expect(describeCron("*/15 * * * *")).toBe("Every 15 minutes");
  });
  it("preserves unfamiliar expressions", () => expect(describeCron("0 4 * * 1")).toBe("0 4 * * 1"));
});
