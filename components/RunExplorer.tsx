"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search, X } from "lucide-react";
import type { Run } from "@/lib/types";
import { RunStatusBadge } from "@/components/StatusBadge";
import { changedRows, processedRows, runMode } from "@/lib/run-stats";
import { formatDuration, formatNumber, formatRelative } from "@/lib/format";

export function RunExplorer({ runs, initialQuery = "", initialStatus = "all" }: { runs: Run[]; initialQuery?: string; initialStatus?: string }) {
  const [query, setQuery] = useState(initialQuery); const [status, setStatus] = useState(initialStatus); const [trigger, setTrigger] = useState("all");
  const statuses = useMemo(() => [...new Set(runs.map((r) => r.status))].sort(), [runs]);
  const triggers = useMemo(() => [...new Set(runs.map((r) => r.trigger))].sort(), [runs]);
  const filtered = useMemo(() => runs.filter((r) => { const needle = query.trim().toLowerCase(); return (status === "all" || r.status === status) && (trigger === "all" || r.trigger === trigger) && (!needle || `${r.id} ${r.pipeline_name} ${r.pipeline_key} ${r.source_key} ${r.commit_sha}`.toLowerCase().includes(needle)); }), [runs, query, status, trigger]);
  return <div><div className="ref-filterbar"><label className="relative"><Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-wolfie-muted"/><input className="ref-field ref-search-field pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search runs"/></label><select className="ref-field min-w-40 capitalize"><option>All pipelines</option></select><select className="ref-field min-w-40 capitalize" value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">Any status</option>{statuses.map((s) => <option key={s}>{s}</option>)}</select><select className="ref-field min-w-36 capitalize" value={trigger} onChange={(e) => setTrigger(e.target.value)}><option value="all">All triggers</option>{triggers.map((s) => <option key={s}>{s}</option>)}</select>{(query || status !== "all" || trigger !== "all") && <button className="ref-btn" onClick={() => { setQuery(""); setStatus("all"); setTrigger("all"); }}><X className="size-3.5"/>Clear</button>}</div>
    <div className="surface overflow-x-auto"><table className="data-table min-w-[1080px]"><thead><tr><th>Run ID</th><th>Pipeline</th><th>Status</th><th>Trigger</th><th>Started</th><th>Duration</th><th>Processed</th><th>Changed</th><th>Commit</th></tr></thead><tbody>{filtered.map((r) => <tr key={r.id}><td><Link href={`/runs/${r.id}`} className="group font-semibold hover:text-wolfie-accent">run_{r.id}<ArrowUpRight className="ml-1 inline size-3 opacity-0 group-hover:opacity-100"/></Link></td><td>{r.pipeline_name ?? r.pipeline_key ?? "Unmapped"}</td><td><RunStatusBadge status={r.status}/></td><td className="capitalize">{r.trigger}<div className="text-[10px] text-wolfie-muted">{runMode(r)}</div></td><td className="whitespace-nowrap">{formatRelative(r.started_at)}</td><td>{formatDuration(r.duration_s)}</td><td>{processedRows(r) == null ? "—" : formatNumber(processedRows(r)!)}</td><td>{changedRows(r) == null ? "—" : formatNumber(changedRows(r)!)}</td><td className="font-mono text-[10px]">{r.commit_sha?.slice(0, 7) ?? "—"}</td></tr>)}</tbody></table>{filtered.length === 0 && <div className="empty-panel min-h-40 text-xs text-wolfie-muted">No runs match these filters.</div>}</div></div>;
}
