export type HealthState =
  | "healthy"
  | "running"
  | "warning"
  | "delayed"
  | "stale"
  | "failed"
  | "stuck"
  | "disabled"
  | "unknown";

export type RunStatus =
  | "scheduled"
  | "queued"
  | "running"
  | "succeeded"
  | "succeeded_with_warnings"
  | "failed"
  | "timed_out"
  | "cancelled"
  | "skipped"
  | "partial"
  | "unchanged";

export type DataSource = {
  id: number;
  key: string;
  name: string;
  provider: string | null;
  jurisdiction: string | null;
  base_url: string | null;
  description: string | null;
  enabled: boolean;
};

export type Pipeline = {
  id: number;
  key: string;
  name: string;
  description: string | null;
  source_id: number;
  source_key: string;
  jurisdiction: string | null;
  repository: string | null;
  scheduler: string;
  schedule_expression: string | null;
  schedule_timezone: string;
  refresh_strategy: string;
  freshness_sla_hours: number;
  expected_duration_s: number | null;
  timeout_s: number | null;
  destination_tables: string[];
  enabled: boolean;
};

export type PipelineHealthRow = Pipeline & {
  latest_run_id: number | null;
  latest_status: RunStatus | null;
  latest_started_at: string | null;
  latest_finished_at: string | null;
  latest_heartbeat_at: string | null;
  last_success_run_id: number | null;
  last_success_started_at: string | null;
  last_success_finished_at: string | null;
  last_failure_run_id: number | null;
  last_failure_started_at: string | null;
  last_change_at: string | null;
  freshness_hours: number | null;
  data_age_hours: number | null;
  health_state: HealthState;
};

export type DailyStats = {
  pipeline_id: number;
  day: string;
  succeeded: number;
  partial: number;
  failed: number;
  total: number;
  avg_duration_s: number | null;
  rows_written: number;
};

export type Run = {
  id: number;
  pipeline_id: number | null;
  pipeline_key: string | null;
  pipeline_name: string | null;
  source_key: string | null;
  jurisdiction: string | null;
  kind: string;
  status: RunStatus;
  trigger: string;
  attempt: number;
  parent_run_id: number | null;
  correlation_id: string;
  environment: string;
  commit_sha: string | null;
  scheduled_for: string | null;
  queued_at: string | null;
  started_at: string;
  finished_at: string | null;
  heartbeat_at: string | null;
  duration_s: number | null;
  warning_count: number;
  error_category: string | null;
  error: string | null;
  error_details: Record<string, unknown> | null;
  stats: Record<string, unknown>;
};

export type OverviewKpis = {
  pipelines_total: number;
  healthy: number;
  running: number;
  warning: number;
  stale: number;
  failed: number;
  stuck: number;
  disabled: number;
  unknown: number;
  healthy_pct: number | null;
};

export type StageRow = {
  id: number;
  run_id: number;
  stage: string;
  stage_order: number;
  status: string;
  started_at: string;
  finished_at: string | null;
  input_count: number | null;
  output_count: number | null;
  error_count: number;
  message: string | null;
  metadata: Record<string, unknown>;
};

export type AlertEvent = {
  id: number;
  rule_id: number | null;
  pipeline_id: number | null;
  run_id: number | null;
  severity: "info" | "warning" | "critical";
  title: string;
  description: string | null;
  status: "open" | "acknowledged" | "resolved" | "expired";
  fired_at: string;
  fingerprint: string;
  details: Record<string, unknown>;
};
