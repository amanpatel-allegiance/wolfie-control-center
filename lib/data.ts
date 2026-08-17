import { supabaseServer } from "@/lib/supabase/server";
import type {
  AlertEvent,
  DailyStats,
  DataSource,
  OverviewKpis,
  Pipeline,
  PipelineHealthRow,
  Run,
  StageRow,
} from "@/lib/types";

type PipelineHealthViewRow = Omit<PipelineHealthRow, "id" | "key" | "name" | "description"> & {
  pipeline_id: number;
  pipeline_key: string;
  pipeline_name: string;
};

function normalizePipelineHealth(row: PipelineHealthViewRow): PipelineHealthRow {
  return {
    ...row,
    id: row.pipeline_id,
    key: row.pipeline_key,
    name: row.pipeline_name,
    description: null,
    freshness_hours: row.freshness_hours == null ? null : Number(row.freshness_hours),
    data_age_hours: row.data_age_hours == null ? null : Number(row.data_age_hours),
  };
}

function normalizeDailyStats(row: Record<string, unknown>): DailyStats {
  return {
    pipeline_id: Number(row.pipeline_id),
    day: String(row.day),
    succeeded: Number(row.succeeded ?? 0),
    partial: Number(row.partial ?? 0),
    failed: Number(row.failed ?? 0),
    total: Number(row.total ?? 0),
    avg_duration_s: row.avg_duration_s == null ? null : Math.max(0, Number(row.avg_duration_s)),
    rows_written: Number(row.rows_written ?? 0),
  };
}

export async function getOverviewKpis(): Promise<OverviewKpis> {
  const sb = await supabaseServer();
  const { data, error } = await sb.from("wcc_v_overview_kpis").select("*").maybeSingle();
  if (error) throw new Error(error.message);
  return (
    data ?? {
      pipelines_total: 0,
      healthy: 0,
      running: 0,
      warning: 0,
      stale: 0,
      failed: 0,
      stuck: 0,
      disabled: 0,
      unknown: 0,
      healthy_pct: null,
    }
  );
}

export async function getPipelineHealth(): Promise<PipelineHealthRow[]> {
  const sb = await supabaseServer();
  const { data, error } = await sb
    .from("wcc_v_pipeline_health")
    .select("*")
    .order("pipeline_key");
  if (error) throw new Error(error.message);
  return ((data ?? []) as PipelineHealthViewRow[]).map(normalizePipelineHealth);
}

export async function getPipelineByKey(key: string): Promise<PipelineHealthRow | null> {
  const sb = await supabaseServer();
  const { data, error } = await sb
    .from("wcc_v_pipeline_health")
    .select("*")
    .eq("pipeline_key", key)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? normalizePipelineHealth(data as PipelineHealthViewRow) : null;
}

export async function getRecentRuns(opts?: { pipelineKey?: string; limit?: number }): Promise<Run[]> {
  const sb = await supabaseServer();
  let q = sb.from("wcc_v_runs").select("*").eq("environment", "production").order("started_at", { ascending: false }).limit(opts?.limit ?? 100);
  if (opts?.pipelineKey) q = q.eq("pipeline_key", opts.pipelineKey);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as Run[];
}

export async function getRun(id: number): Promise<Run | null> {
  const sb = await supabaseServer();
  const { data, error } = await sb.from("wcc_v_runs").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as Run | null;
}

export async function getRunStages(runId: number): Promise<StageRow[]> {
  const sb = await supabaseServer();
  const { data, error } = await sb
    .from("wcc_pipeline_run_stages")
    .select("*")
    .eq("run_id", runId)
    .order("stage_order");
  if (error) throw new Error(error.message);
  return (data ?? []) as StageRow[];
}

export async function getRunLogs(runId: number, limit = 200) {
  const sb = await supabaseServer();
  const { data, error } = await sb
    .from("sync_run_logs")
    .select("id, run_id, level, message, meta, created_at")
    .eq("run_id", runId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getDataSources(): Promise<DataSource[]> {
  const sb = await supabaseServer();
  const { data, error } = await sb.from("wcc_data_sources").select("*").order("key");
  if (error) throw new Error(error.message);
  return (data ?? []) as DataSource[];
}

export async function getPipelines(): Promise<Pipeline[]> {
  const sb = await supabaseServer();
  const { data, error } = await sb
    .from("wcc_pipelines")
    .select(
      "id, key, name, description, source_id, repository, scheduler, schedule_expression, schedule_timezone, refresh_strategy, freshness_sla_hours, expected_duration_s, timeout_s, destination_tables, enabled",
    )
    .order("key");
  if (error) throw new Error(error.message);
  const sources = await getDataSources();
  const byId = new Map(sources.map((s) => [s.id, s]));
  return (data ?? []).map((p) => ({
    ...p,
    source_key: byId.get(p.source_id)?.key ?? "?",
    jurisdiction: byId.get(p.source_id)?.jurisdiction ?? null,
  })) as Pipeline[];
}

export async function getAlerts(status: string = "open"): Promise<AlertEvent[]> {
  const sb = await supabaseServer();
  const { data, error } = await sb
    .from("wcc_pipeline_alert_events")
    .select("*")
    .eq("status", status)
    .order("fired_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []) as AlertEvent[];
}

export async function getDailyStats(pipelineId: number, days = 30): Promise<DailyStats[]> {
  const sb = await supabaseServer();
  const since = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
  const { data, error } = await sb
    .from("wcc_v_daily_stats")
    .select("*")
    .eq("pipeline_id", pipelineId)
    .gte("day", since)
    .order("day");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => normalizeDailyStats(row));
}

export async function getWorkspaceDailyStats(days = 30): Promise<DailyStats[]> {
  const sb = await supabaseServer();
  const since = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
  const { data, error } = await sb
    .from("wcc_v_daily_stats")
    .select("pipeline_id, day, succeeded, partial, failed, total, avg_duration_s, rows_written")
    .gte("day", since)
    .order("day");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => normalizeDailyStats(row));
}

export async function getDatasetSnapshots(pipelineId: number, limit = 10) {
  const sb = await supabaseServer();
  const { data, error } = await sb
    .from("wcc_dataset_snapshots")
    .select("*")
    .eq("pipeline_id", pipelineId)
    .order("snapshot_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getCurrentRole(): Promise<"viewer" | "operator" | "admin"> {
  const sb = await supabaseServer();
  const { data: userData } = await sb.auth.getUser();
  if (!userData.user) return "viewer";
  const { data } = await sb.from("wcc_operators").select("role").eq("user_id", userData.user.id).maybeSingle();
  return (data?.role as "viewer" | "operator" | "admin" | undefined) ?? "viewer";
}
