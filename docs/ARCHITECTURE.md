# Architecture

## Overview

The control center layers on top of two production conventions the sync repos already use:

- `public.sync_runs` — one row per execution (`kind`, `status`, `stats jsonb`, `started_at`,
  `finished_at`, `error`)
- `public.sync_run_logs` — a log stream per run
- `public.{source}_sync_state` — per-source watermarks/cursors

The `wcc_*` migrations add the missing catalog + telemetry surface without changing writer code.

## Schema (added by `wcc_*` migrations)

| Table | Purpose |
|---|---|
| `wcc_data_sources` | The 5 sources (DLD, ADI, Ajman, Sharjah, GenieMap) |
| `wcc_pipelines` | ~12 pipelines with schedule, SLA, timeout, and `kind_patterns[]` to match `sync_runs.kind` |
| `wcc_pipeline_run_stages` | Extraction / transform / load stage timings per run |
| `wcc_dataset_snapshots` | Row counts, min/max timestamps, delta breakdown after a successful load |
| `wcc_pipeline_alert_rules` | Rule definitions (consecutive failures, SLA breach, stuck, zero rows, …) |
| `wcc_pipeline_alert_events` | Fired alerts with dedup fingerprint + cooldown |
| `wcc_pipeline_manual_runs` | Audit of every dispatched manual run + result |
| `wcc_pipeline_schedule_audit` | Audit of schedule/enabled edits |
| `wcc_operators` | Role table (`viewer` | `operator` | `admin`) |

`sync_runs` was **additively** extended with:
`pipeline_id` (fk), `correlation_id uuid`, `parent_run_id`, `attempt`, `trigger`, `heartbeat_at`,
`environment`, `commit_sha`, `scheduled_for`, `queued_at`, `warning_count`, `error_category`,
`error_details jsonb`. All nullable / defaulted so existing writers are unaffected.

## Views

- `wcc_v_runs` — canonical join of `sync_runs` + `wcc_pipelines` + `wcc_data_sources`
- `wcc_v_pipeline_latest` — latest run, latest success, latest failure, last-material-change per pipeline
- `wcc_v_pipeline_health` — computed `health_state` and freshness per pipeline (mirrors `lib/health.ts`)
- `wcc_v_daily_stats` — 30-day daily rollup for charts
- `wcc_v_overview_kpis` — single-row KPI aggregate for the overview page

## Status state machine

```
     ┌─────────┐    dispatch    ┌─────────┐   start    ┌────────┐   normal   ┌───────────┐
     │scheduled│───────────────▶│ queued  │────────────▶│running │────────────▶│ succeeded │
     └─────────┘                └─────────┘             └────┬───┘             └───────────┘
                                                            │
              cursor unchanged ◀───────────────┐            │  exception       ┌──────────┐
              ┌──────────┐                     │            └─────────────────▶│  failed  │
              │unchanged │◀────────────────────┘                               └──────────┘
              └──────────┘                                                       │
                                                                                 │   attempt < max
                                                                                 ▼
                                                                            ┌──────────┐
                                                                            │  retry   │
                                                                            └──────────┘
              some rows OK,                        heartbeat missing +
              some errored                          timeout exceeded
              ┌──────────┐                          ┌──────────┐
              │ partial  │                          │ timed_out│
              └──────────┘                          └──────────┘

              stopped by                            marked at end when
              operator                              nothing was fetched
              ┌──────────┐                          ┌──────────┐
              │cancelled │                          │ skipped  │
              └──────────┘                          └──────────┘
```

## Health state precedence

Implemented identically in SQL (`wcc_v_pipeline_health`) and TS (`lib/health.ts::computeHealthState`):

`disabled > stuck > failed > running/queued > stale > warning > healthy > unknown`

- **stuck**: `status='running'` AND heartbeat > 30 min old AND `now - started > pipeline.timeout_s`
- **stale**: `now - last_success > freshness_sla_hours`
- **warning**: `status IN ('partial','succeeded_with_warnings')` within SLA
- **healthy**: `status IN ('succeeded','unchanged')` within SLA
- **unknown**: no successful run has ever occurred

## Security model

- All `wcc_*` tables have RLS enabled.
- Reads: any authenticated user.
- Writes to `wcc_pipeline_manual_runs`: `operator` or `admin` only.
- Writes to `wcc_pipelines`, `wcc_pipeline_alert_rules`, `wcc_operators`: `admin` only.
- Alert acks: `operator` or `admin`.
- The `service_role` key is never returned to the browser; it's only used server-side by API routes
  (after an authorization gate) and by the alert/stuck-sweep cron endpoints (protected by
  `ALERT_TICK_SECRET`).
- All error strings and log messages are passed through `redactSecrets()` before rendering — even
  in dev.

## Real-time

Currently-running runs and stage progress can use Supabase Realtime channels on `sync_runs`.
For MVP, pages use `dynamic = "force-dynamic"` and Server Components; a follow-up can add a small
client-side subscription for the "Currently running" panel.
