import type { Metadata } from "next";
import "./globals.css";
import { TopNav } from "@/components/TopNav";
import { supabaseServer } from "@/lib/supabase/server";
import { getCurrentRole } from "@/lib/data";

export const metadata: Metadata = {
  title: "Wolfie Control Center",
  description: "Ask Wolfie data-pipeline observability + refresh control",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  const email = data.user?.email;
  const role = email ? await getCurrentRole() : "viewer";

  return (
    <html lang="en">
      <body className="min-h-screen">
        {email && <TopNav email={email} role={role} />}
        <main className={email ? "min-h-screen px-4 pb-10 pt-24 sm:px-6 lg:ml-64 lg:px-8 lg:pt-8" : "min-h-screen px-4 py-8"}>
          <div className="mx-auto max-w-[1480px] animate-in">{children}</div>
        </main>
      </body>
    </html>
  );
}
