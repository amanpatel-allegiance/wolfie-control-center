# wolfie-monitoring-sdk (Python)

Drop-in instrumentation for the 4 Python sync repos (ajman, sharjah, geniemap, adinteract).

Install locally:

```bash
uv add ../wolfie-control-center/packages/monitoring-sdk-py
# or
pip install -e ../wolfie-control-center/packages/monitoring-sdk-py
```

## Usage

```python
from wolfie_monitoring import run_context

with run_context(kind="ajman_sales_incremental", mode="incremental") as run:
    with run.stage("check_source"):
        if is_unchanged():
            run.finish("unchanged")
            return
    rows = api.export_all_records()
    run.counters(rows_fetched=len(rows))
    with run.stage("load"):
        writer.upsert_batched(rows)
    run.counters(rows_upserted=len(rows))
    run.snapshot(dataset="ajman_sales_summary", total_rows=writer.total)
```

## Guarantees

- **Never breaks the pipeline.** All Supabase writes are wrapped in `_swallow`. If the
  monitoring DB is unreachable, extraction continues.
- **Terminal status always set.** The context manager marks `failed` on exception, `succeeded`
  on clean exit, or your explicit `run.finish("unchanged")`.
- **Heartbeat every 60s** in a daemon thread. The control center's stuck-run sweeper uses this.
- **Redaction.** JWTs, bearer tokens, embedded URL credentials, and common API-key formats are
  stripped from log messages and error strings before they leave the pipeline.
