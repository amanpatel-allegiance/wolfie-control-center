import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const sb = await supabaseServer();
  const { data: userRes } = await sb.auth.getUser();
  const user = userRes.user;
  if (!user) return NextResponse.json({ ok: false, message: "unauthenticated" }, { status: 401 });
  const { data: op } = await sb.from("wcc_operators").select("role").eq("user_id", user.id).maybeSingle();
  if (!(op?.role === "operator" || op?.role === "admin")) {
    return NextResponse.json({ ok: false, message: "operator role required" }, { status: 403 });
  }
  const { error } = await sb
    .from("wcc_pipeline_alert_events")
    .update({ status: "acknowledged", acknowledged_at: new Date().toISOString(), acknowledged_by: user.id })
    .eq("id", Number(id));
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  return NextResponse.redirect(new URL("/alerts", request.url), { status: 303 });
}
