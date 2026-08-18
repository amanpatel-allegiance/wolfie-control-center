/**
 * Keeps the production dashboard authenticated while making the local design
 * reference available at the root URL during development.
 */
export function isLocalDashboardPreview() {
  return process.env.NODE_ENV === "development" && process.env.WCC_REQUIRE_LOCAL_AUTH !== "1";
}
