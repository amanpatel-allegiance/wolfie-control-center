"use client";

import type { Dispatch, SetStateAction } from "react";
import Link from "next/link";
import type { DailyStats, PipelineHealthRow, Run } from "@/lib/types";
import { HealthBadge } from "@/components/StatusBadge";
import { changedRows } from "@/lib/run-stats";
import { formatDuration, formatNumber, formatRelative } from "@/lib/format";
import { describeCron } from "@/lib/schedule";

export function PipelineTable({ rows, runs, daily, selected, onSelectionChange, total }: { rows: PipelineHealthRow[]; runs: Run[]; daily: DailyStats[]; selected: Set<number>; onSelectionChange: Dispatch<SetStateAction<Set<number>>>; total: number }) {
  const latest = new Map<number, Run>(); for (const run of runs) if (run.pipeline_id != null && !latest.has(run.pipeline_id)) latest.set(run.pipeline_id, run);
  const stats = new Map<number,{succeeded:number,total:number}>(); for (const day of daily) { const value = stats.get(day.pipeline_id) ?? {succeeded:0,total:0}; value.succeeded += day.succeeded; value.total += day.total; stats.set(day.pipeline_id,value); }
  const toggle = (id:number) => onSelectionChange((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const allVisible = rows.length > 0 && rows.every((row) => selected.has(row.id));
  const toggleAll = () => onSelectionChange((current) => { const next = new Set(current); if (allVisible) rows.forEach((row) => next.delete(row.id)); else rows.forEach((row) => next.add(row.id)); return next; });
  return <div className="surface overflow-hidden">
    <div className="ref-bulk"><strong>{selected.size} selected</strong><button disabled={!selected.size}>▷ Enable</button><button disabled={!selected.size}>Ⅱ Disable</button><button disabled={!selected.size}>▶ Run now</button><button disabled={!selected.size}>♙ Edit owner</button><button disabled={!selected.size}>⋮ More</button></div>
    <div className="overflow-auto"><table className="data-table min-w-[1320px]"><thead><tr><th><input type="checkbox" aria-label="Select visible pipelines" checked={allVisible} onChange={toggleAll}/></th><th>Pipeline</th><th>Source</th><th>Emirate</th><th>Status</th><th>Freshness</th><th>Last success</th><th>Duration</th><th>Rows changed</th><th>Success 30d</th><th>Schedule</th></tr></thead><tbody>{rows.map((row) => { const run = latest.get(row.id); const rollup = stats.get(row.id); const rate = rollup?.total ? Math.round(rollup.succeeded / rollup.total * 1000) / 10 : null; const isSelected = selected.has(row.id); return <tr key={row.id} className={isSelected ? "ref-selected-row" : ""}><td><input type="checkbox" aria-label={`Select ${row.name}`} checked={isSelected} onChange={() => toggle(row.id)}/></td><td className="name"><Link href={`/pipelines/${row.key}`}><strong>{row.name}</strong><small>{row.key}</small></Link></td><td>{row.source_key}</td><td>{row.jurisdiction ?? "—"}</td><td><HealthBadge state={row.health_state}/></td><td><div>{formatRelative(row.last_change_at ?? row.last_success_started_at)}</div><div className="ref-fresh-bars" aria-hidden="true"><i/><i/><i/><i/><i/></div></td><td>{formatRelative(row.last_success_started_at)}</td><td>{formatDuration(run?.duration_s)}</td><td className={(run && (changedRows(run) ?? 0) > 0) ? "text-state-healthy" : ""}>{run && changedRows(run) != null ? `+${formatNumber(changedRows(run)!)}` : "—"}</td><td>{rate == null ? "—" : `${rate}%`}</td><td><b>{describeCron(row.schedule_expression)}</b></td></tr>; })}</tbody></table></div>
    <div className="p-[13px] text-[11px] text-wolfie-muted">Showing {rows.length ? `1–${rows.length}` : "0"} of {total} pipelines <span className="float-right">‹ &nbsp; <b className="text-state-healthy">1</b> &nbsp; ›</span></div>
  </div>;
}
