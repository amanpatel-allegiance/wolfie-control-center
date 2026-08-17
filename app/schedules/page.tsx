import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getPipelines } from "@/lib/data";
import { formatDuration } from "@/lib/format";
import Link from "next/link";
import { CalendarClock, Info } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default async function SchedulesPage() {
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  if (!data.user) redirect("/login");
  const pipelines = await getPipelines();

  const bySource: Record<string, typeof pipelines> = {};
  for (const p of pipelines) (bySource[p.source_key] ??= []).push(p);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Orchestration" title="Schedules" description="The source of truth for expected pipeline cadence, runtime targets, and timeout guardrails." />
      <div className="flex gap-3 rounded-2xl border border-state-running/20 bg-state-running/[.05] p-4 text-sm text-wolfie-muted">
        <Info className="mt-0.5 size-5 shrink-0 text-state-running" /><p className="leading-6">Changes recorded here do not push to external schedulers. GitHub Actions, launchd, and Windows Task Scheduler remain configured in each pipeline repository.</p>
      </div>

      {Object.entries(bySource).map(([source, ps]) => (
        <section key={source}>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><span className="grid size-8 place-items-center rounded-lg bg-wolfie-lavender text-wolfie-accent"><CalendarClock className="size-4" /></span>{source}<span className="text-xs font-normal text-wolfie-muted">{ps.length} pipeline{ps.length === 1 ? "" : "s"}</span></h2>
          <div className="table-shell overflow-x-auto">
            <table className="data-table min-w-[1000px]">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left">Pipeline</th>
                  <th className="px-4 py-2 text-left">Scheduler</th>
                  <th className="px-4 py-2 text-left">Cron</th>
                  <th className="px-4 py-2 text-left">Timezone</th>
                  <th className="px-4 py-2 text-left">Strategy</th>
                  <th className="px-4 py-2 text-right">Freshness SLA</th>
                  <th className="px-4 py-2 text-right">Expected</th>
                  <th className="px-4 py-2 text-right">Timeout</th>
                </tr>
              </thead>
              <tbody>
                {ps.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-2 font-medium"><Link href={`/pipelines/${p.key}`} className="hover:text-wolfie-accent">{p.name}</Link><div className="text-2xs font-normal text-wolfie-muted">{p.key}</div></td>
                    <td className="px-4 py-2 text-2xs">{p.scheduler}</td>
                    <td className="px-4 py-2 font-mono text-2xs">{p.schedule_expression || "—"}</td>
                    <td className="px-4 py-2 text-2xs">{p.schedule_timezone}</td>
                    <td className="px-4 py-2 text-2xs">{p.refresh_strategy}</td>
                    <td className="px-4 py-2 text-2xs text-right tabular">{p.freshness_sla_hours}h</td>
                    <td className="px-4 py-2 text-2xs text-right tabular">{formatDuration(p.expected_duration_s)}</td>
                    <td className="px-4 py-2 text-2xs text-right tabular">{formatDuration(p.timeout_s)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
