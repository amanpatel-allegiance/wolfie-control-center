import { supabaseServiceRole } from "@/lib/supabase/server";
import { env } from "@/lib/env";

type Rule = {
  id: number;
  pipeline_id: number | null;
  key: string;
  name: string;
  rule_type: string;
  severity: "info" | "warning" | "critical";
  threshold: Record<string, unknown>;
  cooldown_minutes: number;
  enabled: boolean;
  channels: string[];
};

type HealthRow = {
  pipeline_id: number;
  pipeline_key: string;
  pipeline_name: string;
  freshness_sla_hours: number;
  freshness_hours: number | null;
  health_state: string;
  latest_run_id: number | null;
  latest_status: string | null;
  latest_started_at: string | null;
  latest_heartbeat_at: string | null;
};

async function shouldSuppressByCooldown(sb: ReturnType<typeof supabaseServiceRole>, fingerprint: string, cooldownMinutes: number): Promise<boolean> {
  const cutoff = new Date(Date.now() - cooldownMinutes * 60_000).toISOString();
  const { data } = await sb
    .from("wcc_pipeline_alert_events")
    .select("id")
    .eq("fingerprint", fingerprint)
    .gt("fired_at", cutoff)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

async function fire(
  sb: ReturnType<typeof supabaseServiceRole>,
  input: { rule: Rule; pipelineId: number | null; runId: number | null; title: string; description: string; fingerprint: string; details?: Record<string, unknown> },
) {
  const suppressed = await shouldSuppressByCooldown(sb, input.fingerprint, input.rule.cooldown_minutes);
  if (suppressed) return { suppressed: true };
  const { data, error } = await sb
    .from("wcc_pipeline_alert_events")
    .insert({
      rule_id: input.rule.id,
      pipeline_id: input.pipelineId,
      run_id: input.runId,
      severity: input.rule.severity,
      title: input.title,
      description: input.description,
      fingerprint: input.fingerprint,
      details: input.details ?? {},
    })
    .select()
    .single();
  if (error) return { error: error.message };
  await notify(input.rule.channels, {
    severity: input.rule.severity,
    title: input.title,
    description: input.description,
    link: `${env.appBaseUrl()}/pipelines/${(input.details as any)?.pipeline_key ?? ""}`,
  });
  return { fired: true, event: data };
}

async function notify(channels: string[], msg: { severity: string; title: string; description: string; link: string }) {
  if (channels.includes("slack") && env.slackWebhook()) {
    try {
      await fetch(env.slackWebhook(), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text: `[${msg.severity.toUpperCase()}] ${msg.title}`,
          attachments: [{ text: msg.description, actions: [{ type: "button", text: "Open in Control Center", url: msg.link }] }],
        }),
      });
    } catch {
      // provider failures never break the alert engine
    }
  }
}

async function fetchConsecutiveFailures(sb: ReturnType<typeof supabaseServiceRole>, pipelineId: number, count: number) {
  const { data } = await sb
    .from("sync_runs")
    .select("id, status, started_at")
    .eq("pipeline_id", pipelineId)
    .in("status", ["succeeded", "succeeded_with_warnings", "failed", "timed_out", "partial", "unchanged"])
    .order("started_at", { ascending: false })
    .limit(count);
  if (!data || data.length < count) return null;
  const allFailed = data.every((r) => r.status === "failed" || r.status === "timed_out");
  return allFailed ? data : null;
}

/**
 * Evaluate all enabled rules against all enabled pipelines.
 * Idempotent + cooldown-safe. Returns a summary.
 */
export async function runAlertTick() {
  const sb = supabaseServiceRole();
  const [rulesRes, healthRes] = await Promise.all([
    sb.from("wcc_pipeline_alert_rules").select("*").eq("enabled", true),
    sb.from("wcc_v_pipeline_health").select("*"),
  ]);
  if (rulesRes.error) throw new Error(rulesRes.error.message);
  if (healthRes.error) throw new Error(healthRes.error.message);
  const rules = (rulesRes.data ?? []) as Rule[];
  const health = (healthRes.data ?? []) as HealthRow[];

  let evaluated = 0;
  let fired = 0;
  for (const rule of rules) {
    const targets = rule.pipeline_id ? health.filter((h) => h.pipeline_id === rule.pipeline_id) : health;
    for (const h of targets) {
      evaluated++;
      const base = { rule, pipelineId: h.pipeline_id, runId: h.latest_run_id, details: { pipeline_key: h.pipeline_key, pipeline_name: h.pipeline_name } as Record<string, unknown> };
      if (rule.rule_type === "consecutive_failures") {
        const count = Math.max(1, Number((rule.threshold as any)?.count ?? 2));
        const runs = await fetchConsecutiveFailures(sb, h.pipeline_id, count);
        if (runs) {
          const res = await fire(sb, {
            ...base,
            title: `${count} consecutive failures on ${h.pipeline_name}`,
            description: `The last ${count} runs of ${h.pipeline_key} failed.`,
            fingerprint: `consec:${h.pipeline_id}:${count}:${runs[0].id}`,
          });
          if ((res as any).fired) fired++;
        }
      } else if (rule.rule_type === "freshness_sla") {
        if (h.freshness_hours != null && h.freshness_hours > h.freshness_sla_hours) {
          const res = await fire(sb, {
            ...base,
            title: `Freshness SLA breached · ${h.pipeline_name}`,
            description: `${h.freshness_hours.toFixed(1)}h since last success (SLA ${h.freshness_sla_hours}h).`,
            fingerprint: `sla:${h.pipeline_id}:${Math.floor(h.freshness_hours / h.freshness_sla_hours)}`,
          });
          if ((res as any).fired) fired++;
        }
      } else if (rule.rule_type === "stuck_run") {
        if (h.health_state === "stuck") {
          const res = await fire(sb, {
            ...base,
            title: `Stuck run · ${h.pipeline_name}`,
            description: `Run #${h.latest_run_id} is still 'running' past its timeout with no recent heartbeat.`,
            fingerprint: `stuck:${h.pipeline_id}:${h.latest_run_id}`,
          });
          if ((res as any).fired) fired++;
        }
      } else if (rule.rule_type === "zero_rows") {
        // Requires latest run to be a full/backfill with zero upserts
        const { data: run } = await sb
          .from("sync_runs")
          .select("id, kind, status, stats, started_at")
          .eq("pipeline_id", h.pipeline_id)
          .in("status", ["succeeded", "succeeded_with_warnings", "partial"])
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (run && /full|backfill/.test(run.kind)) {
          const stats = (run.stats ?? {}) as Record<string, any>;
          const wrote = Number(stats.rows_upserted ?? stats.rows_touched ?? stats.inserted ?? 0);
          if (wrote === 0) {
            const res = await fire(sb, {
              ...base,
              title: `Zero-row extract · ${h.pipeline_name}`,
              description: `Latest ${run.kind} extracted 0 rows.`,
              fingerprint: `zero:${h.pipeline_id}:${run.id}`,
            });
            if ((res as any).fired) fired++;
          }
        }
      }
    }
  }
  return { evaluated, fired, rules: rules.length, pipelines: health.length };
}
