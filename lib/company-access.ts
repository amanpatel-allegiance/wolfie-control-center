export const COMPANY_ACCESS_COOKIE = "wcc_company_access";
export const COMPANY_EMAIL_DOMAIN = "allegiance.ae";

const COMPANY_EMAIL_PATTERN = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@allegiance\.ae$/i;

export function normalizeCompanyEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return COMPANY_EMAIL_PATTERN.test(email) ? email : null;
}

export function isCompanyEmail(value: unknown): value is string {
  return normalizeCompanyEmail(value) !== null;
}

export function safeDashboardPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/";
  try {
    const base = "https://wolfie.internal";
    const parsed = new URL(value, base);
    if (parsed.origin !== base || parsed.pathname === "/api" || parsed.pathname.startsWith("/api/")) return "/";
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/";
  }
}
