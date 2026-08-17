/**
 * Dev-only seed: inject a set of representative scenarios so the dashboard is exercised end-to-end
 * without waiting for real cron. Guarded by DASHBOARD_ENV != "production".
 *
 * Scenarios injected (all against real pipelines already seeded by wcc_05):
 *   - healthy       (adi_rentals)             fresh succeeded run
 *   - running       (geniemap_units)          started 3 minutes ago, fresh heartbeat
 *   - failed        (dld_transactions)        failed with an auth error 30 min ago
 *   - stale         (geniemap_developers)     last success 6 days ago
 *   - stuck         (dld_units)               started 4h ago, no heartbeat for 45 min
 *   - retried       (ajman_sales)             attempt=2 succeeded after attempt=1 failed
 *   - warnings      (sharjah_all)             succeeded_with_warnings + warning_count=3
 *
 * Run: `npm run seed:dev`
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
if (process.env.DASHBOARD_ENV !== "development" || process.env.ALLOW_DEV_SEED !== "true") {
  throw new Error("Refusing to seed. This requires DASHBOARD_ENV=development and ALLOW_DEV_SEED=true.");
}

const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function pipelineId(key: string): Promise<number> {
  const { data, error } = await sb.from("wcc_pipelines").select("id").eq("key", key).single();
  if (error) throw error;
  return data.id;
}

async function insertRun(row: any) {
  const { data, error } = await sb.from("sync_runs").insert(row).select("id").single();
  if (error) throw error;
  return data.id as number;
}

async function stage(runId: number, name: string, order: number, status: string, startAgoSec: number, durationSec: number, extras: any = {}) {
  const started = new Date(Date.now() - startAgoSec * 1000).toISOString();
  const finished = new Date(Date.now() - (startAgoSec - durationSec) * 1000).toISOString();
  await sb.from("wcc_pipeline_run_stages").insert({
    run_id: runId, stage: name, stage_order: order, status, started_at: started, finished_at: finished, ...extras,
  });
}

async function main() {
  const now = Date.now();
  const iso = (msAgo: number) => new Date(now - msAgo).toISOString();

  // Healthy — adi_rentals
  await insertRun({
    pipeline_id: await pipelineId("adi_rentals"),
    kind: "adinteract_rentals_incremental",
    status: "succeeded",
    started_at: iso(120_000),
    finished_at: iso(115_000),
    heartbeat_at: iso(115_000),
    trigger: "schedule",
    environment: "development",
    stats: { mode: "incremental", rows_upserted: 3, rows_fetched: 7777, decision: "loaded" },
  });

  // Running with fresh heartbeat — geniemap_units
  const runningId = await insertRun({
    pipeline_id: await pipelineId("geniemap_units"),
    kind: "geniemap_units_full",
    status: "running",
    started_at: iso(3 * 60_000),
    heartbeat_at: iso(15_000),
    trigger: "manual",
    environment: "development",
    stats: { mode: "full", rows_fetched: 4200 },
  });
  await stage(runningId, "fetch",  1, "succeeded", 180, 120, { input_count: 84, output_count: 4200 });
  await stage(runningId, "upsert", 2, "running",   58,  0);

  // Failed — dld_transactions
  await insertRun({
    pipeline_id: await pipelineId("dld_transactions"),
    kind: "dld_transactions_incremental",
    status: "failed",
    started_at: iso(30 * 60_000),
    finished_at: iso(29 * 60_000),
    heartbeat_at: iso(29 * 60_000),
    trigger: "schedule",
    environment: "development",
    error: "DDAAuthError: token exchange failed status=401",
    error_category: "AuthError",
    stats: { mode: "incremental", pages_scanned: 4, rows_seen: 4000 },
  });

  // Stale — geniemap_developers (6 days old success)
  await insertRun({
    pipeline_id: await pipelineId("geniemap_developers"),
    kind: "geniemap_developers_incremental",
    status: "succeeded",
    started_at: iso(6 * 24 * 3600_000),
    finished_at: iso(6 * 24 * 3600_000 - 300_000),
    heartbeat_at: iso(6 * 24 * 3600_000 - 300_000),
    trigger: "schedule",
    environment: "development",
    stats: { mode: "incremental", rows_upserted: 0, decision: "unchanged" },
  });

  // Stuck — dld_units
  await insertRun({
    pipeline_id: await pipelineId("dld_units"),
    kind: "dld_units_backfill",
    status: "running",
    started_at: iso(4 * 3600_000),
    heartbeat_at: iso(45 * 60_000),
    trigger: "manual",
    environment: "development",
    stats: { mode: "backfill", pages_scanned: 12, rows_seen: 12000 },
  });

  // Retried — ajman_sales (attempt 1 failed, attempt 2 succeeded)
  const attempt1 = await insertRun({
    pipeline_id: await pipelineId("ajman_sales"),
    kind: "ajman_sales_incremental",
    status: "failed",
    started_at: iso(120 * 60_000),
    finished_at: iso(119 * 60_000),
    trigger: "schedule",
    attempt: 1,
    environment: "development",
    error: "OpenDataSoftAPIError: 502 upstream",
    stats: { mode: "incremental" },
  });
  await insertRun({
    pipeline_id: await pipelineId("ajman_sales"),
    kind: "ajman_sales_incremental",
    status: "succeeded",
    started_at: iso(60 * 60_000),
    finished_at: iso(59 * 60_000),
    trigger: "retry",
    attempt: 2,
    parent_run_id: attempt1,
    environment: "development",
    stats: { mode: "incremental", rows_upserted: 267 },
  });

  // Warnings — sharjah_all
  await insertRun({
    pipeline_id: await pipelineId("sharjah_all"),
    kind: "sharjah_report_categories_ticker_transactions_ticker_mortgages_incremental",
    status: "succeeded_with_warnings",
    started_at: iso(2 * 3600_000),
    finished_at: iso(2 * 3600_000 - 240_000),
    warning_count: 3,
    trigger: "schedule",
    environment: "development",
    stats: { mode: "incremental", rows_upserted: 500, warnings: ["slow gov CDN", "3 rows had null district_en"] },
  });

  console.log("✓ dev scenarios seeded");
}

main().catch((e) => { console.error(e); process.exit(1); });
