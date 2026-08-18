import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getRecentRuns } from "@/lib/data";
import { PageHeader } from "@/components/PageHeader";
import { RunExplorer } from "@/components/RunExplorer";
import Link from "next/link";
import { isLocalDashboardPreview } from "@/lib/local-preview";
import { CalendarRange, Play } from "lucide-react";
import { QuerySelect } from "@/components/SelectMenu";

const rangeOptions = [
  { value: "24h", label: "Last 24 hours", description: "Newest production activity" },
  { value: "7d", label: "Last 7 days", description: "One-week execution history" },
  { value: "30d", label: "Last 30 days", description: "Monthly execution history" },
  { value: "all", label: "All loaded runs", description: "Up to the latest 500 records" },
];

export const dynamic = "force-dynamic";
export default async function RunsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; range?: string }> }) {
  const sb = await supabaseServer(); const { data } = await sb.auth.getUser(); if (!data.user && !isLocalDashboardPreview()) redirect("/login");
  const [params, runs] = await Promise.all([searchParams, getRecentRuns({ limit: 500 })]);
  const range = rangeOptions.some((option) => option.value === params.range) ? params.range! : "24h";
  const cutoff = range === "all" ? 0 : Date.now() - (range === "7d" ? 7 : range === "30d" ? 30 : 1) * 86_400_000;
  const visibleRuns = cutoff ? runs.filter((run) => new Date(run.started_at).getTime() >= cutoff) : runs;
  return <div><PageHeader title="Runs" description={`${visibleRuns.length} executions in the selected production window`} actions={<><QuerySelect param="range" value={range} defaultValue="24h" options={rangeOptions} icon={<CalendarRange/>} ariaLabel="Select run history period"/><Link href="/pipelines" className="ref-btn ref-btn-primary"><Play className="fill-current"/>Run pipeline</Link></>}/><RunExplorer runs={visibleRuns} initialQuery={params.q} initialStatus={params.status}/></div>;
}
