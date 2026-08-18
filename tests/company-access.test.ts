import { describe, expect, it } from "vitest";
import { normalizeCompanyEmail, safeDashboardPath } from "@/lib/company-access";

describe("company access", () => {
  it("accepts and normalizes an exact Allegiance address", () => {
    expect(normalizeCompanyEmail("  Aman.Patel@ALLEGIANCE.AE ")).toBe("aman.patel@allegiance.ae");
  });

  it.each([
    "person@example.com",
    "person@sub.allegiance.ae",
    "@allegiance.ae",
    "person@allegiance.ae.example.com",
    "person allegiance@allegiance.ae",
  ])("rejects %s", (email) => expect(normalizeCompanyEmail(email)).toBeNull());

  it("only preserves internal dashboard redirects", () => {
    expect(safeDashboardPath("/runs?status=failed")).toBe("/runs?status=failed");
    expect(safeDashboardPath("//evil.example")).toBe("/");
    expect(safeDashboardPath("/\\evil.example")).toBe("/");
    expect(safeDashboardPath("https://evil.example")).toBe("/");
    expect(safeDashboardPath("/api/auth/logout")).toBe("/");
  });
});
