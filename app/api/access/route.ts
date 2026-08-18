import { NextResponse } from "next/server";
import { COMPANY_ACCESS_COOKIE, normalizeCompanyEmail, safeDashboardPath } from "@/lib/company-access";

export async function POST(request: Request) {
  const form = await request.formData();
  const email = normalizeCompanyEmail(form.get("email"));
  const next = safeDashboardPath(form.get("next"));

  if (!email) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "Please use a valid @allegiance.ae email address.");
    loginUrl.searchParams.set("next", next);
    return NextResponse.redirect(loginUrl, { status: 303 });
  }

  const response = NextResponse.redirect(new URL(next, request.url), { status: 303 });
  response.cookies.set(COMPANY_ACCESS_COOKIE, email, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
