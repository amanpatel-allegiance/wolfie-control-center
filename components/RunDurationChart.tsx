"use client";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity } from "lucide-react";
import { formatDuration } from "@/lib/format";

type Day = { day: string; succeeded: number; failed: number; partial: number; total: number; avg_duration_s: number | null };

export function RunDurationChart({ data }: { data: Day[] }) {
  if (!data.length) {
    return <div className="surface border-dashed px-4 py-12 text-center text-sm text-wolfie-muted">No runs in the last 30 days</div>;
  }
  return (
    <div className="surface overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-wolfie-border px-5 py-4">
        <div><div className="flex items-center gap-2 text-sm font-semibold"><Activity className="size-4 text-wolfie-accent" /> Execution trend</div><p className="mt-1 text-xs text-wolfie-muted">Daily outcomes with average runtime overlay</p></div>
        <div className="flex flex-wrap items-center gap-3 text-[10px] font-medium text-wolfie-muted">
          <span><i className="mr-1.5 inline-block size-2 rounded-sm bg-state-healthy" />Succeeded</span>
          <span><i className="mr-1.5 inline-block size-2 rounded-sm bg-state-warning" />Partial</span>
          <span><i className="mr-1.5 inline-block size-2 rounded-sm bg-state-failed" />Failed</span>
          <span><i className="mr-1.5 inline-block h-0.5 w-3 bg-wolfie-accent align-middle" />Avg runtime</span>
        </div>
      </div>
      <div className="px-3 pb-3 pt-5" style={{ width: "100%", height: 300 }}>
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid stroke="#EEF0F3" vertical={false} />
            <XAxis dataKey="day" fontSize={10} tickFormatter={(d) => d.slice(5)} axisLine={false} tickLine={false} tickMargin={10} />
            <YAxis yAxisId="runs" fontSize={10} allowDecimals={false} axisLine={false} tickLine={false} width={32} />
            <YAxis yAxisId="duration" orientation="right" fontSize={10} axisLine={false} tickLine={false} width={44} tickFormatter={(value) => formatDuration(value)} />
            <Tooltip
              cursor={{ fill: "rgba(15,159,110,.04)" }}
              contentStyle={{ fontSize: 11, borderRadius: 10, border: "1px solid #E3E7ED", padding: "8px 10px", boxShadow: "0 12px 32px rgba(16,24,40,.10)" }}
              formatter={(value: number, name: string) => [name === "avg_duration_s" ? formatDuration(value) : value, name === "avg_duration_s" ? "Avg runtime" : name]}
            />
            <Bar isAnimationActive={false} yAxisId="runs" dataKey="succeeded" stackId="a" fill="#12A878" barSize={14} radius={[0, 0, 2, 2]} />
            <Bar isAnimationActive={false} yAxisId="runs" dataKey="partial" stackId="a" fill="#EAAA08" barSize={14} />
            <Bar isAnimationActive={false} yAxisId="runs" dataKey="failed" stackId="a" fill="#E5484D" barSize={14} radius={[2, 2, 0, 0]} />
            <Line isAnimationActive={false} yAxisId="duration" type="monotone" dataKey="avg_duration_s" stroke="#1677B8" strokeWidth={2} dot={false} connectNulls activeDot={{ r: 4, fill: "#1677B8", stroke: "#fff", strokeWidth: 2 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
