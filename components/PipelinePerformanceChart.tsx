"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, CalendarDays, Database } from "lucide-react";
import type { DailyStats, PipelineHealthRow } from "@/lib/types";
import { cn } from "@/lib/cn";

type ReliabilityRow = {
  id: number;
  key: string;
  name: string;
  total: number;
  succeeded: number;
  partial: number;
  failed: number;
  other: number;
  succeededPct: number;
  partialPct: number;
  failedPct: number;
  otherPct: number;
};

function ReliabilityTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as ReliabilityRow;
  return (
    <div className="min-w-52 rounded-xl border border-wolfie-border bg-white p-3 shadow-lift">
      <div className="text-xs font-semibold">{row.name}</div>
      <div className="mt-0.5 text-[10px] text-wolfie-muted">{row.total} runs in selected window</div>
      <div className="mt-3 space-y-1.5 text-xs">
        <div className="flex justify-between text-wolfie-muted"><span><i className="mr-2 inline-block size-2 rounded-full bg-state-healthy" />Succeeded</span><b className="text-wolfie-ink tabular">{row.succeeded} · {row.succeededPct}%</b></div>
        <div className="flex justify-between text-wolfie-muted"><span><i className="mr-2 inline-block size-2 rounded-full bg-state-warning" />Partial</span><b className="text-wolfie-ink tabular">{row.partial} · {row.partialPct}%</b></div>
        <div className="flex justify-between text-wolfie-muted"><span><i className="mr-2 inline-block size-2 rounded-full bg-state-failed" />Failed</span><b className="text-wolfie-ink tabular">{row.failed} · {row.failedPct}%</b></div>
        {row.other > 0 && <div className="flex justify-between text-wolfie-muted"><span><i className="mr-2 inline-block size-2 rounded-full bg-state-disabled" />Other</span><b className="text-wolfie-ink tabular">{row.other} · {row.otherPct}%</b></div>}
      </div>
    </div>
  );
}

function PipelineAxisTick({ x = 0, y = 0, payload, rows }: any) {
  const row = rows.find((item: ReliabilityRow) => item.name === payload.value) as ReliabilityRow | undefined;
  const label = String(payload.value);
  const shortLabel = label.length > 22 ? `${label.slice(0, 21)}…` : label;
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={-8} y={-3} textAnchor="end" fill="#344054" fontSize="10" fontWeight="600">{shortLabel}</text>
      <text x={-8} y={10} textAnchor="end" fill="#98A2B3" fontSize="8">{row?.total ?? 0} runs</text>
    </g>
  );
}

function outcomeClass(row?: DailyStats) {
  if (!row) return "bg-wolfie-soft text-wolfie-muted/40";
  if (row.failed > 0) return "bg-state-failed text-white";
  if (row.partial > 0) return "bg-state-warning text-white";
  if (row.succeeded === row.total) return "bg-state-healthy text-white";
  return "bg-state-running text-white";
}

function outcomeLabel(row?: DailyStats) {
  if (!row) return "No runs";
  return `${row.total} runs · ${row.succeeded} succeeded · ${row.partial} partial · ${row.failed} failed`;
}

