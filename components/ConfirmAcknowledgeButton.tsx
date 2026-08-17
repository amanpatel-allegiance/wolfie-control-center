"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check } from "lucide-react";

export function ConfirmAcknowledgeButton({ alertId }: { alertId: number }) {
  const router = useRouter(); const [pending, setPending] = useState(false);
  const act = async () => { if (!window.confirm("Acknowledge this incident and assign ownership to your account?")) return; setPending(true); const response = await fetch(`/api/alerts/${alertId}/ack`, { method: "POST" }); setPending(false); if (response.ok) router.refresh(); else window.alert("The incident could not be acknowledged."); };
  return <button type="button" disabled={pending} onClick={act} className="secondary-button h-8 px-2.5"><Check className="size-3.5"/>{pending ? "Saving…" : "Acknowledge"}</button>;
}
