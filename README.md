# Wolfie Control Center

Production-grade data-pipeline observability + refresh control for the Ask Wolfie stack.

Monitors 5 UAE real-estate ingest pipelines writing into the shared Supabase Projects DB:

| Source                | Repository                                              | Scheduler          |
|-----------------------|---------------------------------------------------------|--------------------|
| DLD (Dubai)           | `amanpatel-allegiance/dld-ingest`                       | Windows Task Sched |
| Abu Dhabi (adinteract)| `amanpatel-allegiance/adinteract-sync`                  | launchd            |
| Ajman DLRER           | `amanpatel-allegiance/wolfie-ajman-sync`                | GitHub Actions     |
| Sharjah RERD          | `amanpatel-allegiance/wolfie-sharjah-sync`              | GitHub Actions (self-hosted runner) |
| GenieMap              | `amanpatel-allegiance/wolfie-geniemap-sync`             | GitHub Actions     |

## Architecture

```
Pipeline repos ──write──▶ Supabase (sync_runs, sync_run_logs, {source}_sync_state)
                           │
                           │  extended with wcc_* tables + views
                           ▼
                    Control Center (Next.js 15 / App Router)
                           │
                           ├─ Read-only dashboard for viewers
                           ├─ Operator server actions (manual dispatch, alert ack)
                           ├─ Cron endpoints (alert-tick, stuck-sweep)
                           └─ Slack / Email adapters (pluggable)
```

The control center is **additive**. It never mutates existing sync tables destructively; it only
extends them with nullable columns and joins them via new `wcc_*` tables and views.

## Getting started (dev)

```bash
cd ~/Downloads/wolfie-control-center
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
# GITHUB_DISPATCH_TOKEN (repo + workflow scope), and (optional) SLACK_ALERT_WEBHOOK.

# NODE_ENV=production is set globally on this shell — force it off for install:
NODE_ENV=development npm install --include=dev

npm run dev            # http://localhost:4200
npm run typecheck
npm run lint
npm test               # health + redaction unit tests
DASHBOARD_ENV=development ALLOW_DEV_SEED=true npm run seed:dev
                       # inject 7 scenarios into an explicitly confirmed dev DB
npm run alerts:tick    # evaluate alert rules locally
```

## Dashboard access and operator roles

The entry screen accepts any syntactically valid address ending in exactly `@allegiance.ae` and stores it in a seven-day HTTP-only cookie. No magic link is sent. This is a convenience gate for read-only monitoring and does not verify mailbox ownership.

Supabase Auth, Row Level Security, and `wcc_operators` still protect production mutations. The company-access cookie never grants operator permissions.

To grant an authenticated Supabase account an operator role, run this in the Supabase SQL editor:

```sql
INSERT INTO public.wcc_operators (user_id, role) VALUES ('<your-auth-uid>', 'admin');
```

## Deploy

Recommended: Vercel. Set the env vars from `.env.example`. `vercel.json` already declares two
cron paths (`alert-tick` every 5 min, `stuck-sweep` every 15 min). Add
`ALERT_TICK_SECRET` and configure `Authorization: Bearer $SECRET` on the cron.

## Files

```
app/                   # Next.js pages + API routes
components/            # UI: badges, tables, timelines, dialogs
lib/                   # data.ts, health.ts, format.ts, alerts.ts, dispatch.ts, supabase/*
packages/
  monitoring-sdk-ts/   # Node SDK — drop into dld-ingest
  monitoring-sdk-py/   # Python SDK — drop into the 4 python repos
scripts/               # seed-dev-scenarios, tick-alerts
tests/                 # vitest unit tests
docs/                  # ARCHITECTURE, INTEGRATION, RUNBOOK
```

## Docs

- **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** — schema, state machine, health formulas
- **[docs/INTEGRATION.md](./docs/INTEGRATION.md)** — how to wire the SDK into each pipeline repo
- **[docs/RUNBOOK.md](./docs/RUNBOOK.md)** — on-call playbook for stale / failed / stuck pipelines
- **[docs/SCHEDULES.md](./docs/SCHEDULES.md)** — recommended cron for each source
- **[docs/DATA_PROVENANCE.md](./docs/DATA_PROVENANCE.md)** — exact source behind every dashboard metric and chart

## What is NOT included

- No email/PagerDuty provider is wired — the alert engine writes to `wcc_pipeline_alert_events`
  and posts to Slack if `SLACK_ALERT_WEBHOOK` is set. Add other providers by extending
  `lib/alerts.ts` `notify()`.
- The dashboard cannot dispatch runs to `windows_scheduler` or `launchd` remotely; those buttons
  return a clear message telling the operator to run on the sync host.
- Long-running extraction is intentionally kept in the existing repos. This app only observes and
  triggers.
