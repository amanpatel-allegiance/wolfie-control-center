import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const alertId = Number(id);
  if (!Number.isSafeInteger(alertId) || alertId <= 0) return NextResponse.json({ ok: false, message: "invalid alert" }, { status: 400 });
  const supabase = await supabaseServer();
  const { data: userResult } = await supabase.auth.getUser();
  const user = userResult.user;
  if (!user) return NextResponse.json({ ok: false, message: "unauthenticated" }, { status: 401 });
  const { data: operator } = await supabase.from("wcc_operators").select("role").eq("user_id", user.id).maybeSingle();
  if (!(operator?.role === "operator" || operator?.role === "admin")) return NextResponse.json({ ok: false, message: "operator role required" }, { status: 403 });
  const { data, error } = await supabase.from("wcc_pipeline_alert_events").update({ status: "resolved", resolved_at: new Date().toISOString() }).eq("id", alertId).in("status", ["open", "acknowledged"]).select("id").maybeSingle();
  if (error) return NextResponse.json({ ok: false, message: "resolution failed" }, { status: 500 });
  if (!data) return NextResponse.json({ ok: false, message: "incident is already resolved or unavailable" }, { status: 409 });
  if (request.headers.get("accept")?.includes("application/json")) return NextResponse.json({ ok: true });
  return NextResponse.redirect(new URL("/alerts", request.url), { status: 303 });
}
