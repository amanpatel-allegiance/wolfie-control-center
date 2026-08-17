import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer, supabaseServiceRole } from "@/lib/supabase/server";
import { dispatchPipeline } from "@/lib/dispatch";

const bodySchema = z.object({
  mode: z.enum(["incremental", "full", "dry-run", "backfill", "retry"]),
  note: z.string().max(500).optional(),
});

// naive in-memory rate limiter: 1 request per 10s per (userId, pipeline)
const recent = new Map<string, number>();

export async function POST(request: Request, ctx: { params: Promise<{ key: string }> }) {
  const { key } = await ctx.params;
  const sb = await supabaseServer();
  const { data: userRes } = await sb.auth.getUser();
  const user = userRes.user;
  if (!user) return NextResponse.json({ ok: false, message: "unauthenticated" }, { status: 401 });

  const { data: op } = await sb.from("wcc_operators").select("role").eq("user_id", user.id).maybeSingle();
  const role = op?.role ?? "viewer";
  if (role !== "operator" && role !== "admin") {
    return NextResponse.json({ ok: false, message: "operator role required" }, { status: 403 });
  }

  const rlKey = `${user.id}:${key}`;
  const last = recent.get(rlKey) ?? 0;
  if (Date.now() - last < 10_000) {
    return NextResponse.json({ ok: false, message: "rate limited, wait a moment" }, { status: 429 });
  }
  recent.set(rlKey, Date.now());

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ ok: false, message: parsed.error.message }, { status: 400 });
  const { mode, note } = parsed.data;

  const { data: pipeline, error: perr } = await sb
    .from("wcc_pipelines")
    .select("id, key, scheduler, enabled")
    .eq("key", key)
    .maybeSingle();
  if (perr || !pipeline) return NextResponse.json({ ok: false, message: "pipeline not found" }, { status: 404 });
  if (!pipeline.enabled) return NextResponse.json({ ok: false, message: "pipeline is disabled" }, { status: 409 });

  // Insert audit row via service-role (RLS-safe: we've already authorized)
  const svc = supabaseServiceRole();
  const { data: audit } = await svc
    .from("wcc_pipeline_manual_runs")
    .insert({
      pipeline_id: pipeline.id,
      requested_by: user.id,
      mode,
      parameters: {},
      note,
      dispatch_status: "pending",
    })
    .select()
    .single();

  const result = await dispatchPipeline(pipeline.key, pipeline.scheduler, mode);

  await svc
    .from("wcc_pipeline_manual_runs")
    .update({
      dispatch_status: result.ok ? "dispatched" : "failed",
      dispatch_target: result.target,
      dispatch_reference: result.reference ?? null,
      dispatch_error: result.ok ? null : result.message,
    })
    .eq("id", audit?.id ?? 0);

  return NextResponse.json({ ok: result.ok, message: result.message, reference: result.reference }, {
    status: result.ok ? 202 : 502,
  });
}
