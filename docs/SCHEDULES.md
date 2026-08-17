# Recommended Schedules

Each recommendation reflects source refresh cadence, dataset volume, geo constraints, and business
freshness. The dashboard is the source of truth for pipeline metadata; the scheduler config still
lives in each pipeline repo.

| Pipeline | Recommended cron | TZ | Scheduler | Refresh strategy | Freshness SLA | Rationale |
|---|---|---|---|---|---|---|
| `dld_transactions` | `0 2 * * 1` | Asia/Dubai | Windows Task Scheduler | incremental | 168h | DDA publishes new transactions weekly; geo-restricted so a UAE-resident machine is required. Weekly incremental keeps `dld_raw_transactions` current. |
| `dld_units` | `0 2 * * 1` | Asia/Dubai | Windows Task Scheduler | incremental | 168h | Same source constraints; unit metadata changes slowly. |
| `dld_rent_contracts` | `0 2 * * 1` | Asia/Dubai | Windows Task Scheduler | incremental | 168h | Highest-volume dataset (~5M rows); weekly window keeps API window caps happy. |
| `adi_transactions` | `15 23 * * *` | UTC (03:15 Dubai) | launchd | incremental (SHA-diff) | 30h | adinteract.co refreshes daily; SHA short-circuit avoids re-processing unchanged snapshots. |
| `adi_rentals` | `15 23 * * *` | UTC | launchd | incremental (SHA-diff) | 30h | Same file cadence as transactions. |
| `ajman_sales` | `30 2 */3 * *` | UTC | GitHub Actions | incremental (dataset mtime) | 96h | DLRER updates quarterly — 3-day polling is generous; runs cheap. |
| `sharjah_all` | `15 3 */3 * *` | UTC | GH Actions self-hosted (macOS) | incremental (upsert dedup) | 96h | RERD CDN is geoblocked to UAE, so a self-hosted runner is mandatory. 3-day cadence covers ticker window comfortably. |
| `geniemap_developers` | `15 2 * * *` | UTC | GitHub Actions | incremental (cursor) | 30h | Developer roster changes rarely; daily is plenty. |
| `geniemap_projects` | `15 2 * * *` | UTC | GitHub Actions | incremental (cursor) | 30h | Projects change frequently; API 429s force serial cadence. |
| `geniemap_units` | `15 2 * * *` | UTC | GitHub Actions | incremental (cursor) | 30h | Highest-volume GenieMap dataset (43k rows); runs after developers/projects due to FK order. |
| `geniemap_project_assets` | manual | UTC | manual | full | 168h | S3 asset downloads are chunked; run only when new project media appears. |
| `geniemap_reference` | `15 2 * * *` | UTC | GitHub Actions | incremental | 168h | Emirates/districts/amenities rarely change; daily keeps the config table consistent. |

## Preventing duplicate execution

- GitHub Actions cron cannot overlap the same workflow if `concurrency: { group: sync, cancel-in-progress: false }` is set. All 3 GH repos already use single-workflow files.
- The Windows Task Scheduler entry (`register-weekly-sync.ps1`) uses the "do not start a new instance" policy.
- launchd `KeepAlive` is not set for the ADI job — each fire is independent and the SHA-diff makes redundant fires a no-op.

## Preventing missed runs

`GET /api/cron/stuck-sweep` (Vercel cron every 15 min) marks any `sync_runs` row whose
`status='running'` past its `timeout_s` **and** whose `heartbeat_at` is older than 30 min as
`timed_out`. This prevents the health rollups from silently keeping a stuck run "active".
