import { NextResponse } from "next/server";
import { supabaseServiceRole } from "@/lib/supabase/server";
import { env } from "@/lib/env";

/**
 * Housekeeping: mark runs stuck-in-'running' as timed_out if their pipeline timeout has elapsed
 * AND they have no recent heartbeat. This lets the health rollups stop showing them as active.
 */
async function handle(request: Request) {
  const secret = env.alertTickSecret();
  if (secret) {
    const authz = request.headers.get("authorization") ?? "";
    if (authz !== `Bearer ${secret}`) return NextResponse.json({ ok: false, message: "forbidden" }, { status: 403 });
  }
  const sb = supabaseServiceRole();
  const { data } = await sb
    .from("sync_runs")
    .select("id, pipeline_id, started_at, heartbeat_at")
    .in("status", ["running", "queued"]);
  if (!data) return NextResponse.json({ ok: true, updated: 0 });

  const { data: pipelines } = await sb.from("wcc_pipelines").select("id, timeout_s");
  const timeoutById = new Map<number, number>((pipelines ?? []).map((p: any) => [p.id, p.timeout_s ?? 7200]));

  let updated = 0;
  const now = Date.now();
  for (const r of data as any[]) {
    const startedAge = (now - new Date(r.started_at).getTime()) / 1000;
    const hbAge = r.heartbeat_at ? (now - new Date(r.heartbeat_at).getTime()) / 1000 : Infinity;
    const timeoutS = (r.pipeline_id && timeoutById.get(r.pipeline_id)) || 7200;
    if (startedAge > timeoutS && hbAge > 1800) {
      await sb
        .from("sync_runs")
        .update({ status: "timed_out", finished_at: new Date().toISOString(), error: (r.status === "queued" ? "queued past timeout" : "no heartbeat past timeout") })
        .eq("id", r.id);
      updated++;
    }
  }
  return NextResponse.json({ ok: true, updated });
}

export const GET  = handle;
export const POST = handle;
