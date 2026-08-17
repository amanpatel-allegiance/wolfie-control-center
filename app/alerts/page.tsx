import { redirect } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { getAlerts, getCurrentRole } from "@/lib/data";
import { formatRelative, formatUtc } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Bell, CheckCircle2, Filter } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default async function AlertsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  if (!data.user) redirect("/login");
  const p = await searchParams;
  const status = p.status ?? "open";
  const [events, role] = await Promise.all([getAlerts(status), getCurrentRole()]);
  const canAck = role === "operator" || role === "admin";

  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Incident inbox" title="Alerts" description="Review pipeline incidents, acknowledge ownership, and track resolution." actions={
        <form className="flex items-center gap-2" method="get">
          <Filter className="size-4 text-wolfie-muted" />
          <select name="status" defaultValue={status} className="control capitalize">
            {["open", "acknowledged", "resolved"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button type="submit" className="primary-button">Apply</button>
        </form>
      } />

      <div className="flex items-center gap-3 rounded-2xl border border-wolfie-border bg-white px-4 py-3 shadow-card">
        <span className={cn("grid size-9 place-items-center rounded-xl", events.length ? "bg-state-failed/10 text-state-failed" : "bg-state-healthy/10 text-state-healthy")}>{events.length ? <Bell className="size-4" /> : <CheckCircle2 className="size-4" />}</span>
        <div><div className="text-sm font-semibold capitalize">{status} alerts</div><div className="text-2xs text-wolfie-muted">{events.length} event{events.length === 1 ? "" : "s"} in this view</div></div>
      </div>

      {events.length === 0 ? (
        <div className="surface border-dashed p-12 text-center text-wolfie-muted">
          <CheckCircle2 className="mx-auto mb-3 size-8 text-state-healthy/70" /><div className="font-medium text-wolfie-ink">All clear</div><div className="mt-1 text-sm">No {status} alerts at the moment.</div>
        </div>
      ) : (
        <div className="table-shell overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left">Severity</th>
                <th className="px-4 py-2 text-left">Title</th>
                <th className="px-4 py-2 text-left">Pipeline</th>
                <th className="px-4 py-2 text-left">Fired</th>
                <th className="px-4 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {events.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-2">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-2xs font-semibold capitalize ring-1 ring-inset",
                        a.severity === "critical" && "bg-state-failed/12 text-state-failed ring-state-failed/30",
                        a.severity === "warning"  && "bg-state-warning/12 text-state-warning ring-state-warning/30",
                        a.severity === "info"     && "bg-state-running/12 text-state-running ring-state-running/30",
                      )}
                    >
                      {a.severity}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="font-medium">{a.title}</div>
                    <div className="text-2xs text-wolfie-muted">{a.description}</div>
                  </td>
                  <td className="px-4 py-2 text-2xs">
                    {a.pipeline_id ? (
                      <Link href={`/pipelines/${(a as any).pipeline_key ?? ""}`} className="hover:underline">
                        #{a.pipeline_id}
                      </Link>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-2 text-2xs text-wolfie-muted whitespace-nowrap">
                    {formatRelative(a.fired_at)}
                    <div>{formatUtc(a.fired_at)}</div>
                  </td>
                  <td className="px-4 py-2 text-right">
                    {a.status === "open" && canAck && (
                      <form action={`/api/alerts/${a.id}/ack`} method="post">
                        <button type="submit" className="primary-button h-8 px-3 text-xs">Acknowledge</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
