import { describe, expect, it } from "vitest";
import { redactSecrets } from "@/lib/format";

describe("redactSecrets", () => {
  it("redacts JWTs", () => {
    const text = "auth token = eyJabc123defg456hijk789.eyJmno456pqr.zzzzzz-longer-payload";
    expect(redactSecrets(text)).toContain("[jwt-redacted]");
  });

  it("redacts URL creds", () => {
    expect(redactSecrets("postgres://user:sup3rsecret@db.example.com/foo")).toContain("[redacted]@");
  });

  it("redacts Bearer tokens (defense in depth: authz + bearer redactors both fire)", () => {
    const out = redactSecrets("Authorization: Bearer abc.def.ghi");
    expect(out).toContain("[redacted]");
    expect(out).not.toContain("abc.def.ghi");
  });

  it("redacts GitHub PATs", () => {
    expect(redactSecrets("token=ghp_abcdefghijklmnopqrstuvwxyz1234")).toContain("[gh-pat-redacted]");
  });

  it("returns empty string on null", () => {
    expect(redactSecrets(null)).toBe("");
  });
});
