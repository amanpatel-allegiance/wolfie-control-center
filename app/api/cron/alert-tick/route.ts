import { NextResponse } from "next/server";
import { runAlertTick } from "@/lib/alerts";
import { env } from "@/lib/env";

const forbidden = () => NextResponse.json({ ok: false, message: "forbidden" }, { status: 403 });

async function handle(request: Request) {
  const secret = env.alertTickSecret();
  if (secret) {
    const authz = request.headers.get("authorization") ?? "";
    if (authz !== `Bearer ${secret}`) return forbidden();
  }
  try {
    const summary = await runAlertTick();
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    return NextResponse.json({ ok: false, message: (err as Error).message }, { status: 500 });
  }
}

export const GET  = handle;
export const POST = handle;
