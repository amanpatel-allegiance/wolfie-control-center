import "server-only";

import { cookies } from "next/headers";
import { COMPANY_ACCESS_COOKIE, normalizeCompanyEmail } from "@/lib/company-access";
import { isLocalDashboardPreview } from "@/lib/local-preview";
import { supabaseServer } from "@/lib/supabase/server";

export async function getDashboardAccessEmail(): Promise<string | null> {
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  const authenticatedEmail = normalizeCompanyEmail(data.user?.email);
  if (authenticatedEmail) return authenticatedEmail;

  const cookieStore = await cookies();
  const companyEmail = normalizeCompanyEmail(cookieStore.get(COMPANY_ACCESS_COOKIE)?.value);
  if (companyEmail) return companyEmail;

  return isLocalDashboardPreview() ? "aman.patel@allegiance.ae" : null;
}

export async function hasDashboardAccess(): Promise<boolean> {
  return (await getDashboardAccessEmail()) !== null;
}
