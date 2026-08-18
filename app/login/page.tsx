"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Activity, ArrowRight, CheckCircle2, Clock3, LockKeyhole, ShieldCheck, type LucideIcon } from "lucide-react";

const FEATURES: ReadonlyArray<{ icon: LucideIcon; label: string }> = [
  { icon: Activity, label: "Live run health" },
  { icon: Clock3, label: "Freshness SLA tracking" },
  { icon: ShieldCheck, label: "Audited refresh controls" },
];

function Pulse() { return <svg className="size-[38px] text-[#22C98B]" viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M2 26h8l4-13 6 25 6-29 5 18 4-8 4 7h7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>; }

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    const error = new URLSearchParams(window.location.search).get("error");
    if (error) { setState("error"); setMsg(error); }
  }, []);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("sending");
    const sb = supabaseBrowser();
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setState("error");
      setMsg(error.message);
    } else {
      setState("sent");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center overflow-auto bg-[#F2F3F5] p-[14px] lg:p-[4vh_5vw]">
      <div className="grid w-full max-w-[1080px] overflow-hidden rounded-2xl bg-white shadow-[0_24px_70px_rgba(16,24,40,.15)] lg:min-h-[660px] lg:grid-cols-[44%_56%]">
        <section className="relative hidden flex-col overflow-hidden bg-[radial-gradient(circle_at_15%_5%,rgba(34,201,139,.13),transparent_17rem),linear-gradient(155deg,#0b192a,#06101c)] p-[54px] text-white lg:flex">
          <div className="flex items-center gap-3"><Pulse/><div><b className="text-[21px]">Wolfie</b><div className="text-[10px] tracking-[.15em] text-[#9DAFC3]">CONTROL CENTER</div></div></div>
          <div className="my-auto"><div className="eyebrow !text-[#24D69A]">DATA OPERATIONS</div><h1 className="mb-[14px] mt-[70px] text-[40px] font-semibold leading-[1.12] tracking-[-.04em]">Every pipeline.<br/>One clear signal.</h1><p className="leading-[1.6] text-[#A8B6C8]">Freshness, failures and refresh controls across your data platform.</p><div className="mt-7 grid gap-[14px] text-[13px]">{FEATURES.map(({icon:Icon,label}) => <div key={label} className="flex items-center gap-[10px]"><i className="grid size-[30px] place-items-center rounded-full border border-[#415167] bg-white/[.025] not-italic text-[#26D39A] shadow-[inset_0_1px_0_rgba(255,255,255,.08)]"><Icon className="size-3.5"/></i>{label}</div>)}</div></div>
          <div aria-hidden="true" className="absolute -bottom-10 -right-[30px] size-[280px] rotate-[-8deg] bg-[linear-gradient(rgba(255,255,255,.25)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.25)_1px,transparent_1px)] bg-[size:36px_36px] opacity-[.19]"/>
        </section>

        <section className="flex min-w-0 flex-col justify-center px-7 py-[52px] lg:px-[90px] lg:py-[70px]">
          <div className="eyebrow !text-[#24D69A]">WELCOME BACK</div>
          <h2 className="my-2 text-[35px] font-semibold tracking-[-.04em]">Sign in to Wolfie</h2>
          <p className="leading-[1.55] text-wolfie-muted">Use your work email to receive a secure magic link.</p>

          {state === "sent" ? (
            <div className="mt-7 rounded-[10px] border border-state-healthy/20 bg-state-healthy/[.06] p-5">
              <CheckCircle2 className="size-7 text-state-healthy" /><div className="mt-3 font-semibold">Check your inbox</div><p className="mt-1 text-sm leading-6 text-wolfie-muted">We sent a sign-in link to <b className="text-wolfie-ink">{email}</b>.</p>
              <button type="button" onClick={() => setState("idle")} className="mt-4 text-xs font-semibold text-wolfie-accent hover:underline">Use another email</button>
            </div>
          ) : (
            <form onSubmit={send} className="min-w-0">
              <label className="mb-[7px] mt-[26px] block text-xs font-bold">Work email</label>
              <input type="email" required autoFocus autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="h-12 min-w-0 w-full rounded-lg border border-[#CCD3DC] px-[13px] text-sm outline-none focus:border-wolfie-accent focus:shadow-[0_0_0_3px_rgba(15,159,110,.12)]" />
              <button type="submit" disabled={state === "sending"} className="ref-btn ref-btn-primary mt-[14px] h-12 w-full">{state === "sending" ? "Sending secure link…" : <>Send magic link <ArrowRight className="size-4" /></>}</button>
              {state === "error" && <div role="alert" className="rounded-xl bg-state-failed/10 p-3 text-xs text-state-failed">{msg}</div>}
            </form>
          )}
          <div className="mt-[14px] flex items-center gap-1.5 text-[11px] text-wolfie-muted"><LockKeyhole className="size-3.5"/>Secure, passwordless sign-in. Magic link expires in 15 minutes.</div>
        </section>
      </div>
    </div>
  );
}
