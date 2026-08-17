import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getRecentRuns } from "@/lib/data";
import { PageHeader } from "@/components/PageHeader";
import { RefreshButton } from "@/components/RefreshButton";
import { MetricCard } from "@/components/MetricCard";
import { RunExplorer } from "@/components/RunExplorer";
import { changedRows } from "@/lib/run-stats";
import { formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";
export default async function RunsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const sb = await supabaseServer(); const { data } = await sb.auth.getUser(); if (!data.user) redirect("/login");
  const [params, runs] = await Promise.all([searchParams, getRecentRuns({ limit: 500 })]);
  const running = runs.filter((r) => r.status === "running").length; const failed = runs.filter((r) => ["failed", "timed_out"].includes(r.status)).length; const duration = runs.filter((r) => r.duration_s != null).reduce((sum, r) => sum + (r.duration_s ?? 0), 0); const rows = runs.reduce((sum, r) => sum + (changedRows(r) ?? 0), 0);
  return <div className="space-y-4"><PageHeader eyebrow="Execution history" title="Runs" description="Search and inspect retained production executions from the live run registry." actions={<RefreshButton/>}/><section className="metrics-strip grid grid-cols-2 gap-3 lg:grid-cols-4"><MetricCard label="Retained runs" value={runs.length}/><MetricCard label="Currently running" value={running} tone="running"/><MetricCard label="Failed" value={failed} tone={failed ? "failed" : "healthy"}/><MetricCard label="Rows changed" value={formatNumber(rows)} hint={`${Math.round(duration / 3600)} total runtime hours`}/></section><RunExplorer runs={runs} initialQuery={params.q} initialStatus={params.status}/></div>;
}
