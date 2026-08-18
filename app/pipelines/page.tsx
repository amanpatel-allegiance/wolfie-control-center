import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getPipelineHealth, getRecentRuns, getWorkspaceDailyStats } from "@/lib/data";
import { PipelineExplorer } from "@/components/PipelineExplorer";
import { PageHeader } from "@/components/PageHeader";
import { isLocalDashboardPreview } from "@/lib/local-preview";

export const dynamic = "force-dynamic";

export default async function PipelinesPage({ searchParams }: { searchParams: Promise<{ q?: string; state?: string; source?: string }> }) {
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  if (!data.user && !isLocalDashboardPreview()) redirect("/login");

  const params = await searchParams;
  const [rows, runs, daily] = await Promise.all([getPipelineHealth(), getRecentRuns({ limit: 500 }), getWorkspaceDailyStats(30)]);
  return (
    <div>
      <PageHeader title="Pipelines" description={`${rows.length} monitored pipelines across ${new Set(rows.map((r) => r.source_key)).size} sources`} actions={<><button disabled title="Export is not connected" className="ref-btn">⇩ Export</button><button disabled title="Pipeline creation is not connected" className="ref-btn ref-btn-primary">＋ New pipeline</button></>} />
      <PipelineExplorer rows={rows} runs={runs} daily={daily} initialQuery={params.q} initialState={params.state} initialSource={params.source} />
    </div>
  );
}
