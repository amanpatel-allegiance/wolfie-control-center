import { redirect } from "next/navigation";
import { getRecentRuns } from "@/lib/data";
import { PageHeader } from "@/components/PageHeader";
import { RunExplorer } from "@/components/RunExplorer";
import Link from "next/link";
import { hasDashboardAccess } from "@/lib/dashboard-access";
import { CalendarRange, Play } from "lucide-react";
import { QuerySelect } from "@/components/SelectMenu";

const rangeOptions = [
  { value: "30d", label: "Last 30 days", description: "Monthly execution history" },
  { value: "7d", label: "Last 7 days", description: "One-week execution history" },
  { value: "24h", label: "Last 24 hours", description: "Newest production activity" },
  { value: "all", label: "All loaded runs", description: "Up to the latest 500 records" },
];

export const dynamic = "force-dynamic";
export default async function RunsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; range?: string }> }) {
  if (!(await hasDashboardAccess())) redirect("/login");
  const [params, runs] = await Promise.all([searchParams, getRecentRuns({ limit: 500 })]);
  const range = rangeOptions.some((option) => option.value === params.range) ? params.range! : "30d";
  const cutoff = range === "all" ? 0 : Date.now() - (range === "7d" ? 7 : range === "30d" ? 30 : 1) * 86_400_000;
  const visibleRuns = cutoff ? runs.filter((run) => new Date(run.started_at).getTime() >= cutoff) : runs;
  return <div><PageHeader title="Runs" description={`${visibleRuns.length} of ${runs.length} loaded production executions`} actions={<><QuerySelect param="range" value={range} defaultValue="30d" options={rangeOptions} icon={<CalendarRange/>} ariaLabel="Select run history period"/><Link href="/pipelines" className="ref-btn ref-btn-primary"><Play className="fill-current"/>Run pipeline</Link></>}/><RunExplorer runs={visibleRuns} initialQuery={params.q} initialStatus={params.status}/></div>;
}
