"use client";

import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DailyStats } from "@/lib/types";
import { formatNumber } from "@/lib/format";

function shortDate(day: string) {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-AE", { day: "numeric", month: "short", timeZone: "UTC" });
}

function VolumeTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: DailyStats }> }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <small>{shortDate(point.day)}</small>
      <strong>{formatNumber(point.rows_written)} rows written</strong>
      <span>{point.total} runs · {point.succeeded} succeeded</span>
    </div>
  );
}

export function ReferenceVolumeChart({ data }: { data: DailyStats[] }) {
  if (!data.length) return <div className="grid h-[228px] place-items-center text-xs text-wolfie-muted">No daily telemetry available</div>;
  return (
    <div className="px-3 pb-3 pt-4">
      <div className="h-[215px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 6, right: 12, bottom: 2, left: -8 }}>
            <defs>
              <linearGradient id="volumeRef" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#0F9F6E" stopOpacity={0.17}/>
                <stop offset="1" stopColor="#0F9F6E" stopOpacity={0.01}/>
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#E8ECF1" vertical={false} strokeDasharray="3 4" />
            <XAxis dataKey="day" tickFormatter={shortDate} minTickGap={28} axisLine={false} tickLine={false} tick={{ fill: "#7A8698", fontSize: 10 }} dy={8}/>
            <YAxis tickFormatter={formatNumber} width={48} axisLine={false} tickLine={false} tick={{ fill: "#7A8698", fontSize: 10 }} tickCount={5}/>
            <Tooltip content={<VolumeTooltip/>} cursor={{ stroke: "#98A2B3", strokeWidth: 1, strokeDasharray: "3 3" }}/>
            <Area dataKey="rows_written" type="monotone" fill="url(#volumeRef)" stroke="none"/>
            <Line dataKey="rows_written" type="monotone" stroke="#0F9F6E" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: "#0F9F6E", stroke: "#fff", strokeWidth: 2 }}/>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
