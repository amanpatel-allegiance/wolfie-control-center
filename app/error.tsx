"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="surface empty-panel min-h-[420px]"><div className="max-w-sm"><span className="mx-auto grid size-11 place-items-center rounded-full bg-state-failed/10 text-state-failed"><AlertTriangle className="size-5"/></span><h1 className="mt-4 text-base font-semibold">Dashboard data could not be loaded</h1><p className="mt-2 text-xs leading-5 text-wolfie-muted">The live data source returned an error. Retry the request; no placeholder data has been substituted.</p><button onClick={reset} className="primary-button mt-5"><RotateCcw className="size-3.5"/>Try again</button></div></div>;
}
