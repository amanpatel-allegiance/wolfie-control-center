import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code) {
    const sb = await supabaseServer();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent("The sign-in link is invalid or has expired. Request a new link.")}`, url.origin));
  }
  if (!code) return NextResponse.redirect(new URL("/login?error=Missing%20authentication%20code.", url.origin));
  return NextResponse.redirect(new URL("/", url.origin));
}
