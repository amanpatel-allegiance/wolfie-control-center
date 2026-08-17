"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, Bar, CartesianGrid, ComposedChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, Clock3, DatabaseZap, TrendingUp } from "lucide-react";
import type { DailyStats, HealthState } from "@/lib/types";
import { cn } from "@/lib/cn";
import { formatDuration, formatNumber } from "@/lib/format";

type HealthDatum = { state: HealthState; value: number };
type TrendPoint = {
  key: string;
  label: string;
  total: number;
  succeeded: number;
  partial: number;
  failed: number;
  other: number;
  successRate: number | null;
  avgDuration: number | null;
  rowsWritten: number;
};

function formatAxisDuration(value: number) {
  if (value >= 3600) return `${Math.round(value / 3600)}h`;
  if (value >= 60) return `${Math.round(value / 60)}m`;
  return `${Math.round(value)}s`;
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload as TrendPoint;
  return (
    <div className="min-w-56 rounded-lg border border-wolfie-border bg-white p-3 shadow-lift">
      <div className="text-xs font-semibold text-wolfie-ink">{label}</div>
      <div className="mt-2.5 grid grid-cols-2 gap-x-6 gap-y-1.5 text-[11px]">
        <span className="text-wolfie-muted">Total runs</span><b className="text-right tabular">{point.total}</b>
        <span className="text-wolfie-muted">Succeeded</span><b className="text-right text-state-healthy tabular">{point.succeeded}</b>
        <span className="text-wolfie-muted">Partial</span><b className="text-right text-state-warning tabular">{point.partial}</b>
        <span className="text-wolfie-muted">Failed</span><b className="text-right text-state-failed tabular">{point.failed}</b>
        <span className="text-wolfie-muted">Success rate</span><b className="text-right tabular">{point.successRate == null ? "—" : `${point.successRate}%`}</b>
        <span className="text-wolfie-muted">Avg runtime</span><b className="text-right tabular">{formatDuration(point.avgDuration)}</b>
        <span className="text-wolfie-muted">Rows written</span><b className="text-right tabular">{point.rowsWritten.toLocaleString()}</b>
      </div>
    </div>
  );
}

function MiniTooltip({ active, payload, label, kind }: any) {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value as number | null;
  return <div className="rounded-lg border border-wolfie-border bg-white px-3 py-2 text-[11px] shadow-lift"><b>{label}</b><div className="mt-1 text-wolfie-muted">{kind === "duration" ? formatDuration(value) : `${formatNumber(value)} rows`}</div></div>;
}

function EmptyTrend({ label }: { label: string }) {
  return <div className="grid h-full place-items-center text-center text-xs text-wolfie-muted"><div><Activity className="mx-auto mb-2 size-5 opacity-30" />No {label} recorded in this period</div></div>;
}

