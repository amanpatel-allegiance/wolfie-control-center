"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DatasetSnapshot } from "@/lib/types";

function shortDate(day: string) {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-AE", { day: "numeric", month: "short", timeZone: "UTC" });
}

export function QualityTrendChart({ snapshots }: { snapshots: DatasetSnapshot[] }) {
  const days = new Map<string, { day: string; total: number; issues: number; snapshots: number }>();
  for (const snapshot of snapshots) {
    if (snapshot.total_rows == null || snapshot.total_rows <= 0) continue;
    const day = snapshot.snapshot_at.slice(0, 10);
    const item = days.get(day) ?? { day, total: 0, issues: 0, snapshots: 0 };
    item.total += snapshot.total_rows;
    item.issues += Math.max(0, (snapshot.duplicate_count ?? 0) + (snapshot.rejected_count ?? 0));
    item.snapshots += 1;
    days.set(day, item);
  }
  const data = [...days.values()].sort((a, b) => a.day.localeCompare(b.day)).map((item) => ({ ...item, score: Math.max(0, Math.round((1 - item.issues / item.total) * 10_000) / 100) }));
  if (!data.length) return <div className="empty-panel min-h-[238px] text-xs text-wolfie-muted">No row-level snapshot totals are available in this period.</div>;
  return <div className="px-3 pb-3 pt-4"><div className="h-[215px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top: 6, right: 12, bottom: 2, left: -4 }}><defs><linearGradient id="qualityFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1677B8" stopOpacity={0.18}/><stop offset="100%" stopColor="#1677B8" stopOpacity={0.015}/></linearGradient></defs><CartesianGrid stroke="#E8ECF1" vertical={false} strokeDasharray="3 4"/><XAxis dataKey="day" tickFormatter={shortDate} minTickGap={28} axisLine={false} tickLine={false} tick={{ fill: "#7A8698", fontSize: 10 }} dy={8}/><YAxis domain={[0,100]} ticks={[0,25,50,75,100]} tickFormatter={(value) => `${value}%`} width={43} axisLine={false} tickLine={false} tick={{ fill: "#7A8698", fontSize: 10 }}/><Tooltip cursor={{ stroke: "#98A2B3", strokeDasharray: "3 3" }} content={({active,payload}) => { const point = payload?.[0]?.payload as typeof data[number] | undefined; return active && point ? <div className="chart-tooltip"><small>{shortDate(point.day)}</small><strong>{point.score}% quality score</strong><span>{point.issues.toLocaleString()} issues across {point.snapshots} snapshots</span></div> : null; }}/><Area type="monotone" dataKey="score" stroke="#1677B8" strokeWidth={2.5} fill="url(#qualityFill)" dot={data.length < 4 ? { r: 3, fill: "#1677B8", strokeWidth: 0 } : false} activeDot={{r:5,fill:"#1677B8",stroke:"#fff",strokeWidth:2}}/></AreaChart></ResponsiveContainer></div><div className="mt-2 flex justify-between border-t border-wolfie-border/70 px-1 pt-3 text-[10px] text-wolfie-muted"><span>{shortDate(data[0].day)} – {shortDate(data[data.length-1].day)}</span><b className="text-state-running">Weighted from real snapshot rows</b></div></div>;
}
