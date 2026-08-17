"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import type { PipelineHealthRow } from "@/lib/types";
import { PipelineTable } from "@/components/PipelineTable";
import { cn } from "@/lib/cn";

const states = ["all", "healthy", "running", "warning", "stale", "failed", "stuck"] as const;

export function PipelineExplorer({ rows, initialQuery = "", initialState = "all", initialSource = "all" }: { rows: PipelineHealthRow[]; initialQuery?: string; initialState?: string; initialSource?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [state, setState] = useState(initialState || "all");
  const [source, setSource] = useState(initialSource || "all");
  const sources = useMemo(() => Array.from(new Set(rows.map((row) => row.source_key))).sort(), [rows]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (state !== "all" && row.health_state !== state) return false;
      if (source !== "all" && row.source_key !== source) return false;
      if (needle && !`${row.name} ${row.key} ${row.source_key} ${row.jurisdiction ?? ""}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [query, rows, source, state]);
  const hasFilters = query || state !== "all" || source !== "all";

  return (
    <div className="space-y-3">
      <div className="surface p-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search pipelines</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-wolfie-muted" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="control w-full pl-9" placeholder="Search by pipeline, key, source, or jurisdiction…" />
          </label>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 xl:pb-0">
            <SlidersHorizontal className="size-3.5 shrink-0 text-wolfie-muted" />
            {states.map((item) => (
              <button key={item} type="button" onClick={() => setState(item)} className={cn("h-8 shrink-0 rounded-lg px-2.5 text-[11px] font-semibold capitalize transition", state === item ? "bg-wolfie-navy text-white shadow-sm" : "bg-wolfie-soft text-wolfie-muted hover:text-wolfie-ink")}>
                {item}
              </button>
            ))}
            <select value={source} onChange={(event) => setSource(event.target.value)} className="control h-9 min-w-36 text-xs">
              <option value="all">All sources</option>
              {sources.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            {hasFilters && <button type="button" onClick={() => { setQuery(""); setState("all"); setSource("all"); }} className="grid size-9 shrink-0 place-items-center rounded-lg text-wolfie-muted transition hover:bg-wolfie-soft hover:text-wolfie-ink" title="Clear filters"><X className="size-4" /></button>}
          </div>
        </div>
        <div className="mt-3 text-2xs text-wolfie-muted"><span className="font-semibold text-wolfie-ink">{filtered.length}</span> of {rows.length} pipelines shown</div>
      </div>
      <PipelineTable rows={filtered} />
    </div>
  );
}
