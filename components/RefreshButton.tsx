"use client";

import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { useTransition } from "react";

export function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button type="button" className="secondary-button" disabled={pending} onClick={() => startTransition(() => router.refresh())}>
      <RefreshCw className={`size-4 ${pending ? "animate-spin" : ""}`} />
      <span className="hidden sm:inline">{pending ? "Refreshing" : "Refresh data"}</span>
    </button>
  );
}
