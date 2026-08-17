import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getPipelineHealth } from "@/lib/data";
import { PipelineExplorer } from "@/components/PipelineExplorer";
import { PageHeader } from "@/components/PageHeader";
import { RefreshButton } from "@/components/RefreshButton";
import { MetricCard } from "@/components/MetricCard";

export const dynamic = "force-dynamic";

export default async function PipelinesPage({ searchParams }: { searchParams: Promise<{ q?: string; state?: string; source?: string }> }) {
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  if (!data.user) redirect("/login");

  const params = await searchParams;
  const rows = await getPipelineHealth();
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Data operations" title="Pipelines" description="Production pipeline registry with live execution and freshness state." actions={<RefreshButton />} />
      <section className="metrics-strip grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Total pipelines" value={rows.length} />
        <MetricCard label="Healthy" value={rows.filter((r) => r.health_state === "healthy").length} tone="healthy" />
        <MetricCard label="Running" value={rows.filter((r) => r.health_state === "running").length} tone="running" />
        <MetricCard label="Needs attention" value={rows.filter((r) => !["healthy", "running", "disabled"].includes(r.health_state)).length} tone="warning" />
      </section>
      <PipelineExplorer rows={rows} initialQuery={params.q} initialState={params.state} initialSource={params.source} />
    </div>
  );
}
