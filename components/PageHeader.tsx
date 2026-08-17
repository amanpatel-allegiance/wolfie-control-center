import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="ref-page-head min-w-0">
      <div className="min-w-0">
        {eyebrow && <div className="sr-only">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <div><p>{description}</p></div>}
      </div>
      {actions && <div className="ref-actions">{actions}</div>}
    </div>
  );
}
