"use client";

import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DailyStats } from "@/lib/types";

export function RunSuccessTrend({ rows }: { rows: DailyStats[] }) {
  const byDay = new Map<string, { day: string; succeeded: number; failed: number; partial: number; total: number; rows: number }>();
  for (const row of rows) {
    const item = byDay.get(row.day) ?? { day: row.day, succeeded: 0, failed: 0, partial: 0, total: 0, rows: 0 };
    item.succeeded += row.succeeded; item.failed += row.failed; item.partial += row.partial; item.total += row.total; item.rows += row.rows_written;
    byDay.set(row.day, item);
  }
  const data = [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day)).map((item) => ({ ...item, rate: item.total ? Math.round((item.succeeded / item.total) * 100) : null }));
  if (!data.length) return <div className="empty-panel min-h-[238px] text-xs text-wolfie-muted">No daily run aggregates are available for this period.</div>;
  const current = [...data].reverse().find((item) => item.rate != null)?.rate;
  return <div className="p-[14px]"><div className="h-[200px]"><ResponsiveContainer><ComposedChart data={data} margin={{ top: 5, right: 8, bottom: 0, left: -18 }}><defs><linearGradient id="successFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0F9F6E" stopOpacity={0.12}/><stop offset="100%" stopColor="#0F9F6E" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#E6E9ED" vertical={false}/><XAxis dataKey="day" hide/><YAxis domain={[0, 100]} hide/><Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #E3E7EC" }} formatter={(value: number) => [`${value}%`, "Success rate"]}/><Area type="monotone" dataKey="rate" stroke="none" fill="url(#successFill)" connectNulls/><Line type="monotone" dataKey="rate" stroke="#0F9F6E" strokeWidth={3} dot={false} activeDot={{ r: 4, fill: "#0F9F6E", stroke: "#fff", strokeWidth: 2 }} connectNulls/></ComposedChart></ResponsiveContainer></div><div className="flex justify-between text-[11px] text-wolfie-muted"><span>{data[0]?.day}</span><b className="text-state-healthy">{current == null ? "—" : `${current}% current`}</b></div></div>;
}
