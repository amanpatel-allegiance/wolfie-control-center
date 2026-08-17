import type { LucideIcon } from "lucide-react";
import { Database } from "lucide-react";

export function EmptyState({ title, description, icon: Icon = Database, compact = false }: { title: string; description: string; icon?: LucideIcon; compact?: boolean }) {
  return <div className={`empty-panel ${compact ? "min-h-36" : "min-h-52"}`}><div className="max-w-sm"><span className="mx-auto grid size-10 place-items-center rounded-full bg-wolfie-soft text-wolfie-muted"><Icon className="size-[18px]" /></span><h3 className="mt-3 text-xs font-semibold text-wolfie-ink">{title}</h3><p className="mt-1 text-[11px] leading-5 text-wolfie-muted">{description}</p></div></div>;
}
