import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function OperationalCard({ title, description, action, children, className = "" }: { title: string; description?: string; action?: { href: string; label: string } | ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`surface overflow-hidden ${className}`}>
      <header className="card-header">
        <div className="min-w-0 flex-1"><h2 className="card-heading">{title}</h2>{description && <p className="card-copy">{description}</p>}</div>
        {action && (typeof action === "object" && action !== null && "href" in action ? <Link href={action.href} className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-wolfie-accent hover:underline">{action.label}<ArrowRight className="size-3" /></Link> : action)}
      </header>
      {children}
    </section>
  );
}
