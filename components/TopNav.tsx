"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Bell, CalendarClock, ChevronRight, CircleUserRound, LayoutDashboard, LogOut, Network } from "lucide-react";
import { cn } from "@/lib/cn";

const items = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/pipelines", label: "Pipelines", icon: Network },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/schedules", label: "Schedules", icon: CalendarClock },
];

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-3" aria-label="Wolfie overview">
      <span className="relative grid size-10 shrink-0 place-items-center rounded-xl bg-white text-wolfie-navy shadow-sm">
        <Activity className="size-5" strokeWidth={2.4} />
        <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-wolfie-navy bg-state-healthy" />
      </span>
      {!compact && (
        <span>
          <span className="block text-sm font-semibold tracking-tight text-white">Wolfie</span>
          <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-white/45">Control center</span>
        </span>
      )}
    </Link>
  );
}

export function TopNav({ email, role }: { email?: string; role: string }) {
  const pathname = usePathname();
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-wolfie-navy px-4 py-5 lg:flex">
        <div className="px-2"><Brand /></div>
        <div className="mt-9 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">Workspace</div>
        <nav className="mt-3 space-y-1.5" aria-label="Primary navigation">
          {items.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={cn("group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition", active ? "bg-white text-wolfie-navy shadow-sm" : "text-white/60 hover:bg-white/[.07] hover:text-white")}>
                <Icon className={cn("size-[18px]", active ? "text-wolfie-accent" : "text-white/45 group-hover:text-white/80")} />
                <span>{item.label}</span>
                {active && <ChevronRight className="ml-auto size-4 text-wolfie-muted" />}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-2xl border border-white/10 bg-white/[.05] p-3">
          <div className="flex items-center gap-2.5">
            <CircleUserRound className="size-8 text-white/55" />
            <div className="min-w-0">
              <div className="truncate text-xs font-medium text-white/85">{email}</div>
              <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/35">{role}</div>
            </div>
          </div>
          <form action="/api/auth/logout" method="post" className="mt-3 border-t border-white/10 pt-2">
            <button type="submit" className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-white/45 transition hover:bg-white/[.06] hover:text-white">
              <LogOut className="size-3.5" /> Sign out
            </button>
          </form>
        </div>
      </aside>

      <header className="fixed inset-x-0 top-0 z-30 border-b border-white/10 bg-wolfie-navy px-4 py-3 shadow-lg lg:hidden">
        <div className="flex items-center justify-between">
          <Brand compact />
          <nav className="flex items-center gap-1" aria-label="Primary navigation">
            {items.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} aria-label={item.label} title={item.label} className={cn("grid size-10 place-items-center rounded-xl transition", active ? "bg-white text-wolfie-accent" : "text-white/55 hover:bg-white/10 hover:text-white")}>
                  <Icon className="size-[18px]" />
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
    </>
  );
}
