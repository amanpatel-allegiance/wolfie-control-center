"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DailyStats } from "@/lib/types";

function shortDate(day: string) {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-AE", { day: "numeric", month: "short", timeZone: "UTC" });
}

function SuccessTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { day: string; rate: number; succeeded: number; total: number } }> }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <small>{shortDate(point.day)}</small>
      <strong>{point.rate}% success rate</strong>
      <span>{point.succeeded} of {point.total} runs succeeded</span>
    </div>
  );
}

export function RunSuccessTrend({ rows }: { rows: DailyStats[] }) {
  const byDay = new Map<string, { day: string; succeeded: number; total: number }>();
  for (const row of rows) {
    const item = byDay.get(row.day) ?? { day: row.day, succeeded: 0, total: 0 };
    item.succeeded += row.succeeded;
    item.total += row.total;
    byDay.set(row.day, item);
  }

  const data = [...byDay.values()]
    .sort((a, b) => a.day.localeCompare(b.day))
    .map((item) => ({ ...item, rate: item.total ? Math.round((item.succeeded / item.total) * 100) : null }))
    .filter((item): item is typeof item & { rate: number } => item.rate != null);

  if (!data.length) return <div className="empty-panel min-h-[238px] text-xs text-wolfie-muted">No daily run aggregates are available for this period.</div>;

  const current = data[data.length - 1];
  return (
    <div className="px-3 pb-3 pt-4">
      <div className="h-[205px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 12, bottom: 2, left: -10 }}>
            <defs>
              <linearGradient id="successTrendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0F9F6E" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#0F9F6E" stopOpacity={0.015} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#E8ECF1" vertical={false} strokeDasharray="3 4" />
            <XAxis dataKey="day" tickFormatter={shortDate} minTickGap={30} axisLine={false} tickLine={false} tick={{ fill: "#7A8698", fontSize: 10 }} dy={8} />
            <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(value) => `${value}%`} width={42} axisLine={false} tickLine={false} tick={{ fill: "#7A8698", fontSize: 10 }} />
            <Tooltip content={<SuccessTooltip />} cursor={{ stroke: "#98A2B3", strokeWidth: 1, strokeDasharray: "3 3" }} />
            <Area type="monotone" dataKey="rate" stroke="#0F9F6E" strokeWidth={2.5} fill="url(#successTrendFill)" activeDot={{ r: 5, fill: "#0F9F6E", stroke: "#fff", strokeWidth: 2 }} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-wolfie-border/70 px-1 pt-3 text-[10px] text-wolfie-muted">
        <span>{shortDate(data[0].day)} – {shortDate(current.day)}</span>
        <b className={current.rate < 90 ? "text-state-failed" : "text-state-healthy"}>{current.rate}% current</b>
      </div>
    </div>
  );
}
