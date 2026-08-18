import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isLocalDashboardPreview } from "@/lib/local-preview";
import { COMPANY_ACCESS_COOKIE, normalizeCompanyEmail } from "@/lib/company-access";

const PUBLIC_PATHS = new Set<string>(["/login", "/auth/callback", "/api/access", "/favicon.ico"]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/cron/") || // cron endpoints check their own bearer
    PUBLIC_PATHS.has(pathname)
  ) {
    return NextResponse.next();
  }

  const { response, user } = await updateSession(request);
  const authenticatedEmail = normalizeCompanyEmail(user?.email);
  const companyEmail = normalizeCompanyEmail(request.cookies.get(COMPANY_ACCESS_COOKIE)?.value);
  if (!authenticatedEmail && !companyEmail && !isLocalDashboardPreview() && !pathname.startsWith("/api/")) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    const redirectResponse = NextResponse.redirect(loginUrl);
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico|css|js|map)$).*)"],
};
