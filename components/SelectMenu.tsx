"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export type SelectOption = {
  value: string;
  label: string;
  description?: string;
};

export function SelectMenu({
  value,
  options,
  onValueChange,
  icon,
  className,
  menuAlign = "right",
  ariaLabel,
}: {
  value: string;
  options: SelectOption[];
  onValueChange: (value: string) => void;
  icon?: ReactNode;
  className?: string;
  menuAlign?: "left" | "right";
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node) && !menu.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    window.addEventListener("keydown", escape);
    const position = () => {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      setMenuStyle(menuAlign === "left" ? { position: "fixed", left: rect.left, top: rect.bottom + 7 } : { position: "fixed", right: Math.max(14, window.innerWidth - rect.right), top: rect.bottom + 7 });
    };
    position();
    const focusTimer = window.requestAnimationFrame(() => menu.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus());
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", escape);
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      window.cancelAnimationFrame(focusTimer);
    };
  }, [menuAlign, open]);

  return (
    <div ref={root} className={cn("relative", className?.includes("ml-auto") && "ml-auto")}>
      <button
        ref={trigger}
        type="button"
        className={cn("ref-btn", className)}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => { if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); } }}
      >
        {icon}
        <span>{selected?.label}</span>
        <ChevronDown className={cn("transition-transform", open && "rotate-180")} />
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <div ref={menu} id={menuId} role="listbox" style={menuStyle} className="select-menu" onKeyDown={(event) => { const items = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="option"]')]; const index = items.indexOf(document.activeElement as HTMLButtonElement); if (event.key === "ArrowDown") { event.preventDefault(); items[(index + 1) % items.length]?.focus(); } if (event.key === "ArrowUp") { event.preventDefault(); items[(index - 1 + items.length) % items.length]?.focus(); } }}>
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={active}
                className={cn("select-menu-item", active && "active")}
                onClick={() => {
                  onValueChange(option.value);
                  setOpen(false);
                }}
              >
                <span className="min-w-0"><strong>{option.label}</strong>{option.description && <small>{option.description}</small>}</span>
                {active && <Check className="size-4 shrink-0 text-wolfie-accent" strokeWidth={2.5} />}
              </button>
            );
          })}
        </div>, document.body
      )}
    </div>
  );
}

export function QuerySelect({
  param,
  value,
  options,
  defaultValue,
  icon,
  className,
  menuAlign,
  ariaLabel,
}: {
  param: string;
  value: string;
  options: SelectOption[];
  defaultValue?: string;
  icon?: ReactNode;
  className?: string;
  menuAlign?: "left" | "right";
  ariaLabel?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  return (
    <SelectMenu
      value={value}
      options={options}
      icon={icon}
      className={className}
      menuAlign={menuAlign}
      ariaLabel={ariaLabel}
      onValueChange={(nextValue) => {
        const params = new URLSearchParams(searchParams.toString());
        if (nextValue === defaultValue) params.delete(param); else params.set(param, nextValue);
        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      }}
    />
  );
}
