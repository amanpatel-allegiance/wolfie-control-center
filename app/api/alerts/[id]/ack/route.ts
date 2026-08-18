import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const alertId = Number(id);
  if (!Number.isSafeInteger(alertId) || alertId <= 0) return NextResponse.json({ ok: false, message: "invalid alert" }, { status: 400 });
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
    .eq("id", alertId)
    .eq("status", "open");
  if (error) return NextResponse.json({ ok: false, message: "acknowledgement failed" }, { status: 500 });
  if (request.headers.get("accept")?.includes("application/json")) return NextResponse.json({ ok: true });
  return NextResponse.redirect(new URL("/incidents", request.url), { status: 303 });
}
