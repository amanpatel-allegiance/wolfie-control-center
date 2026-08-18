"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarPlus2, Check, Copy, Plus, X } from "lucide-react";

export function SetupGuideButton({ kind }: { kind: "pipeline" | "schedule" }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const pipeline = kind === "pipeline";
  const command = pipeline ? "npm install @wolfie/monitoring-sdk" : "Open a pipeline → Configuration";

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      window.prompt("Copy this setup command:", command);
    }
  };

  return <>
    <button type="button" className="ref-btn ref-btn-primary" onClick={() => setOpen(true)}>{pipeline ? <Plus /> : <CalendarPlus2 />}{pipeline ? "New pipeline" : "Create schedule"}</button>
    {open && <div className="fixed inset-0 z-[90] grid place-items-center bg-wolfie-navy/60 p-4" role="dialog" aria-modal="true" aria-labelledby={`${kind}-setup-title`} onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
      <div className="w-full max-w-lg rounded-xl border border-wolfie-border bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4"><div><span className="text-[10px] font-bold uppercase tracking-[.12em] text-wolfie-accent">Production setup</span><h2 id={`${kind}-setup-title`} className="mt-1 text-xl font-bold tracking-tight">{pipeline ? "Register a monitored pipeline" : "Configure a pipeline schedule"}</h2></div><button type="button" className="grid size-9 place-items-center rounded-lg text-wolfie-muted hover:bg-wolfie-soft" onClick={() => setOpen(false)} aria-label="Close"><X className="size-4"/></button></div>
        <p className="mt-3 text-sm leading-6 text-wolfie-muted">{pipeline ? "Pipeline definitions and telemetry come from the monitoring SDK, so registration stays connected to the real source instead of creating an empty dashboard-only record." : "Schedules are owned by each pipeline’s external scheduler. Open the pipeline configuration to use its real cron, timezone and scheduler settings."}</p>
        <div className="mt-5 rounded-lg border border-wolfie-border bg-wolfie-soft p-3"><div className="flex items-center justify-between gap-3"><code className="text-xs text-wolfie-ink">{command}</code><button type="button" className="ref-btn h-8" onClick={copy}>{copied ? <Check/> : <Copy/>}{copied ? "Copied" : "Copy"}</button></div></div>
        <ol className="mt-5 grid gap-3 text-xs leading-5 text-[#344054]">
          {(pipeline ? ["Install the monitoring SDK in the pipeline repository.", "Emit runs, stages and dataset snapshots with the pipeline key.", "Verify the new pipeline appears here from Supabase telemetry."] : ["Choose the pipeline from the registry.", "Open its Configuration tab and review the scheduler details.", "Change the cron in the owning scheduler and verify the next telemetry event."]).map((step, index) => <li key={step} className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-state-healthy/10 text-[10px] font-bold text-state-healthy">{index + 1}</span><span>{step}</span></li>)}
        </ol>
        <div className="mt-6 flex justify-end gap-2"><button type="button" className="ref-btn" onClick={() => setOpen(false)}>Close</button><Link className="ref-btn ref-btn-primary" href={pipeline ? "/pipelines" : "/pipelines?state=all"} onClick={() => setOpen(false)}>{pipeline ? "View registry" : "Choose pipeline"}<ArrowRight/></Link></div>
      </div>
    </div>}
  </>;
}
