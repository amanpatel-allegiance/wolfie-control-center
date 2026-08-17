import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getRecentRuns } from "@/lib/data";
import { PageHeader } from "@/components/PageHeader";
import { RunExplorer } from "@/components/RunExplorer";
import Link from "next/link";
import { CalendarDays, Play } from "lucide-react";

export const dynamic = "force-dynamic";
export default async function RunsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const sb = await supabaseServer(); const { data } = await sb.auth.getUser(); if (!data.user) redirect("/login");
  const [params, runs] = await Promise.all([searchParams, getRecentRuns({ limit: 500 })]);
  return <div><PageHeader title="Runs" description="Execution history across all pipeline environments" actions={<><button className="ref-btn"><CalendarDays className="size-3.5"/>Last 24 hours⌄</button><Link href="/pipelines" className="ref-btn ref-btn-primary"><Play className="size-3.5 fill-current"/>Run pipeline</Link></>}/><RunExplorer runs={runs} initialQuery={params.q} initialStatus={params.status}/></div>;
}
