"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

export function ResolveIncidentButton({ alertId }: { alertId: number }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const resolve = async () => {
    if (!window.confirm("Resolve this incident? The action is persisted in the production alert event.")) return;
    setPending(true);
    const response = await fetch(`/api/alerts/${alertId}/resolve`, { method: "POST", headers: { accept: "application/json" } });
    const result = await response.json().catch(() => ({}));
    setPending(false);
    if (response.ok) router.replace("/incidents"); else window.alert(result.message ?? "The incident could not be resolved.");
  };
  return <button type="button" className="ref-btn" disabled={pending} onClick={resolve}><CheckCircle2/>{pending ? "Resolving…" : "Resolve"}</button>;
}
