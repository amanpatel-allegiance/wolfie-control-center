"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { DailyStats, PipelineHealthRow, Run } from "@/lib/types";
import { PipelineTable } from "@/components/PipelineTable";
import { sourceLabel } from "@/lib/source-label";

export function PipelineExplorer({ rows, runs, daily, initialQuery = "", initialState = "all", initialSource = "all" }: { rows: PipelineHealthRow[]; runs: Run[]; daily: DailyStats[]; initialQuery?: string; initialState?: string; initialSource?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [state, setState] = useState(initialState || "all");
  const [source, setSource] = useState(initialSource || "all");
  const [jurisdiction, setJurisdiction] = useState("all");
  const [slaState, setSlaState] = useState("all");
  const [selected, setSelected] = useState<Set<number>>(() => new Set(rows.slice(0, 2).map((row) => row.id)));
  const sources = useMemo(() => Array.from(new Set(rows.map((row) => row.source_key))).sort(), [rows]);
  const jurisdictions = useMemo(() => Array.from(new Set(rows.map((row) => row.jurisdiction).filter(Boolean) as string[])).sort(), [rows]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (state !== "all" && row.health_state !== state) return false;
      if (source !== "all" && row.source_key !== source) return false;
      if (jurisdiction !== "all" && row.jurisdiction !== jurisdiction) return false;
      const breached = row.freshness_hours != null && row.freshness_hours > row.freshness_sla_hours;
      if (slaState === "breached" && !breached) return false;
      if (slaState === "within" && breached) return false;
      if (needle && !`${row.name} ${row.key} ${row.source_key} ${row.jurisdiction ?? ""}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [jurisdiction, query, rows, slaState, source, state]);

  return (
    <div>
      <div className="ref-filterbar">
          <label className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-wolfie-muted"/><input value={query} onChange={(event) => setQuery(event.target.value)} className="ref-field ref-search-field pl-9" placeholder="Search pipelines" /></label>
            <select value={source} onChange={(event) => setSource(event.target.value)} className="ref-field">
              <option value="all">All sources</option>
              {sources.map((item) => <option key={item} value={item}>{sourceLabel(item)}</option>)}
            </select>
            <select value={jurisdiction} onChange={(event) => setJurisdiction(event.target.value)} className="ref-field"><option value="all">All emirates</option>{jurisdictions.map((item) => <option key={item} value={item}>{item}</option>)}</select>
            <select value={state} onChange={(event) => setState(event.target.value)} className="ref-field"><option value="all">Any status</option>{["healthy","running","warning","stale","failed","stuck"].map((item) => <option key={item} value={item}>{item}</option>)}</select>
            <select value={slaState} onChange={(event) => setSlaState(event.target.value)} className="ref-field"><option value="all">SLA state</option><option value="within">Within SLA</option><option value="breached">Breached</option></select>
            <button type="button" className="ref-btn" onClick={() => setState("warning")}>Needs attention⌄</button>
      </div>
      <PipelineTable rows={filtered} runs={runs} daily={daily} selected={selected} onSelectionChange={setSelected} total={rows.length} />
    </div>
  );
}
