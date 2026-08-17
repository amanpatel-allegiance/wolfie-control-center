// @wolfie/monitoring-sdk (Node.js) — pipeline instrumentation
// Backward-compatible with the existing sync_runs / sync_run_logs convention.
// Adds: correlation_id, pipeline_id backfill via kind, heartbeats, stages, snapshots,
// try/catch/finally-safe finalization, and never crashes the pipeline when Supabase is unavailable.
//
// Usage (drop-in):
//   import { createRun } from "@wolfie/monitoring-sdk";
//   const run = await createRun({ kind: "dld_transactions_incremental", mode: "incremental", commit: process.env.GITHUB_SHA });
//   try {
//     await run.stage("extract", async () => { ... });
//     await run.counters({ rows_upserted: 1234 });
//     await run.snapshot({ dataset: "dld_raw_transactions", total_rows: 4_900_000 });
//     await run.finish("succeeded");
//   } catch (err) {
//     await run.fail(err);
//     throw err;
//   }

import { createClient } from "@supabase/supabase-js";

const HEARTBEAT_INTERVAL_MS = 60_000;

function envOrThrow(name) {
  const v = process.env[name];
  if (!v) throw new Error(`monitoring-sdk: missing env ${name}`);
  return v;
}

function safe(fn) {
  return async (...args) => {
    try { return await fn(...args); } catch (err) { console.warn("[wolfie-mon] silent failure:", (err && err.message) || err); return null; }
  };
}

/** Redact common secret shapes from a string. */
export function redact(input) {
  if (!input) return input;
  return String(input)
    .replace(/eyJ[\w-]{20,}\.[\w-]{10,}\.[\w-]+/g, "[jwt-redacted]")
    .replace(/(bearer\s+)[A-Za-z0-9_.\-]+/gi, "$1[redacted]")
    .replace(/(:\/\/[^:@\/]+:)[^@\/]+@/g, "$1[redacted]@");
}

function buildClient() {
  const url = envOrThrow("SUPABASE_URL");
  const key = envOrThrow("SUPABASE_SERVICE_ROLE_KEY") || envOrThrow("SUPABASE_SERVICE_KEY");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function createRun({ kind, mode, commit, environment, trigger = "schedule", parentRunId = null, stats = {} } = {}) {
  if (!kind) throw new Error("monitoring-sdk: kind is required");
  const supabase = buildClient();

  let runId = null;
  let heartbeatTimer = null;
  let finished = false;

  // Try to resolve the pipeline_id from the kind by asking wcc_pipelines.kind_patterns (LIKE).
  const resolvePipelineId = safe(async () => {
    const { data } = await supabase.from("wcc_pipelines").select("id, kind_patterns");
    if (!data) return null;
    for (const p of data) {
      for (const pat of p.kind_patterns ?? []) {
        // Convert LIKE pattern to a JS regex ('%' -> '.*')
        const re = new RegExp("^" + String(pat).replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*") + "$");
        if (re.test(kind)) return p.id;
      }
    }
    return null;
  });

  const pipelineId = await resolvePipelineId();

  // Insert run row
  const insertRun = safe(async () => {
    const { data, error } = await supabase
      .from("sync_runs")
      .insert({
        kind,
        status: "running",
        stats: { ...stats, mode: mode ?? stats.mode },
        pipeline_id: pipelineId,
        environment: environment ?? process.env.NODE_ENV ?? "production",
        commit_sha: commit ?? process.env.GITHUB_SHA ?? process.env.COMMIT_SHA ?? null,
        trigger,
        parent_run_id: parentRunId,
        heartbeat_at: new Date().toISOString(),
      })
      .select("id, correlation_id")
      .single();
    if (error) throw error;
    return data;
  });

  const first = await insertRun();
  runId = first?.id ?? null;

  const heartbeat = safe(async () => {
    if (!runId) return;
    await supabase.from("sync_runs").update({ heartbeat_at: new Date().toISOString() }).eq("id", runId);
  });

  heartbeatTimer = setInterval(() => { heartbeat(); }, HEARTBEAT_INTERVAL_MS);
  heartbeatTimer.unref?.();

  const log = safe(async (level, message, meta) => {
    if (!runId) return;
    await supabase.from("sync_run_logs").insert({
      run_id: runId,
      level,
      message: redact(String(message ?? "")).slice(0, 4000),
      meta: meta ?? null,
    });
  });

  const startStage = safe(async (stage, order = 0, metadata = {}) => {
    if (!runId) return null;
    const { data } = await supabase
      .from("wcc_pipeline_run_stages")
      .insert({ run_id: runId, stage, stage_order: order, status: "running", metadata })
      .select("id")
      .single();
    return data?.id ?? null;
  });

  const endStage = safe(async (stageId, status, extra = {}) => {
    if (!stageId) return;
    await supabase
      .from("wcc_pipeline_run_stages")
      .update({ status, finished_at: new Date().toISOString(), ...extra })
      .eq("id", stageId);
  });

  const runStage = async (name, fn, { order = 0, metadata = {} } = {}) => {
    const stageId = await startStage(name, order, metadata);
    try {
      const result = await fn({ stageId });
      await endStage(stageId, "succeeded", {
        input_count:  (result && typeof result === "object" && "input_count"  in result) ? result.input_count  : null,
        output_count: (result && typeof result === "object" && "output_count" in result) ? result.output_count : null,
      });
      return result;
    } catch (err) {
      await endStage(stageId, "failed", { message: redact(String(err?.message ?? err ?? "")) });
      throw err;
    }
  };

  const counters = safe(async (patch) => {
    if (!runId) return;
    const { data } = await supabase.from("sync_runs").select("stats").eq("id", runId).single();
    const merged = { ...(data?.stats ?? {}), ...patch };
    await supabase.from("sync_runs").update({ stats: merged }).eq("id", runId);
  });

  const snapshot = safe(async (row) => {
    if (!runId) return;
    await supabase.from("wcc_dataset_snapshots").insert({ ...row, pipeline_id: pipelineId, run_id: runId });
  });

  const finish = safe(async (status = "succeeded", extra = {}) => {
    if (finished) return;
    finished = true;
    clearInterval(heartbeatTimer);
    if (!runId) return;
    await supabase.from("sync_runs").update({
      status,
      finished_at: new Date().toISOString(),
      heartbeat_at: new Date().toISOString(),
      ...extra,
    }).eq("id", runId);
  });

  const fail = safe(async (err, extra = {}) => {
    if (finished) return;
    finished = true;
    clearInterval(heartbeatTimer);
    if (!runId) return;
    const msg = redact(err?.message ?? String(err ?? ""));
    await supabase.from("sync_runs").update({
      status: "failed",
      finished_at: new Date().toISOString(),
      error: msg?.slice(0, 4000) ?? null,
      error_category: err?.name ?? null,
      error_details: err?.details ?? null,
      ...extra,
    }).eq("id", runId);
  });

  return {
    runId,
    pipelineId,
    log,
    stage: runStage,
    counters,
    snapshot,
    finish,
    fail,
  };
}

/** Wrap an entire run in try/finally so status is always terminal. */
export async function withRun(opts, body) {
  const run = await createRun(opts);
  try {
    const result = await body(run);
    await run.finish("succeeded");
    return result;
  } catch (err) {
    await run.fail(err);
    throw err;
  }
}