export function PipelinePerformanceChart({ pipelines, dailyStats, generatedAt }: { pipelines: PipelineHealthRow[]; dailyStats: DailyStats[]; generatedAt: string }) {
  const [view, setView] = useState<"reliability" | "trend">("reliability");
  const reliability = useMemo<ReliabilityRow[]>(() => pipelines.map((pipeline) => {
    const rows = dailyStats.filter((row) => row.pipeline_id === pipeline.id);
    const succeeded = rows.reduce((sum, row) => sum + row.succeeded, 0);
    const partial = rows.reduce((sum, row) => sum + row.partial, 0);
    const failed = rows.reduce((sum, row) => sum + row.failed, 0);
    const total = rows.reduce((sum, row) => sum + row.total, 0);
    const other = Math.max(0, total - succeeded - partial - failed);
    const pct = (value: number) => total ? Math.round((value / total) * 1000) / 10 : 0;
    return { id: pipeline.id, key: pipeline.key, name: pipeline.name, total, succeeded, partial, failed, other, succeededPct: pct(succeeded), partialPct: pct(partial), failedPct: pct(failed), otherPct: pct(other) };
  }).filter((row) => row.total > 0).sort((a, b) => b.failedPct - a.failedPct || b.partialPct - a.partialPct || b.total - a.total), [dailyStats, pipelines]);

  const days = useMemo(() => {
    const end = new Date(generatedAt); end.setUTCHours(0, 0, 0, 0);
    return Array.from({ length: 14 }, (_, index) => { const day = new Date(end); day.setUTCDate(end.getUTCDate() - (13 - index)); return day; });
  }, [generatedAt]);
  const trendPipelines = reliability.slice(0, 10);

  return (
    <section className="surface overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-wolfie-border px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold">Pipeline performance</h2>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-wolfie-muted"><Database className="size-3" />{view === "reliability" ? "30-day outcomes from Supabase daily statistics" : "14-day outcome matrix · highest-risk pipelines first"}</p>
        </div>
        <div className="flex rounded-lg bg-wolfie-soft p-1">
          <button type="button" onClick={() => setView("reliability")} className={cn("flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition", view === "reliability" ? "bg-white text-wolfie-ink shadow-sm" : "text-wolfie-muted hover:text-wolfie-ink")}><BarChart3 className="size-3.5" />Reliability</button>
          <button type="button" onClick={() => setView("trend")} className={cn("flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition", view === "trend" ? "bg-white text-wolfie-ink shadow-sm" : "text-wolfie-muted hover:text-wolfie-ink")}><CalendarDays className="size-3.5" />Daily trend</button>
        </div>
      </div>

      {reliability.length === 0 ? <div className="grid h-80 place-items-center text-sm text-wolfie-muted">No pipeline execution history in this window</div> : view === "reliability" ? (
        <div className="p-4 sm:p-5">
          <div style={{ height: Math.max(310, reliability.length * 38), width: "100%" }}>
            <ResponsiveContainer>
              <BarChart layout="vertical" data={reliability} margin={{ top: 4, right: 52, bottom: 8, left: 10 }} barCategoryGap="32%">
                <CartesianGrid stroke="#EEF0F3" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(value) => `${value}%`} tick={{ fill: "#98A2B3", fontSize: 9 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" width={160} tick={<PipelineAxisTick rows={reliability} />} tickLine={false} axisLine={false} />
                <Tooltip content={<ReliabilityTooltip />} cursor={{ fill: "rgba(79,70,229,.035)" }} />
                <Bar isAnimationActive={false} dataKey="succeededPct" stackId="outcomes" fill="#12A878" radius={[4, 0, 0, 4]} />
                <Bar isAnimationActive={false} dataKey="partialPct" stackId="outcomes" fill="#EAAA08" />
                <Bar isAnimationActive={false} dataKey="failedPct" stackId="outcomes" fill="#E5484D" />
                <Bar isAnimationActive={false} dataKey="otherPct" stackId="outcomes" fill="#98A2B3" radius={[0, 4, 4, 0]}>
                  <LabelList dataKey="total" position="right" formatter={(value: number) => `${value} runs`} fill="#667085" fontSize={9} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-5 border-t border-wolfie-border/70 pt-3 text-[10px] font-medium text-wolfie-muted"><span><i className="mr-1.5 inline-block size-2 rounded-sm bg-state-healthy" />Succeeded</span><span><i className="mr-1.5 inline-block size-2 rounded-sm bg-state-warning" />Partial</span><span><i className="mr-1.5 inline-block size-2 rounded-sm bg-state-failed" />Failed</span><span><i className="mr-1.5 inline-block size-2 rounded-sm bg-state-disabled" />Other</span></div>
        </div>
      ) : (
        <div className="overflow-x-auto p-4 sm:p-5">
          <div className="min-w-[680px]">
            <div className="grid items-end gap-1.5" style={{ gridTemplateColumns: "170px repeat(14, minmax(24px, 1fr))" }}>
              <div className="pb-1 text-[9px] font-semibold uppercase tracking-wider text-wolfie-muted">Pipeline</div>
              {days.map((day) => <div key={day.toISOString()} className="pb-1 text-center text-[9px] text-wolfie-muted"><span className="block font-semibold text-wolfie-ink">{day.toLocaleDateString("en-US", { day: "numeric", timeZone: "UTC" })}</span>{day.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })}</div>)}
              {trendPipelines.flatMap((pipeline) => [
                <Link key={`${pipeline.key}-label`} href={`/pipelines/${pipeline.key}`} className="truncate py-1 pr-3 text-[11px] font-semibold hover:text-wolfie-accent">{pipeline.name}</Link>,
                ...days.map((day) => {
                  const key = day.toISOString().slice(0, 10);
                  const row = dailyStats.find((item) => item.pipeline_id === pipeline.id && item.day.slice(0, 10) === key);
                  return <div key={`${pipeline.key}-${key}`} title={`${pipeline.name} · ${day.toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "UTC" })} · ${outcomeLabel(row)}`} className={cn("grid h-7 place-items-center rounded-md text-[9px] font-semibold transition hover:scale-110 hover:shadow-sm", outcomeClass(row))}>{row?.total || "·"}</div>;
                }),
              ])}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-5 border-t border-wolfie-border/70 pt-3 text-[10px] font-medium text-wolfie-muted"><span><i className="mr-1.5 inline-block size-2 rounded-sm bg-state-healthy" />All succeeded</span><span><i className="mr-1.5 inline-block size-2 rounded-sm bg-state-warning" />Has partial</span><span><i className="mr-1.5 inline-block size-2 rounded-sm bg-state-failed" />Has failure</span><span><i className="mr-1.5 inline-block size-2 rounded-sm bg-wolfie-soft ring-1 ring-wolfie-border" />No runs</span><span>Cell label = total runs</span></div>
          </div>
        </div>
      )}
    </section>
  );
}
