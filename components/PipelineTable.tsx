"use client";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Download, LoaderCircle, Play, X } from "lucide-react";
import type { DailyStats, PipelineHealthRow, Run } from "@/lib/types";
import { HealthBadge } from "@/components/StatusBadge";
import { changedRows } from "@/lib/run-stats";
import { formatDuration, formatNumber, formatRelative } from "@/lib/format";
import { describeCron } from "@/lib/schedule";
import { sourceLabel } from "@/lib/source-label";
import { downloadCsv } from "@/components/CsvExportButton";

const PAGE_SIZE = 10;

export function PipelineTable({ rows, runs, daily, canRun, selected, onSelectionChange, total }: { rows: PipelineHealthRow[]; runs: Run[]; daily: DailyStats[]; canRun: boolean; selected: Set<number>; onSelectionChange: Dispatch<SetStateAction<Set<number>>>; total: number }) {
  const [page, setPage] = useState(0);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");
  const latest = new Map<number, Run>(); for (const run of runs) if (run.pipeline_id != null && !latest.has(run.pipeline_id)) latest.set(run.pipeline_id, run);
  const stats = new Map<number,{succeeded:number,total:number}>(); for (const day of daily) { const value = stats.get(day.pipeline_id) ?? {succeeded:0,total:0}; value.succeeded += day.succeeded; value.total += day.total; stats.set(day.pipeline_id,value); }
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const visibleRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const selectedRows = useMemo(() => rows.filter((row) => selected.has(row.id)), [rows, selected]);
  useEffect(() => setPage(0), [rows]);
  const toggle = (id:number) => onSelectionChange((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const allVisible = visibleRows.length > 0 && visibleRows.every((row) => selected.has(row.id));
  const toggleAll = () => onSelectionChange((current) => { const next = new Set(current); if (allVisible) visibleRows.forEach((row) => next.delete(row.id)); else visibleRows.forEach((row) => next.add(row.id)); return next; });
  const exportSelected = () => downloadCsv("wolfie-selected-pipelines.csv", ["Pipeline","Key","Source","Emirate","Status","Freshness hours","SLA hours","Schedule"], selectedRows.map((row) => [row.name,row.key,row.source_key,row.jurisdiction,row.health_state,row.freshness_hours,row.freshness_sla_hours,row.schedule_expression]));
  const runSelected = async () => {
    if (!canRun) { setMessage("An operator or admin role is required to dispatch production runs."); return; }
    setRunning(true); setMessage("");
    const results = await Promise.all(selectedRows.map(async (row) => { const response = await fetch(`/api/pipelines/${row.key}/run`, { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify({ mode: "incremental", note: "Bulk run from pipeline registry" }) }); return response.ok; }));
    const succeeded = results.filter(Boolean).length;
    setMessage(`${succeeded} of ${results.length} pipeline run${results.length === 1 ? "" : "s"} dispatched.`); setRunning(false);
  };
  return <div className="surface overflow-hidden">
    {selected.size > 0 && <div className="ref-bulk"><strong>{selected.size} selected</strong><button type="button" onClick={exportSelected}><Download/>Export selected</button><button type="button" disabled={running} onClick={runSelected}>{running ? <LoaderCircle className="animate-spin"/> : <Play/>}{running ? "Dispatching…" : "Run selected"}</button><button type="button" onClick={() => { onSelectionChange(new Set()); setMessage(""); }}><X/>Clear</button>{message && <span className="ml-auto whitespace-normal text-[11px] text-wolfie-muted">{message}</span>}</div>}
    <div className="overflow-auto"><table className="data-table min-w-[1320px]"><thead><tr><th><input type="checkbox" aria-label="Select visible pipelines" checked={allVisible} onChange={toggleAll}/></th><th>Pipeline</th><th>Source</th><th>Emirate</th><th>Status</th><th>Freshness</th><th>Last success</th><th>Duration</th><th>Rows changed</th><th>Success 30d</th><th>Schedule</th></tr></thead><tbody>{visibleRows.map((row) => { const run = latest.get(row.id); const rollup = stats.get(row.id); const rate = rollup?.total ? Math.round(rollup.succeeded / rollup.total * 1000) / 10 : null; const isSelected = selected.has(row.id); return <tr key={row.id} className={isSelected ? "ref-selected-row" : ""}><td><input type="checkbox" aria-label={`Select ${row.name}`} checked={isSelected} onChange={() => toggle(row.id)}/></td><td className="name"><Link href={`/pipelines/${row.key}`}><strong>{row.name}</strong><small>{row.key}</small></Link></td><td>{sourceLabel(row.source_key)}</td><td>{row.jurisdiction ?? "—"}</td><td><HealthBadge state={row.health_state}/></td><td><div>{formatRelative(row.last_change_at ?? row.last_success_started_at)}</div><div className="ref-fresh-bars" aria-hidden="true"><i/><i/><i/><i/><i/></div></td><td>{formatRelative(row.last_success_started_at)}</td><td>{formatDuration(run?.duration_s)}</td><td className={(run && (changedRows(run) ?? 0) > 0) ? "text-state-healthy" : ""}>{run && changedRows(run) != null ? `+${formatNumber(changedRows(run)!)}` : "—"}</td><td>{rate == null ? "—" : `${rate}%`}</td><td><b>{describeCron(row.schedule_expression)}</b></td></tr>; })}</tbody></table>{visibleRows.length === 0 && <div className="empty-panel min-h-40 text-xs text-wolfie-muted">No pipelines match these filters.</div>}</div>
    <div className="flex items-center justify-between gap-3 p-[13px] text-[11px] text-wolfie-muted"><span>Showing {rows.length ? `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, rows.length)}` : "0"} of {rows.length}{rows.length !== total ? ` filtered · ${total} total` : ""}</span><span className="flex items-center gap-1"><button type="button" className="grid size-7 place-items-center rounded border border-wolfie-border hover:bg-wolfie-soft disabled:opacity-35" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))} aria-label="Previous page"><ChevronLeft className="size-3.5"/></button><b className="px-2 text-state-healthy">{page + 1} / {pageCount}</b><button type="button" className="grid size-7 place-items-center rounded border border-wolfie-border hover:bg-wolfie-soft disabled:opacity-35" disabled={page >= pageCount - 1} onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))} aria-label="Next page"><ChevronRight className="size-3.5"/></button></span></div>
  </div>;
}
