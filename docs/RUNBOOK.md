# Operations Runbook

Quick playbooks for the alerts most likely to fire.

## Freshness SLA breach — pipeline shows `stale`

**Signal:** `now - last_success > freshness_sla_hours`.

1. Open the pipeline page. Confirm the last run's status: if it's `failed`, go to *Consecutive
   failures*. If it's `succeeded`, the schedule likely didn't fire.
2. Check the schedule column and confirm the scheduler is alive:
   - GitHub Actions: open the linked workflow — is there a red X on today's run, or was there simply
     no run today?
   - Windows Task Scheduler: on the ingest PC, `Get-ScheduledTaskInfo -TaskName WolfieDLDIngestWeekly`
   - launchd: on the sync Mac, `launchctl list | grep adinteract`
3. If the scheduler missed a fire, use **Trigger run · incremental** from the pipeline detail page
   for GH-Actions-backed pipelines. For Windows/launchd, run the sync manually on the host.

## Consecutive failures

**Signal:** 2 or 3 latest runs are `failed` or `timed_out`.

1. Open the most recent failed run. Read the redacted error.
   - `AuthError` / `401` / `403` → rotate the source's credential (see `wolfie-*-sync` README).
     For DLD: `DDA_CLIENT_SECRET`. For GenieMap: `GENIEMAP_TOKEN` or user/password. Push the new
     secret to the corresponding GH Actions repo Secrets, then trigger a manual run.
   - `429` → source is rate-limiting. Wait 30 min, then trigger a smaller `dry-run` mode to confirm
     access before running full.
   - `502/503/504` → upstream outage. Do not force-retry; the next scheduled fire will pick up.
   - `SupabaseUpsertError: ON CONFLICT ... twice` → the source emitted duplicate composite keys in
     one batch. Reduce batch size (`SYNC_BATCH_SIZE=100`) and re-run. Long-term: dedupe upstream.
2. If the failure is transient, click **Trigger run · incremental**.
3. If it looks like a bug, open a follow-up in the pipeline repo, not in this repo.

## Stuck run

**Signal:** `health_state='stuck'`. A run is still `running` past the pipeline's timeout and its
heartbeat is older than 30 min.

1. The 15-min stuck-sweep cron will mark it `timed_out` automatically. If you need to move faster,
   `curl -H "Authorization: Bearer $ALERT_TICK_SECRET" $APP/api/cron/stuck-sweep`.
2. On the sync host, verify the process is actually dead:
   - Windows: `Get-Process -Name node -ErrorAction SilentlyContinue`
   - macOS: `pgrep -fl uv` / `pgrep -fl adinteract`
3. If the process is alive but silent, kill it and re-dispatch. If it's dead, dispatch a new run.

## Zero-row extract on a full/backfill

**Signal:** Latest `_full` or `_backfill` run completed with `rows_upserted=0`.

Usually one of:
- Source API changed schema (columns renamed) — pipeline needs a code fix.
- Auth returned 200 with an empty payload — check the raw request logged in `sync_run_logs`.
- Window filter is too narrow — check `stats.max_load_ts_this_run` vs `sync_state.last_load_timestamp`.

## Manual run rate-limited (429 from the control center)

The dashboard rate-limits manual dispatch to 1 request / 10s per user / pipeline. Wait a moment and
retry. This exists to prevent double-clicks from triggering duplicate workflow_dispatches.

## Operator role missing

If the "Trigger run" button is greyed out with `operator role required`, grant yourself the role
in the Supabase SQL editor:

```sql
INSERT INTO public.wcc_operators (user_id, role) VALUES ('<your-auth-uid>', 'operator')
ON CONFLICT (user_id) DO UPDATE SET role = 'operator';
```

## GitHub dispatch fails with 404 or 401

- 401 → `GITHUB_DISPATCH_TOKEN` is missing or lacks `repo` + `workflow` scope. Rotate.
- 404 → the workflow filename or default branch in `lib/dispatch.ts::REPO_MAP` doesn't match reality.
  Confirm the repo has `.github/workflows/sync.yml` on the branch listed in `REPO_MAP[key].ref`.

## Adding a new pipeline

1. Add a row to `wcc_data_sources` (if a new source) and a row to `wcc_pipelines` with a distinctive
   `kind_patterns[]` entry.
2. Push the pipeline repo. Ensure its `sync_runs.kind` matches the pattern.
3. If the pipeline is on GitHub Actions and you want manual dispatch from the dashboard, add a
   mapping in `lib/dispatch.ts::REPO_MAP`.
4. If the pipeline needs richer telemetry, follow `docs/INTEGRATION.md`.

## Backfill vs incremental checkpoint safety

The SDK never touches `{source}_sync_state`. Cursor writes remain the responsibility of the pipeline
code. When you run a `backfill` manually from the dashboard, confirm that the pipeline understands
`--mode=backfill` (or your framework's equivalent) so it does not advance the incremental cursor.