export function OverviewCharts({ dailyStats, health, generatedAt }: { dailyStats: DailyStats[]; health: HealthDatum[]; generatedAt: string }) {
  const [range, setRange] = useState<7 | 14 | 30>(30);
  const allDays = useMemo<TrendPoint[]>(() => {
    const end = new Date(generatedAt); end.setUTCHours(0, 0, 0, 0);
    return Array.from({ length: 30 }, (_, index) => {
      const date = new Date(end); date.setUTCDate(end.getUTCDate() - (29 - index));
      const key = date.toISOString().slice(0, 10);
      const rows = dailyStats.filter((row) => row.day.slice(0, 10) === key);
      const total = rows.reduce((sum, row) => sum + row.total, 0);
      const succeeded = rows.reduce((sum, row) => sum + row.succeeded, 0);
      const partial = rows.reduce((sum, row) => sum + row.partial, 0);
      const failed = rows.reduce((sum, row) => sum + row.failed, 0);
      const rowsWritten = rows.reduce((sum, row) => sum + row.rows_written, 0);
      const weightedDuration = rows.reduce((sum, row) => sum + (row.avg_duration_s ?? 0) * row.total, 0);
      return {
        key,
        label: date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
        total, succeeded, partial, failed, rowsWritten,
        other: Math.max(0, total - succeeded - partial - failed),
        successRate: total ? Math.round((succeeded / total) * 100) : null,
        avgDuration: total ? Math.round(weightedDuration / total) : null,
      };
    });
  }, [dailyStats, generatedAt]);
  const data = allDays.slice(-range);
  const hasRuns = data.some((point) => point.total > 0);
  const totalRuns = data.reduce((sum, point) => sum + point.total, 0);
  const successfulRuns = data.reduce((sum, point) => sum + point.succeeded, 0);
  const failedRuns = data.reduce((sum, point) => sum + point.failed, 0);
  const totalRows = data.reduce((sum, point) => sum + point.rowsWritten, 0);
  const completionRate = totalRuns ? Math.round((successfulRuns / totalRuns) * 100) : null;
  const healthyCount = health.find((item) => item.state === "healthy")?.value ?? 0;
  const healthTotal = health.reduce((sum, item) => sum + item.value, 0);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-base font-semibold tracking-tight">Telemetry trends</h2><p className="mt-1 text-xs text-wolfie-muted">Production execution data aggregated by UTC day</p></div>
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1.5 text-[10px] font-medium text-wolfie-muted sm:flex"><span className="size-1.5 rounded-full bg-state-healthy" />{healthyCount} of {healthTotal} pipelines healthy</span>
          <div className="flex rounded-lg border border-wolfie-border bg-white p-1 shadow-sm">
            {([7, 14, 30] as const).map((value) => <button key={value} type="button" onClick={() => setRange(value)} className={cn("rounded-md px-3 py-1.5 text-[11px] font-semibold transition", range === value ? "bg-wolfie-navy text-white" : "text-wolfie-muted hover:bg-wolfie-soft hover:text-wolfie-ink")}>{value}D</button>)}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(310px,.7fr)]">
        <article className="surface overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-wolfie-border px-5 py-4">
            <div><div className="flex items-center gap-2 text-sm font-semibold"><TrendingUp className="size-4 text-wolfie-accent" />Execution volume</div><p className="mt-1 text-xs text-wolfie-muted">Run count with success rate and failures over time</p></div>
            <div className="flex gap-5">
              <div><div className="text-[9px] font-semibold uppercase tracking-wider text-wolfie-muted">Runs</div><div className="mt-1 text-lg font-semibold tabular">{totalRuns}</div></div>
              <div><div className="text-[9px] font-semibold uppercase tracking-wider text-wolfie-muted">Success</div><div className="mt-1 text-lg font-semibold text-state-healthy tabular">{completionRate == null ? "—" : `${completionRate}%`}</div></div>
              <div><div className="text-[9px] font-semibold uppercase tracking-wider text-wolfie-muted">Failed</div><div className="mt-1 text-lg font-semibold text-state-failed tabular">{failedRuns}</div></div>
            </div>
          </div>
          <div className="h-[340px] px-3 pb-3 pt-5 sm:px-4">
            {!hasRuns ? <EmptyTrend label="executions" /> : <ResponsiveContainer>
              <ComposedChart data={data} margin={{ top: 14, right: 8, bottom: 4, left: -14 }}>
                <defs>
                  <linearGradient id="runVolumeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4F46E5" stopOpacity={0.22} /><stop offset="100%" stopColor="#4F46E5" stopOpacity={0.015} /></linearGradient>
                </defs>
                <CartesianGrid stroke="#EAECF0" vertical={false} />
                <XAxis dataKey="label" interval={range === 30 ? 4 : range === 14 ? 1 : 0} tick={{ fill: "#667085", fontSize: 10 }} tickLine={false} axisLine={false} tickMargin={11} />
                <YAxis yAxisId="runs" allowDecimals={false} tick={{ fill: "#98A2B3", fontSize: 9 }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="rate" orientation="right" domain={[0, 100]} ticks={[0, 50, 100]} tickFormatter={(value) => `${value}%`} tick={{ fill: "#98A2B3", fontSize: 9 }} tickLine={false} axisLine={false} width={34} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#98A2B3", strokeDasharray: "3 3" }} />
                <Area isAnimationActive={false} yAxisId="runs" type="monotone" dataKey="total" stroke="#4F46E5" strokeWidth={2.2} fill="url(#runVolumeFill)" connectNulls />
                <Bar isAnimationActive={false} yAxisId="runs" dataKey="failed" fill="#E5484D" barSize={range === 7 ? 16 : 9} radius={[3, 3, 0, 0]} />
                <Line isAnimationActive={false} yAxisId="rate" type="monotone" dataKey="successRate" stroke="#12A878" strokeWidth={2} dot={false} connectNulls activeDot={{ r: 4, fill: "#12A878", stroke: "#fff", strokeWidth: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-5 border-t border-wolfie-border px-5 py-3 text-[10px] font-medium text-wolfie-muted"><span><i className="mr-1.5 inline-block h-0.5 w-3 bg-wolfie-accent align-middle" />Total runs</span><span><i className="mr-1.5 inline-block h-0.5 w-3 bg-state-healthy align-middle" />Success rate</span><span><i className="mr-1.5 inline-block size-2 rounded-sm bg-state-failed" />Failed runs</span></div>
        </article>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <article className="surface overflow-hidden">
            <div className="flex items-start justify-between px-4 pt-4"><div><div className="flex items-center gap-2 text-xs font-semibold"><Clock3 className="size-3.5 text-wolfie-accent" />Runtime trend</div><p className="mt-1 text-[10px] text-wolfie-muted">Weighted daily average</p></div><span className="rounded-md bg-wolfie-lavender px-2 py-1 text-[9px] font-semibold text-wolfie-accent">{range}D</span></div>
            <div className="h-[165px] px-2 pb-2 pt-3">
              {!hasRuns ? <EmptyTrend label="runtime" /> : <ResponsiveContainer><LineChart data={data} margin={{ top: 5, right: 8, bottom: 0, left: -18 }}><CartesianGrid stroke="#F0F2F5" vertical={false} /><XAxis dataKey="label" hide /><YAxis tick={{ fill: "#98A2B3", fontSize: 8 }} tickFormatter={formatAxisDuration} tickLine={false} axisLine={false} width={42} /><Tooltip content={<MiniTooltip kind="duration" />} cursor={{ stroke: "#98A2B3", strokeDasharray: "3 3" }} /><Line isAnimationActive={false} type="monotone" dataKey="avgDuration" stroke="#7C3AED" strokeWidth={2} dot={false} connectNulls activeDot={{ r: 3 }} /></LineChart></ResponsiveContainer>}
            </div>
          </article>

          <article className="surface overflow-hidden">
            <div className="flex items-start justify-between px-4 pt-4"><div><div className="flex items-center gap-2 text-xs font-semibold"><DatabaseZap className="size-3.5 text-wolfie-accent" />Rows written</div><p className="mt-1 text-[10px] text-wolfie-muted">{formatNumber(totalRows)} rows in this window</p></div><span className="rounded-md bg-wolfie-lavender px-2 py-1 text-[9px] font-semibold text-wolfie-accent">{range}D</span></div>
            <div className="h-[165px] px-2 pb-2 pt-3">
              {!data.some((point) => point.rowsWritten > 0) ? <EmptyTrend label="row writes" /> : <ResponsiveContainer><AreaChart data={data} margin={{ top: 5, right: 8, bottom: 0, left: -18 }}><defs><linearGradient id="rowsFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3B82F6" stopOpacity={0.25} /><stop offset="100%" stopColor="#3B82F6" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid stroke="#F0F2F5" vertical={false} /><XAxis dataKey="label" hide /><YAxis tick={{ fill: "#98A2B3", fontSize: 8 }} tickFormatter={(value) => formatNumber(value)} tickLine={false} axisLine={false} width={48} /><Tooltip content={<MiniTooltip kind="rows" />} cursor={{ stroke: "#98A2B3", strokeDasharray: "3 3" }} /><Area isAnimationActive={false} type="monotone" dataKey="rowsWritten" stroke="#3B82F6" strokeWidth={2} fill="url(#rowsFill)" connectNulls /></AreaChart></ResponsiveContainer>}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
