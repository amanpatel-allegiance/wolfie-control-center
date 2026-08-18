import { describe, expect, it } from "vitest";
import { formatRelative } from "@/lib/format";

describe("relative timestamps", () => {
  const now = new Date("2026-08-18T08:00:00Z");

  it("formats past timestamps", () => expect(formatRelative("2026-08-18T06:00:00Z", now)).toBe("2h ago"));
  it("formats future timestamps", () => expect(formatRelative("2026-08-18T23:15:00Z", now)).toBe("in 15h"));
});
