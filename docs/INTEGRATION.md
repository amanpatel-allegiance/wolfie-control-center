# Integrating the Wolfie Monitoring SDK

The 5 pipelines already write to `sync_runs` and `sync_run_logs`. The dashboard reads that today.
This guide adds the richer telemetry the control center wants (stages, heartbeats, snapshots,
correlation IDs, terminal-status guarantees, and pipeline_id backfill via `kind_patterns`).

**Everything below is additive and reversible.** If you drop the SDK, the pipeline still runs.

---

## 1 — `dld-ingest` (Node.js, `~/Downloads/DLD Data/ingest`)

**Install** (from the ingest directory):

```bash
npm install ../../wolfie-control-center/packages/monitoring-sdk-ts
```

**Patch `ingest.js`** — replace the current top of `runOneDataset(datasetId, mode)` with:

```js
import { withRun } from "@wolfie/monitoring-sdk";

async function runOneDataset(datasetId, mode) {
  return withRun(
    { kind: `dld_${datasetId}_${mode}`, mode, trigger: "schedule", commit: process.env.GITHUB_SHA },
    async (run) => {
      await run.stage("resolve_cursor", async () => {
        // existing dld_sync_state.last_load_timestamp read
      });

      const pages = await run.stage("extract_pages", async () => {
        // existing paginated fetch loop; return { input_count: pagesScanned, output_count: rowsFetched }
      });

      await run.stage("upsert", async () => {
        // existing upsertWithRetry batches
      });

      await run.counters({ pages_scanned: pages.pagesScanned, rows_upserted: pages.rowsUpserted });
      await run.snapshot({ dataset: `dld_raw_${datasetId}`, total_rows: pages.totalNow, inserted_count: pages.rowsUpserted });
      // return implicitly -> status=succeeded; on throw -> status=failed
    },
  );
}
```

You can keep the existing `sync_runs` + `sync_run_logs` writes if the wrapper's rollout is staggered — the
SDK's `withRun` insert is separate. Once the SDK is proven, remove the duplicate writes.

---

## 2 — `adinteract-sync` (Python, `~/wolfie/adinteract-sync`)

**Install:**

```bash
uv add /Users/fahadpatel/Downloads/wolfie-control-center/packages/monitoring-sdk-py
```

**Patch `src/adinteract_sync/orchestrator.py` — `Orchestrator.run`:**

```python
from wolfie_monitoring import run_context

def run(self, *, only=None):
    for dataset in self._datasets(only):
        kind = f"adinteract_{dataset}_{self.mode}"
        with run_context(kind=kind, mode=self.mode) as run:
            with run.stage("download"):
                snap = self.downloader.download(dataset)
                run.counters(sha256_prefix=snap.sha256[:12], byte_size=snap.byte_size)
            if self.mode == "incremental" and self._is_unchanged(snap):
                run.counters(decision="skipped_unchanged", is_new_snapshot=False)
                run.finish("unchanged")
                continue
            with run.stage("load"):
                summary = self.writer.upsert_dataset(dataset, snap)
                run.counters(row_count=summary.rows, rows_upserted=summary.upserted)
            run.snapshot(dataset=f"adi_{dataset}", total_rows=summary.rows,
                         inserted_count=summary.upserted, unchanged_count=summary.unchanged)
```

**Delete** the existing `_start_run` / `_finish_run` writes to `sync_runs` — the SDK handles them.

---

## 3 — `wolfie-ajman-sync` (Python, `~/Downloads/wolfie-ajman-sync`)

**Install:** `uv add /Users/fahadpatel/Downloads/wolfie-control-center/packages/monitoring-sdk-py`

**Patch `src/ajman_sync/orchestrator.py` — `run_sync()`:**

```python
from wolfie_monitoring import run_context

def run_sync(force: bool = False) -> None:
    kind = "ajman_sales_incremental" if not force else "ajman_sales_full"
    with run_context(kind=kind, mode="incremental" if not force else "full") as run:
        with run.stage("check_source"):
            meta = api.get_dataset_metadata()
        if not force and _is_source_unchanged(meta):
            run.finish("unchanged")
            return
        with run.stage("extract"):
            rows = api.export_all_records()
            run.counters(rows_fetched=len(rows))
        with run.stage("load"):
            summary = writer.upsert_batched(rows)
        run.counters(rows_upserted=summary.upserted)
        run.snapshot(dataset="ajman_sales_summary", total_rows=summary.total)
```

---

## 4 — `wolfie-sharjah-sync` (Python, `~/Downloads/wolfie-sharjah-sync`)

**Install:** `uv add /Users/fahadpatel/Downloads/wolfie-control-center/packages/monitoring-sdk-py`

**Patch `src/sharjah_sync/orchestrator.py` — per-entity loop:**

```python
from wolfie_monitoring import run_context

def run_all(mode: str, entities: list[str]) -> None:
    kind = f"sharjah_{'_'.join(entities)}_{mode}"
    with run_context(kind=kind, mode=mode) as run:
        totals = {}
        for entity in entities:
            with run.stage(entity):
                s = entity_syncers[entity].run(mode=mode)
                totals[entity + "_rows_upserted"] = s.upserted
                totals[entity + "_rows_fetched"] = s.fetched
                run.snapshot(dataset=entity_syncers[entity].table, total_rows=s.total_rows_now,
                             inserted_count=s.upserted)
        run.counters(**totals)
```

---

## 5 — `wolfie-geniemap-sync` (Python, `~/Downloads/wolfie-geniemap-sync`)

**Install:** same as above.

**Patch `src/geniemap_sync/orchestrator.py`:**

```python
from wolfie_monitoring import run_context

def run(mode: str, entities: list[str]) -> None:
    for entity in entities:  # developers -> projects -> units
        kind = f"geniemap_{entity}_{mode}"
        with run_context(kind=kind, mode=mode) as run:
            with run.stage("fetch"):
                rows = api.fetch(entity, mode=mode)
                run.counters(**{f"{entity}_rows_fetched": len(rows)})
            with run.stage("upsert"):
                summary = writer.upsert(entity, rows)
                run.counters(**{f"{entity}_rows_upserted": summary.upserted})
            run.snapshot(dataset=f"geniemap_{entity}", total_rows=summary.total)
```

Because GenieMap has three sequential entities the SDK's kind auto-resolves each to its own
pipeline (via `kind_patterns` = `geniemap_developers_%`, `geniemap_projects_%`, `geniemap_units_%`).
Legacy composite kinds like `geniemap_emirates_districts_amenities_config_developers_full` are
matched to the `geniemap_reference` pipeline.

---

## Rollout checklist

1. Add the SDK dep in one repo; deploy to a non-production branch.
2. Trigger a `dry-run` sync and verify a new `sync_runs` row appears with:
   - `pipeline_id` populated,
   - `heartbeat_at` refreshing every ~60s while running,
   - stage rows in `wcc_pipeline_run_stages`,
   - one row in `wcc_dataset_snapshots`.
3. Confirm the pipeline appears on the control-center dashboard with a stage timeline.
4. Repeat for each repo.
5. Once all 5 are stable, remove the legacy `_start_run` / `_finish_run` blocks (they're now
   duplicates).
