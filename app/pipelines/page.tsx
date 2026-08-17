import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getPipelineHealth } from "@/lib/data";
import { PipelineExplorer } from "@/components/PipelineExplorer";
import { PageHeader } from "@/components/PageHeader";
import { RefreshButton } from "@/components/RefreshButton";

export const dynamic = "force-dynamic";

export default async function PipelinesPage({ searchParams }: { searchParams: Promise<{ state?: string; source?: string }> }) {
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  if (!data.user) redirect("/login");

  const params = await searchParams;
  const rows = await getPipelineHealth();
  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Data operations" title="Pipelines" description="Search, filter, and inspect the health of every production data flow." actions={<RefreshButton />} />
      <PipelineExplorer rows={rows} initialState={params.state} initialSource={params.source} />
    </div>
  );
}
