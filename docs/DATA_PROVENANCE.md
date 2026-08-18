# Dashboard data provenance

The application does not generate fallback metrics or chart points. Empty database results render empty states.

| Dashboard surface | Supabase source | Notes |
|---|---|---|
| KPI totals and health counts | `wcc_v_overview_kpis` | Computed from configured pipelines and their latest recorded runs. |
| Pipeline health and freshness | `wcc_v_pipeline_health` | The app normalizes `pipeline_id`, `pipeline_key`, and `pipeline_name` into its UI model. |
| Run activity chart | `wcc_v_daily_stats` | Recorded 30-day daily outcomes; the UI fills missing dates with zero but does not invent executions. |
| Pipeline reliability and daily trend | `wcc_v_daily_stats` + `wcc_v_pipeline_health` | Daily outcomes are joined to pipeline labels by `pipeline_id`. |
| Recent executions and run KPIs | `wcc_v_runs` | Dashboard lists are explicitly filtered to `environment = 'production'`. |
| Incident feed | `wcc_pipeline_alert_events` + `wcc_v_pipeline_health` | Persisted open alert events are combined with deterministic live health conditions. A pipeline with a persisted event is not duplicated. |
| Schedule timeline and next run | `wcc_v_pipeline_health.schedule_expression` + `.schedule_timezone` | Future occurrences are calculated from each persisted five-field cron expression, then displayed in GST. They are configured occurrences, not synthetic execution records. |
| Run stages and logs | `wcc_pipeline_run_stages`, `sync_run_logs` | Displayed on run detail pages. |
| Dataset snapshots | `wcc_dataset_snapshots` | Displayed on pipeline detail pages. |

`scripts/seed-dev-scenarios.ts` is not called by the application. It now requires both
`DASHBOARD_ENV=development` and `ALLOW_DEV_SEED=true`, preventing an accidental invocation with the normal app environment.
