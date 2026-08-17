"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Activity, ArrowRight, CheckCircle2, Database, Mail, ShieldCheck } from "lucide-react";

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
    <div className="grid min-h-screen min-w-0 overflow-hidden bg-wolfie-bg lg:grid-cols-[minmax(420px,.82fr)_1.18fr]">
      <section className="relative hidden overflow-hidden bg-wolfie-navy p-12 text-white lg:flex lg:flex-col xl:p-16">
        <div className="flex items-center gap-3"><span className="relative grid size-11 place-items-center rounded-lg border border-white/15 bg-white/[.06] text-[#22C98B]"><Activity className="size-5" /><i className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-wolfie-navy bg-state-healthy" /></span><div><div className="font-semibold">Wolfie</div><div className="text-[10px] uppercase tracking-[.18em] text-[#8FA0B5]">Control center</div></div></div>
        <div className="my-auto"><div className="eyebrow !text-[#8FA0B5]">Production observability</div><h1 className="mt-4 max-w-md text-[38px] font-semibold leading-[1.14] tracking-[-.035em]">A calm, precise view of every data pipeline.</h1><p className="mt-5 max-w-md text-sm leading-7 text-[#AAB7C7]">Monitor freshness, run outcomes, schedules, incidents and measured data quality from one operational workspace.</p><div className="mt-8 grid max-w-sm gap-3 text-xs text-[#D2DCE8]"><span className="flex items-center gap-2"><CheckCircle2 className="size-4 text-[#22C98B]"/>Live production health</span><span className="flex items-center gap-2"><Database className="size-4 text-[#22C98B]"/>Real pipeline telemetry</span></div></div>
        <div className="flex items-center gap-2 text-xs text-[#8FA0B5]"><ShieldCheck className="size-4 text-state-healthy" /> Secure passwordless access</div>
      </section>

      <section className="flex min-w-0 items-center justify-center p-4 sm:p-12 lg:p-16">
        <div className="box-border min-w-0 w-full max-w-full rounded-[10px] border border-wolfie-border bg-white p-6 shadow-card sm:max-w-[430px] sm:p-9">
          <div className="mb-10 flex items-center gap-3 lg:hidden"><span className="grid size-10 place-items-center rounded-xl bg-wolfie-navy text-white"><Activity className="size-5" /></span><span className="font-semibold">Wolfie Control Center</span></div>
          <div className="eyebrow">Welcome back</div>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-.03em]">Sign in to your workspace</h2>
          <p className="mt-2 text-sm leading-6 text-wolfie-muted">Enter your work email and we&apos;ll send you a secure magic link.</p>

          {state === "sent" ? (
            <div className="mt-8 rounded-[10px] border border-state-healthy/20 bg-state-healthy/[.06] p-5">
              <CheckCircle2 className="size-7 text-state-healthy" /><div className="mt-3 font-semibold">Check your inbox</div><p className="mt-1 text-sm leading-6 text-wolfie-muted">We sent a sign-in link to <b className="text-wolfie-ink">{email}</b>.</p>
              <button type="button" onClick={() => setState("idle")} className="mt-4 text-xs font-semibold text-wolfie-accent hover:underline">Use another email</button>
            </div>
          ) : (
            <form onSubmit={send} className="min-w-0 mt-8 space-y-4">
              <label className="block text-xs font-semibold">Work email
                <span className="relative mt-2 block min-w-0"><Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-wolfie-muted" /><input type="email" required autoFocus autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="control h-12 min-w-0 w-full pl-10" /></span>
              </label>
              <button type="submit" disabled={state === "sending"} className="primary-button h-12 w-full">{state === "sending" ? "Sending secure link…" : <>Continue with email <ArrowRight className="size-4" /></>}</button>
              {state === "error" && <div role="alert" className="rounded-xl bg-state-failed/10 p-3 text-xs text-state-failed">{msg}</div>}
            </form>
          )}
          <p className="mt-8 text-center text-2xs leading-5 text-wolfie-muted">By continuing, you agree to your organization&apos;s access and security policies.</p>
        </div>
      </section>
    </div>
  );
}
