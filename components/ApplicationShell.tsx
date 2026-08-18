"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Menu, X } from "lucide-react";
import { cn } from "@/lib/cn";

const items = [
  { href: "/", label: "Overview", glyph: "⌂" },
  { href: "/pipelines", label: "Pipelines", glyph: "⌘" },
  { href: "/runs", label: "Runs", glyph: "▷" },
  { href: "/schedules", label: "Schedules", glyph: "▣" },
  { href: "/alerts", label: "Incidents", glyph: "△" },
  { href: "/quality", label: "Data quality", glyph: "◇" },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

function PulseMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M2 26h8l4-13 6 25 6-29 5 18 4-8 4 7h7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="Wolfie operations overview">
      <PulseMark className={cn("shrink-0 text-[#22C98B]", compact ? "size-8" : "size-9")} />
      {!compact && <span><strong className="block text-[17px] font-semibold tracking-[-.02em] text-white">Wolfie</strong><span className="mt-0.5 block text-[9px] font-medium uppercase tracking-[.16em] text-[#8FA0B5]">Control center</span></span>}
    </Link>
  );
}

function NavLinks({ pathname, mobile = false, onNavigate }: { pathname: string; mobile?: boolean; onNavigate?: () => void }) {
  return (
    <nav className={mobile ? "grid gap-1" : "grid gap-1 px-2 py-3"} aria-label="Primary navigation">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm transition",
              active ? "bg-[#17273A] font-semibold text-white" : "text-[#D2DCE8] hover:bg-white/[.055] hover:text-white",
            )}
          >
            {!mobile && active && <span className="absolute -left-2 top-2 bottom-2 w-[3px] rounded-r bg-[#20C589]" />}
            <span className={cn("grid w-[17px] place-items-center text-[17px] leading-none", active ? "text-[#24D69A]" : "text-[#8FA0B5] group-hover:text-white")}>{item.glyph}</span>
            <span>{item.label}</span>
            {mobile && active && <ChevronRight className="ml-auto size-4 text-[#8FA0B5]" />}
          </Link>
        );
      })}
    </nav>
  );
}

export function ApplicationShell({ children, email, role, alertCount }: { children: React.ReactNode; email: string; role: string; alertCount: number }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const initials = useMemo(() => email.split("@")[0].split(/[._-]/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "WC", [email]);

  useEffect(() => setDrawerOpen(false), [pathname]);
  useEffect(() => {
    if (!drawerOpen) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setDrawerOpen(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [drawerOpen]);

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[232px] flex-col bg-wolfie-navy lg:flex">
        <div className="flex h-[76px] items-center border-b border-white/[.08] px-[18px]"><Brand /></div>
        <NavLinks pathname={pathname} />
        <div className="mt-auto p-3"><div className="flex items-center gap-[10px] border-t border-white/[.08] p-[11px]"><span className="grid size-[34px] shrink-0 place-items-center rounded-lg border border-[#435268] text-[11px] text-white">▥</span><div className="min-w-0 text-xs text-white"><div>Wolfie Data Platform</div><small className="text-[10px] text-[#8FA0B5]">Production workspace</small></div></div></div>
      </aside>

      <div className="min-w-0 lg:pl-[232px]">
        <header className="sticky top-0 z-30 flex h-[58px] items-center gap-4 border-b border-white/10 bg-wolfie-navy px-4 lg:border-wolfie-border lg:bg-white lg:px-6">
          <button type="button" onClick={() => setDrawerOpen(true)} className="grid size-9 place-items-center rounded-lg text-white lg:hidden" aria-label="Open navigation"><Menu className="size-5" /></button>
          <form action="/pipelines" method="get" className="hidden h-9 w-[min(440px,42vw)] items-center gap-2 rounded-lg border border-wolfie-border bg-white px-3 text-wolfie-muted lg:flex">
            <span className="text-base leading-none">⌕</span>
            <input name="q" className="min-w-0 flex-1 border-0 bg-transparent text-xs outline-none placeholder:text-wolfie-subtle" placeholder="Search pipelines, datasets, runs…" />
            <kbd className="rounded border border-wolfie-border px-1.5 py-0.5 text-[10px] text-wolfie-subtle">⌘K</kbd>
          </form>
          <div className="flex-1" />
          <span className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#33445A] bg-[#102033] px-3 text-[13px] font-semibold text-white lg:border-wolfie-border lg:bg-white lg:text-[#344054]"><i className="size-[7px] rounded-full bg-state-healthy" />Production⌄</span>
          <span className="hidden h-9 items-center gap-1.5 rounded-lg border border-wolfie-border bg-white px-3 text-[13px] font-semibold text-[#344054] sm:inline-flex">◷ GST (UTC+4)⌄</span>
          <Link href="/alerts" className="relative hidden size-9 place-items-center rounded-lg border border-wolfie-border bg-white text-base text-wolfie-muted hover:text-wolfie-ink sm:grid" aria-label={`${alertCount} open incidents`}>♧{alertCount > 0 && <span className="absolute -right-1.5 -top-1.5 grid min-w-[17px] h-[17px] place-items-center rounded-full border-2 border-white bg-state-failed px-0.5 text-[9px] font-semibold text-white">{Math.min(alertCount, 99)}</span>}</Link>
          <form action="/api/auth/logout" method="post"><button type="submit" title={`Signed in as ${email} · ${role}. Click to sign out.`} className="grid size-8 place-items-center rounded-full bg-wolfie-navy text-[10px] font-semibold text-white">{initials}</button></form>
        </header>

        <main className="mx-auto min-h-[calc(100vh-58px)] max-w-[1600px] px-[14px] pb-[88px] pt-[18px] lg:px-6 lg:pb-20 lg:pt-[22px]">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid h-[68px] grid-cols-5 border-t border-wolfie-border bg-white lg:hidden" aria-label="Mobile navigation">
        {items.slice(0, 5).map((item) => {
          const active = isActive(pathname, item.href);
          return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn("grid place-items-center gap-0.5 py-1 text-[9px] font-medium", active ? "text-state-running" : "text-wolfie-muted")}><span className="text-xl leading-[18px]">{item.glyph}</span><span>{item.label}</span></Link>;
        })}
      </nav>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button type="button" className="absolute inset-0 bg-wolfie-navy/55" onClick={() => setDrawerOpen(false)} aria-label="Close navigation" />
          <aside className="relative flex h-full w-[min(310px,86vw)] flex-col bg-wolfie-navy shadow-2xl">
            <div className="flex h-[70px] items-center justify-between border-b border-white/[.08] px-5"><Brand /><button type="button" onClick={() => setDrawerOpen(false)} className="grid size-9 place-items-center rounded-lg text-[#8FA0B5] hover:bg-white/10 hover:text-white" aria-label="Close navigation"><X className="size-5" /></button></div>
            <div className="p-2"><NavLinks pathname={pathname} mobile onNavigate={() => setDrawerOpen(false)} /></div>
            <div className="mt-auto border-t border-white/[.08] p-4"><div className="truncate text-xs text-white">{email}</div><div className="mt-1 text-[10px] capitalize text-[#8FA0B5]">{role} · production workspace</div><form action="/api/auth/logout" method="post" className="mt-3"><button type="submit" className="ref-btn w-full border-white/10 bg-white/[.06] text-white">Sign out</button></form></div>
          </aside>
        </div>
      )}
    </div>
  );
}
