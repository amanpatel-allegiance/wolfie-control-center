"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Activity, ArrowRight, CheckCircle2, Mail, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [msg, setMsg] = useState<string>("");

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
    <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl overflow-hidden rounded-3xl border border-white/60 bg-white shadow-lift lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden overflow-hidden bg-wolfie-navy p-12 text-white lg:flex lg:flex-col">
        <div className="absolute -right-24 -top-24 size-80 rounded-full bg-wolfie-accent/30 blur-3xl" />
        <div className="relative flex items-center gap-3"><span className="relative grid size-11 place-items-center rounded-xl bg-white text-wolfie-navy"><Activity className="size-5" /><i className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-wolfie-navy bg-state-healthy" /></span><div><div className="font-semibold">Wolfie</div><div className="text-[10px] uppercase tracking-[.18em] text-white/40">Control center</div></div></div>
        <div className="relative my-auto"><div className="eyebrow !text-white/40">Pipeline intelligence</div><h1 className="mt-4 max-w-md text-4xl font-semibold leading-[1.15] tracking-[-.035em]">Know what your data is doing. Before anyone asks.</h1><p className="mt-5 max-w-md text-sm leading-7 text-white/50">A single operational view for freshness, failures, schedules, and every run across your data platform.</p></div>
        <div className="relative flex items-center gap-2 text-xs text-white/40"><ShieldCheck className="size-4 text-state-healthy" /> Secure, passwordless access</div>
      </section>

      <section className="flex items-center p-7 sm:p-12 lg:p-16">
        <div className="w-full">
          <div className="mb-10 flex items-center gap-3 lg:hidden"><span className="grid size-10 place-items-center rounded-xl bg-wolfie-navy text-white"><Activity className="size-5" /></span><span className="font-semibold">Wolfie Control Center</span></div>
          <div className="eyebrow">Welcome back</div>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-.03em]">Sign in to your workspace</h2>
          <p className="mt-2 text-sm leading-6 text-wolfie-muted">Enter your work email and we&apos;ll send you a secure magic link.</p>

          {state === "sent" ? (
            <div className="mt-8 rounded-2xl border border-state-healthy/20 bg-state-healthy/[.06] p-5">
              <CheckCircle2 className="size-7 text-state-healthy" /><div className="mt-3 font-semibold">Check your inbox</div><p className="mt-1 text-sm leading-6 text-wolfie-muted">We sent a sign-in link to <b className="text-wolfie-ink">{email}</b>.</p>
              <button type="button" onClick={() => setState("idle")} className="mt-4 text-xs font-semibold text-wolfie-accent hover:underline">Use another email</button>
            </div>
          ) : (
            <form onSubmit={send} className="mt-8 space-y-4">
              <label className="block text-xs font-semibold">Work email
                <span className="relative mt-2 block"><Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-wolfie-muted" /><input type="email" required autoFocus autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="control h-12 w-full pl-10" /></span>
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
