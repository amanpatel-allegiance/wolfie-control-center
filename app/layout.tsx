import type { Metadata } from "next";
import "./globals.css";
import { ApplicationShell } from "@/components/ApplicationShell";
import { supabaseServer } from "@/lib/supabase/server";
import { getAlerts, getCurrentRole } from "@/lib/data";

export const metadata: Metadata = {
  title: "Wolfie Control Center",
  description: "Ask Wolfie data-pipeline observability + refresh control",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  const email = data.user?.email;
  const [role, openAlerts] = email ? await Promise.all([getCurrentRole(), getAlerts("open")]) : ["viewer" as const, []];

  return (
    <html lang="en">
      <body className="min-h-screen">
        {email ? <ApplicationShell email={email} role={role} alertCount={openAlerts.length}>{children}</ApplicationShell> : <main className="min-h-screen">{children}</main>}
      </body>
    </html>
  );
}
