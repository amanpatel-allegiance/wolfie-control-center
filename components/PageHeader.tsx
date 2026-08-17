import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-1.5">{eyebrow}</div>}
        <h1 className="page-title">{title}</h1>
        {description && <div className="page-copy">{description}</div>}
      </div>
      {actions && <div className="hidden shrink-0 flex-wrap items-center justify-end gap-2 sm:flex">{actions}</div>}
    </div>
  );
}
