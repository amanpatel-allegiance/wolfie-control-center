import type { Metadata } from "next";
import "./globals.css";
import { ApplicationShell } from "@/components/ApplicationShell";
import { getAlerts, getCurrentRole, getPipelineHealth } from "@/lib/data";
import { deriveLiveHealthIncidents } from "@/lib/incidents";
import { getDashboardAccessEmail } from "@/lib/dashboard-access";

export const metadata: Metadata = {
  title: "Wolfie Control Center",
  description: "Ask Wolfie data-pipeline observability + refresh control",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const email = await getDashboardAccessEmail();
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
