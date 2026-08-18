import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getCurrentRole, getPipelineHealth, getRecentRuns, getWorkspaceDailyStats } from "@/lib/data";
import { PipelineExplorer } from "@/components/PipelineExplorer";
import { PageHeader } from "@/components/PageHeader";
import { isLocalDashboardPreview } from "@/lib/local-preview";
import { CsvExportButton } from "@/components/CsvExportButton";
import { SetupGuideButton } from "@/components/SetupGuideButton";

export const dynamic = "force-dynamic";

export default async function PipelinesPage({ searchParams }: { searchParams: Promise<{ q?: string; state?: string; source?: string }> }) {
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  if (!data.user && !isLocalDashboardPreview()) redirect("/login");

  const params = await searchParams;
  const [rows, runs, daily, role] = await Promise.all([getPipelineHealth(), getRecentRuns({ limit: 500 }), getWorkspaceDailyStats(30), getCurrentRole()]);
  return (
    <div>
      <PageHeader title="Pipelines" description={`${rows.length} monitored pipelines across ${new Set(rows.map((r) => r.source_key)).size} sources`} actions={<><CsvExportButton filename="wolfie-pipelines.csv" headers={["Pipeline","Key","Source","Emirate","Status","Freshness hours","SLA hours","Last success","Schedule"]} rows={rows.map((row) => [row.name,row.key,row.source_key,row.jurisdiction,row.health_state,row.freshness_hours,row.freshness_sla_hours,row.last_success_started_at,row.schedule_expression])}/><SetupGuideButton kind="pipeline"/></>} />
      <PipelineExplorer rows={rows} runs={runs} daily={daily} canRun={role === "operator" || role === "admin"} initialQuery={params.q} initialState={params.state} initialSource={params.source} />
    </div>
  );
}
