import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, AlarmClock, CircleAlert, Clock3, ExternalLink, Settings2, TriangleAlert } from "lucide-react";
import { getAlertEvents, getAlertRules, getCurrentRole, getPipelineHealth } from "@/lib/data";
import { deriveLiveHealthIncidents } from "@/lib/incidents";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { HealthBadge } from "@/components/StatusBadge";
import { ConfirmAcknowledgeButton } from "@/components/ConfirmAcknowledgeButton";
import { EmptyState } from "@/components/EmptyState";
import { formatDuration, formatRelative, formatUtc } from "@/lib/format";
import { hasDashboardAccess } from "@/lib/dashboard-access";
import { ResolveIncidentButton } from "@/components/ResolveIncidentButton";
import { CsvExportButton } from "@/components/CsvExportButton";
import type { AlertEvent, PipelineHealthRow } from "@/lib/types";

export const dynamic = "force-dynamic";

type IncidentItem = {
  key: string;
  kind: "persisted" | "health";
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  status: string;
  firedAt: string;
  pipeline: PipelineHealthRow | null;
  event: AlertEvent | null;
};

const mean = (values: number[]) => values.length ? values.reduce((total, value) => total + value, 0) / values.length : null;
const severityRank = { critical: 0, warning: 1, info: 2 } as const;

