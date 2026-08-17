"use client";

import { useEffect, useState, useTransition } from "react";
import { CheckCircle2, Play, X, Zap } from "lucide-react";
import { cn } from "@/lib/cn";

type Props = { pipelineKey: string; canRun: boolean; scheduler: string; label?: string; initialMode?: "incremental" | "full" | "dry-run" };

export function ManualRunButton({ pipelineKey, canRun, scheduler, label = "Trigger run", initialMode = "incremental" }: Props) {
  const [mode, setMode] = useState<"incremental" | "full" | "dry-run">(initialMode);
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  const dispatch = () => {
    setResult(null);
    start(async () => {
      const res = await fetch(`/api/pipelines/${pipelineKey}/run`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode, note }),
      });
      const json = await res.json().catch(() => ({}));
      setResult({ ok: res.ok, msg: json.message ?? (res.ok ? "Run dispatched" : "Dispatch failed") });
      if (res.ok) setTimeout(() => setOpen(false), 1200);
    });
  };

  if (!canRun) return <button type="button" title="Operator role required" disabled className="ref-btn cursor-not-allowed opacity-60"><Play className="size-4" /> {label}</button>;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="ref-btn ref-btn-primary"><Play className="size-4 fill-current" /> {label}{label === "Trigger run" ? "⌄" : ""}</button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-wolfie-navy/60 p-4" role="dialog" aria-modal="true" aria-labelledby="run-dialog-title" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
          <div className="w-full max-w-md rounded-[10px] border border-wolfie-border bg-wolfie-panel p-6 shadow-lift">
            <div className="flex items-start justify-between gap-4">
              <div className="grid size-10 place-items-center rounded-xl bg-wolfie-lavender text-wolfie-accent"><Zap className="size-5" /></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="grid size-9 place-items-center rounded-lg text-wolfie-muted hover:bg-wolfie-soft hover:text-wolfie-ink"><X className="size-4" /></button>
            </div>
            <h3 id="run-dialog-title" className="mt-4 text-xl font-semibold tracking-tight">Trigger pipeline run</h3>
            <p className="mt-1 text-sm leading-6 text-wolfie-muted">Run <span className="font-semibold text-wolfie-ink">{pipelineKey}</span> via <code>{scheduler}</code>. This action is rate-limited and audited.</p>

            <label className="mt-5 block text-xs font-semibold">Run mode</label>
            <div className="mt-2 grid grid-cols-3 gap-2 rounded-xl bg-wolfie-soft p-1">
              {(["incremental", "full", "dry-run"] as const).map((item) => (
                <button key={item} type="button" onClick={() => setMode(item)} className={cn("rounded-lg px-2 py-2 text-xs font-semibold capitalize transition", mode === item ? "bg-white text-wolfie-accent shadow-sm" : "text-wolfie-muted hover:text-wolfie-ink")}>{item}</button>
              ))}
            </div>

            <label className="mt-5 block text-xs font-semibold">Operator note <span className="font-normal text-wolfie-muted">(optional)</span></label>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} className="control mt-2 h-auto min-h-20 w-full resize-none py-2.5" placeholder="e.g. retry after 429 spike" />

            {result && <div className={cn("mt-4 flex items-center gap-2 rounded-xl p-3 text-xs font-medium", result.ok ? "bg-state-healthy/10 text-state-healthy" : "bg-state-failed/10 text-state-failed")}>{result.ok && <CheckCircle2 className="size-4" />}{result.msg}</div>}

            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="secondary-button">Cancel</button>
              <button type="button" onClick={dispatch} disabled={pending} className="primary-button"><Play className="size-4 fill-current" />{pending ? "Dispatching…" : `Run ${mode}`}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
