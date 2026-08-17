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
  if (!data.length) return <div className="empty-panel min-h-[260px] text-xs text-wolfie-muted">No daily run aggregates are available for this period.</div>;
  return <div className="h-[270px] px-2 pb-3 pt-5"><ResponsiveContainer><ComposedChart data={data} margin={{ top: 5, right: 14, bottom: 0, left: -14 }}><defs><linearGradient id="successFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0F9F6E" stopOpacity={0.18}/><stop offset="100%" stopColor="#0F9F6E" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#EEF0F3" vertical={false}/><XAxis dataKey="day" tickFormatter={(value) => value.slice(5)} fontSize={10} axisLine={false} tickLine={false} tickMargin={9}/><YAxis domain={[0, 100]} fontSize={10} axisLine={false} tickLine={false} tickFormatter={(value) => `${value}%`} width={40}/><Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #E3E7EC", boxShadow: "0 10px 28px rgba(16,24,40,.09)" }} formatter={(value: number, name: string) => [name === "rate" ? `${value}%` : value, name === "rate" ? "Success rate" : name]}/><Area type="monotone" dataKey="rate" stroke="none" fill="url(#successFill)" connectNulls/><Line type="monotone" dataKey="rate" stroke="#0F9F6E" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#0F9F6E", stroke: "#fff", strokeWidth: 2 }} connectNulls/></ComposedChart></ResponsiveContainer></div>;
}
