import type { Run } from "@/lib/types";

function numberValue(stats: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = stats[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  }
  return null;
}

export function processedRows(run: Pick<Run, "stats">): number | null {
  return numberValue(run.stats ?? {}, [
    "rows_processed",
    "rows_seen",
    "rows_fetched",
    "row_count",
    "total_rows_local_after",
    "total_rows_local",
  ]);
}

export function changedRows(run: Pick<Run, "stats">): number | null {
  const stats = run.stats ?? {};
  const direct = numberValue(stats, ["rows_written", "rows_upserted", "rows_touched", "new_rows_delta"]);
  if (direct != null) return direct;

  const entityValues = Object.entries(stats)
    .filter(([key, value]) => key.endsWith("_rows_upserted") && typeof value === "number" && Number.isFinite(value))
    .map(([, value]) => value as number);
  return entityValues.length ? entityValues.reduce((sum, value) => sum + value, 0) : null;
}

export function rejectedRows(run: Pick<Run, "stats" | "warning_count">): number | null {
  const direct = numberValue(run.stats ?? {}, ["rows_rejected", "rejected", "errors", "rows_failed"]);
  return direct ?? (run.warning_count > 0 ? run.warning_count : null);
}

export function runMode(run: Pick<Run, "stats" | "kind">): string {
  const value = run.stats?.mode;
  if (typeof value === "string" && value.trim()) return value;
  if (/backfill/i.test(run.kind)) return "backfill";
  if (/full/i.test(run.kind)) return "full";
  if (/incremental/i.test(run.kind)) return "incremental";
  return "—";
}
