import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarCheck2, CircleAlert, Clock3, Hand, TriangleAlert } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { getPipelineHealth } from "@/lib/data";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { HealthBadge } from "@/components/StatusBadge";
import { cronOccurrencesBetween, nextCronOccurrence } from "@/lib/schedule";
import { formatRelative } from "@/lib/format";
import { isLocalDashboardPreview } from "@/lib/local-preview";
import { SetupGuideButton } from "@/components/SetupGuideButton";
import { CsvExportButton } from "@/components/CsvExportButton";

export const dynamic = "force-dynamic";

const GST_OFFSET_MS = 4 * 3_600_000;
const DAY_MS = 86_400_000;

function gstDayStart(now: Date) {
  const gst = new Date(now.getTime() + GST_OFFSET_MS);
  return new Date(Date.UTC(gst.getUTCFullYear(), gst.getUTCMonth(), gst.getUTCDate()) - GST_OFFSET_MS);
}

function gstDayLabel(date: Date) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dubai", weekday: "short", day: "numeric", month: "short" }).format(date);
}

function gstTime(date: Date) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dubai", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
}

function scheduleTimezoneLabel(value: string) {
  return value === "UTC" ? "UTC" : value === "Asia/Dubai" ? "GST" : value;
}

export default async function SchedulesPage() {
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  if (!data.user && !isLocalDashboardPreview()) redirect("/login");

  const pipelines = await getPipelineHealth();
  const now = new Date();
  const scheduled = pipelines.filter((pipeline) => pipeline.enabled && Boolean(pipeline.schedule_expression?.trim()));
  const manual = pipelines.filter((pipeline) => pipeline.enabled && !pipeline.schedule_expression?.trim());
  const attention = pipelines.filter((pipeline) => ["stale", "failed", "stuck", "warning", "delayed"].includes(pipeline.health_state));
  const nextById = new Map(scheduled.map((pipeline) => [pipeline.id, nextCronOccurrence(pipeline.schedule_expression, pipeline.schedule_timezone, now)]));
  const upcoming = scheduled
    .map((pipeline) => ({ pipeline, next: nextById.get(pipeline.id) ?? null }))
    .filter((row): row is { pipeline: typeof pipelines[number]; next: Date } => row.next != null)
    .sort((left, right) => left.next.getTime() - right.next.getTime());
  const next24Hours = upcoming.filter((row) => row.next.getTime() <= now.getTime() + DAY_MS);

  const timelineStart = gstDayStart(now);
  const timelineEnd = new Date(timelineStart.getTime() + 7 * DAY_MS);
  const timelineDays = Array.from({ length: 7 }, (_, index) => new Date(timelineStart.getTime() + index * DAY_MS));
  const timeline = scheduled.map((pipeline) => ({
    pipeline,
    occurrences: cronOccurrencesBetween(pipeline.schedule_expression, pipeline.schedule_timezone, timelineStart, timelineEnd),
  }));
  const healthById = new Map(pipelines.map((pipeline) => [pipeline.id, pipeline]));

  return <section>
    <PageHeader title="Schedules" description="Real scheduler configuration and the next seven days in Gulf Standard Time" actions={<SetupGuideButton kind="schedule"/>}/>
    <div className="ref-metrics">
      <MetricCard label="Active schedules" value={scheduled.length} hint={`${pipelines.length} registered pipelines`} tone="healthy" icon={<CalendarCheck2 className="size-4"/>}/>
      <MetricCard label="Next 24 hours" value={next24Hours.length} hint={next24Hours[0] ? `First: ${formatRelative(next24Hours[0].next.toISOString())}` : "No configured occurrence"} tone="running" icon={<Clock3 className="size-4"/>}/>
      <MetricCard label="Manual pipelines" value={manual.length} hint="No cron expression configured" tone="default" icon={<Hand className="size-4"/>}/>
      <MetricCard label="Needs attention" value={attention.length} hint="Freshness or execution condition" tone={attention.length ? "failed" : "healthy"} icon={<CircleAlert className="size-4"/>}/>
    </div>

    <div className="ref-grid-detail">
      <div className="surface overflow-auto">
        <div className="ref-card-head"><h2>Next seven days</h2><span className="ml-auto text-[11px]">Configured cron occurrences · GST (UTC+4)</span></div>
        <div className="ref-calendar">
          <div className="ref-cal-cell ref-cal-head">Pipeline</div>
          {timelineDays.map((day) => <div className="ref-cal-cell ref-cal-head" key={day.toISOString()}>{gstDayLabel(day)}</div>)}
          {timeline.map(({ pipeline, occurrences }) => <div className="contents" key={pipeline.id}>
            <div className="ref-cal-cell"><Link href={`/pipelines/${pipeline.key}?tab=configuration`} className="font-semibold text-wolfie-ink hover:text-wolfie-accent">{pipeline.name}</Link><small className="mt-1 block text-wolfie-muted">{scheduleTimezoneLabel(pipeline.schedule_timezone)}</small></div>
            {timelineDays.map((day, dayIndex) => {
              const dayStart = timelineStart.getTime() + dayIndex * DAY_MS;
              const dayRows = occurrences.filter((occurrence) => occurrence.getTime() >= dayStart && occurrence.getTime() < dayStart + DAY_MS);
              return <div className="ref-cal-cell" key={`${pipeline.id}-${day.toISOString()}`}>{dayRows.map((occurrence) => <Link href={`/pipelines/${pipeline.key}?tab=configuration`} className="ref-job block" key={occurrence.toISOString()}>{gstTime(occurrence)} GST</Link>)}</div>;
            })}
          </div>)}
        </div>
      </div>

      <div className="surface overflow-hidden">
        <div className="ref-card-head"><h2>Upcoming</h2><Link href="#registry">View registry</Link></div>
        <ul className="ref-activity">
          {upcoming.slice(0, 7).map(({ pipeline, next }) => <li key={pipeline.id}>
            <span className="ref-event-dot bg-state-healthy/10 text-state-healthy"><Clock3 className="size-2.5"/></span>
            <div><Link href={`/pipelines/${pipeline.key}?tab=configuration`}>{pipeline.name}</Link><small>{gstTime(next)} GST · {formatRelative(next.toISOString())}</small></div>
            <span>{scheduleTimezoneLabel(pipeline.schedule_timezone)}</span>
          </li>)}
        </ul>
      </div>
    </div>

    {attention.length > 0 && <div className="ref-health-banner surface mt-[14px]"><TriangleAlert className="size-4 shrink-0 text-state-warning"/><strong>{attention.length} pipeline{attention.length === 1 ? "" : "s"} currently violate a freshness or execution condition.</strong><Link href="/incidents" className="ref-btn ml-auto">View incidents</Link></div>}

    <div id="registry" className="surface mt-[14px] overflow-hidden">
      <div className="ref-card-head"><h2>Schedule registry</h2><CsvExportButton className="ml-auto h-8 border-0 bg-transparent shadow-none" filename="wolfie-schedules.csv" headers={["Pipeline", "Key", "Strategy", "Cron", "Timezone", "Scheduler", "Next run", "Last triggered", "Concurrency", "Status"]} rows={pipelines.map((pipeline) => [pipeline.name, pipeline.key, pipeline.refresh_strategy, pipeline.schedule_expression, pipeline.schedule_timezone, pipeline.scheduler, nextById.get(pipeline.id)?.toISOString(), healthById.get(pipeline.id)?.latest_started_at, pipeline.concurrency ?? 1, healthById.get(pipeline.id)?.health_state])}/></div>
      <div className="overflow-auto"><table className="data-table min-w-[1100px]"><thead><tr><th>Pipeline</th><th>Strategy</th><th>Cron</th><th>Timezone</th><th>Next run</th><th>Last triggered</th><th>Concurrency</th><th>Status</th></tr></thead><tbody>
        {pipelines.map((pipeline) => {
          const health = healthById.get(pipeline.id);
          const next = nextById.get(pipeline.id);
          return <tr key={pipeline.id}><td><Link href={`/pipelines/${pipeline.key}?tab=configuration`}><b>{pipeline.name}</b></Link></td><td className="capitalize">{pipeline.refresh_strategy.replaceAll("_", " ")}</td><td className="font-mono text-[10px]">{pipeline.schedule_expression || "Manual"}</td><td>{pipeline.schedule_timezone}</td><td>{next ? <><b>{gstTime(next)} GST</b><small className="mt-1 block text-wolfie-muted">{formatRelative(next.toISOString())}</small></> : "—"}</td><td>{formatRelative(health?.latest_started_at)}</td><td>{pipeline.concurrency ?? 1}</td><td>{health ? <HealthBadge state={health.health_state}/> : "—"}</td></tr>;
        })}
      </tbody></table></div>
    </div>
  </section>;
}
