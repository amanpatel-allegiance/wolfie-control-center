import type { Metadata } from "next";
import "./globals.css";
import { ApplicationShell } from "@/components/ApplicationShell";
import { supabaseServer } from "@/lib/supabase/server";
import { getAlerts, getCurrentRole, getPipelineHealth } from "@/lib/data";
import { isLocalDashboardPreview } from "@/lib/local-preview";
import { deriveLiveHealthIncidents } from "@/lib/incidents";

export const metadata: Metadata = {
  title: "Wolfie Control Center",
  description: "Ask Wolfie data-pipeline observability + refresh control",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  const preview = isLocalDashboardPreview();
  const email = data.user?.email ?? (preview ? "aman.patel@local.preview" : undefined);
  const [roleResult, alertsResult, pipelinesResult] = email
    ? await Promise.allSettled([getCurrentRole(), getAlerts("open"), getPipelineHealth()])
    : [null, null, null];
  const role = roleResult?.status === "fulfilled" ? roleResult.value : "viewer";
  const openAlerts = alertsResult?.status === "fulfilled" ? alertsResult.value : [];
  const pipelines = pipelinesResult?.status === "fulfilled" ? pipelinesResult.value : [];
  const incidentCount = openAlerts.length + deriveLiveHealthIncidents(pipelines, openAlerts).length;

  return (
    <html lang="en">
      <body className="min-h-screen">
        {email ? <ApplicationShell email={email} role={role} alertCount={incidentCount}>{children}</ApplicationShell> : <main className="min-h-screen">{children}</main>}
      </body>
    </html>
  );
}