export default async function IncidentsPage({ searchParams }: { searchParams: Promise<{ incident?: string }> }) {
  if (!(await hasDashboardAccess())) redirect("/login");

  const [params, events, rules, pipelines, role] = await Promise.all([
    searchParams,
    getAlertEvents().catch(() => []),
    getAlertRules().catch(() => []),
    getPipelineHealth(),
    getCurrentRole(),
  ]);
  const pipelineById = new Map(pipelines.map((pipeline) => [pipeline.id, pipeline]));
  const unresolvedEvents = events.filter((event) => event.status !== "resolved" && event.status !== "expired");
  const eventItems: IncidentItem[] = unresolvedEvents.map((event) => ({
    key: `event-${event.id}`,
    kind: "persisted",
    severity: event.severity,
    title: event.title,
    description: event.description ?? "The persisted alert rule threshold was reached.",
    status: event.status,
    firedAt: event.fired_at,
    pipeline: event.pipeline_id == null ? null : pipelineById.get(event.pipeline_id) ?? null,
    event,
  }));
  const healthItems: IncidentItem[] = deriveLiveHealthIncidents(pipelines, events).map((incident) => ({
    key: incident.key,
    kind: "health",
    severity: incident.severity,
    title: incident.title,
    description: incident.description,
    status: "detected",
    firedAt: incident.firedAt,
    pipeline: incident.pipeline,
    event: null,
  }));
  const queue = [...eventItems, ...healthItems].sort((left, right) => {
    const severityDifference = severityRank[left.severity] - severityRank[right.severity];
    return severityDifference || new Date(right.firedAt).getTime() - new Date(left.firedAt).getTime();
  });
  const requested = params.incident;
  const selected = queue.find((item) => item.key === requested || (item.event && String(item.event.id) === requested)) ?? queue[0];
  const ackTimes = events.filter((event) => event.acknowledged_at).map((event) => (new Date(event.acknowledged_at!).getTime() - new Date(event.fired_at).getTime()) / 1000);
  const resolveTimes = events.filter((event) => event.resolved_at).map((event) => (new Date(event.resolved_at!).getTime() - new Date(event.fired_at).getTime()) / 1000);
  const canOperate = role === "operator" || role === "admin";

  return <section>
    <PageHeader title="Incidents" description={`${queue.length} active conditions from persisted alerts and live pipeline health`} actions={<Link href="#alert-rules" className="ref-btn ref-btn-primary"><Settings2/>Alert rules</Link>}/>
    <div className="ref-metrics">
      <MetricCard label="Critical" value={queue.filter((item) => item.severity === "critical").length} hint="Active now" tone="failed" icon={<CircleAlert className="size-4"/>}/>
      <MetricCard label="Warning" value={queue.filter((item) => item.severity === "warning").length} hint="Active now" tone="warning" icon={<TriangleAlert className="size-4"/>}/>
      <MetricCard label="Mean time to acknowledge" value={mean(ackTimes) == null ? "—" : formatDuration(mean(ackTimes))} hint="Persisted alert events" tone="running" icon={<AlarmClock className="size-4"/>}/>
      <MetricCard label="Mean time to resolve" value={mean(resolveTimes) == null ? "—" : formatDuration(mean(resolveTimes))} hint="Persisted alert events" tone="running" icon={<Clock3 className="size-4"/>}/>
    </div>

    <div className="ref-incident-layout">
      <div className="ref-incident-list surface">
        <div className="ref-card-head"><h2>Active conditions</h2><span className="ml-auto text-[10px] text-wolfie-muted">{eventItems.length} alerts · {healthItems.length} live signals</span></div>
        {queue.length ? queue.map((item) => <Link href={`/incidents?incident=${item.key}`} scroll={false} className={`ref-incident-item ${selected?.key === item.key ? "selected" : ""}`} key={item.key}>
          <span className="ref-alert-icon" style={{ background: item.severity === "critical" ? "#e43d3d" : item.severity === "warning" ? "#e88908" : "#3388de" }}>{item.kind === "health" ? <Activity className="size-3.5"/> : <CircleAlert className="size-3.5"/>}</span>
          <div><strong>{item.title}</strong><small className="capitalize">{item.severity} · {item.status} · {formatRelative(item.firedAt)}</small></div>
        </Link>) : <EmptyState compact title="Incident queue is clear" description="No persisted alerts or live pipeline health conditions require attention."/>}
      </div>

      <div className="ref-incident-body surface">
        {selected ? <>
          <div className="ref-incident-top">
            <span className="ref-alert-icon" style={{ background: selected.severity === "critical" ? "#e43d3d" : "#e88908" }}>{selected.kind === "health" ? <Activity className="size-3.5"/> : <CircleAlert className="size-3.5"/>}</span>
            <div><h2>{selected.title}</h2><p className="mt-1 text-xs leading-5 text-wolfie-muted">{selected.description}</p><div className="mt-2 flex gap-2"><span className={`status ${selected.severity}`}>{selected.severity}</span><span className="status running">{selected.kind === "persisted" ? "Persisted alert" : "Live health signal"}</span>{selected.pipeline && <HealthBadge state={selected.pipeline.health_state}/>}</div></div>
            <div className="ref-incident-actions">
              {selected.event?.status === "open" && canOperate && <ConfirmAcknowledgeButton alertId={selected.event.id}/>}
              {selected.event && canOperate && <ResolveIncidentButton alertId={selected.event.id}/>}
              {selected.event && !canOperate && <span className="ref-btn cursor-default">Operator role required</span>}
              {selected.kind === "health" && selected.pipeline && <Link href={`/pipelines/${selected.pipeline.key}`} className="ref-btn ref-btn-primary">Open pipeline<ExternalLink className="size-3.5"/></Link>}
            </div>
          </div>

          <div className="ref-incident-grid">
            <div className="surface overflow-hidden">
              <div className="ref-card-head"><h3>Timeline</h3></div>
              <div className="p-3">
                <div className="grid grid-cols-[20px_86px_1fr] gap-2 border-b border-wolfie-border py-[11px] text-[11px]"><span className="ref-event-dot bg-state-running/10 text-state-running"><CircleAlert className="size-2.5"/></span><small>{formatUtc(selected.firedAt)}</small><div><b>{selected.kind === "persisted" ? "Alert fired" : "Health threshold crossed"}</b><br/><small className="text-wolfie-muted">{selected.description}</small></div></div>
                {selected.event?.acknowledged_at && <div className="grid grid-cols-[20px_86px_1fr] gap-2 border-b border-wolfie-border py-[11px] text-[11px]"><span className="ref-event-dot bg-state-running/10 text-state-running"><CircleAlert className="size-2.5"/></span><small>{formatUtc(selected.event.acknowledged_at)}</small><div><b>Acknowledged</b><br/><small className="text-wolfie-muted">Assigned to {selected.event.acknowledged_by ?? "operator"}</small></div></div>}
                {selected.kind === "health" && <div className="mt-3 rounded-lg bg-state-running/5 p-3 text-[11px] leading-5 text-wolfie-muted">This signal is evaluated directly from the live pipeline-health view. It clears automatically when the underlying pipeline returns to a healthy state.</div>}
              </div>
            </div>

            <div>
              <div className="surface mb-3 overflow-hidden"><div className="ref-card-head"><h3>Impact</h3></div><div className="ref-summary-side"><div className="ref-summary-line"><span>Affected pipeline</span><b>{selected.pipeline?.name ?? "Workspace"}</b></div><div className="ref-summary-line"><span>Freshness lag</span><b className={selected.pipeline?.health_state === "stale" ? "text-state-failed" : ""}>{selected.pipeline?.freshness_hours == null ? "—" : `${selected.pipeline.freshness_hours.toFixed(1)}h / ${selected.pipeline.freshness_sla_hours}h SLA`}</b></div><div className="ref-summary-line"><span>Source</span><b>{selected.kind === "persisted" ? rules.find((rule) => rule.id === selected.event?.rule_id)?.name ?? "Alert event" : "Pipeline health view"}</b></div></div></div>
              <div className="surface overflow-hidden"><div className="ref-card-head"><h3>Evidence</h3></div><div className="ref-summary-side"><div className="ref-summary-line"><span>Latest run</span>{selected.pipeline?.latest_run_id ? <Link href={`/runs/${selected.pipeline.latest_run_id}`} className="font-semibold text-wolfie-accent">run_{selected.pipeline.latest_run_id}</Link> : <b>—</b>}</div><div className="ref-summary-line"><span>Latest status</span><b className="capitalize">{selected.pipeline?.latest_status?.replaceAll("_", " ") ?? "—"}</b></div><div className="ref-summary-line"><span>Detected</span><b>{formatUtc(selected.firedAt)}</b></div></div></div>
            </div>
          </div>
        </> : <EmptyState title="Incident queue is clear" description="When a persisted alert or live health condition fires, its timeline, impact and evidence will appear here."/>}
      </div>
    </div>

    <div id="alert-rules" className="surface mt-[14px] overflow-hidden">
      <div className="ref-card-head"><h2>Persisted alert rules</h2><CsvExportButton className="ml-auto h-8 border-0 bg-transparent shadow-none" filename="wolfie-alert-rules.csv" headers={["Name", "Key", "Type", "Severity", "Enabled", "Cooldown minutes", "Channels"]} rows={rules.map((rule) => [rule.name, rule.key, rule.rule_type, rule.severity, rule.enabled, rule.cooldown_minutes, rule.channels.join(";")])}/></div>
      {rules.length ? <div className="overflow-auto"><table className="data-table min-w-[760px]"><thead><tr><th>Rule</th><th>Type</th><th>Severity</th><th>Cooldown</th><th>Channels</th><th>Status</th></tr></thead><tbody>{rules.map((rule) => <tr key={rule.id}><td className="name"><strong>{rule.name}</strong><small>{rule.key}</small></td><td className="capitalize">{rule.rule_type.replaceAll("_", " ")}</td><td><span className={`status ${rule.severity}`}>{rule.severity}</span></td><td>{rule.cooldown_minutes}m</td><td>{rule.channels.length ? rule.channels.join(", ") : "—"}</td><td><span className={`status ${rule.enabled ? "success" : "disabled"}`}>{rule.enabled ? "Enabled" : "Disabled"}</span></td></tr>)}</tbody></table></div> : <EmptyState compact title="No alert rules visible in this session" description="Live health signals above remain available. Sign in and configure the service-role-backed alert tick to persist and route alert events."/>}
    </div>
  </section>;
}
