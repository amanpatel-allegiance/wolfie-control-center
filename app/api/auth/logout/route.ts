import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { COMPANY_ACCESS_COOKIE } from "@/lib/company-access";

export async function POST(request: Request) {
  const sb = await supabaseServer();
  await sb.auth.signOut();
  const response = NextResponse.redirect(new URL("/login", request.url), { status: 303 });
  response.cookies.set(COMPANY_ACCESS_COOKIE, "", { path: "/", maxAge: 0 });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
