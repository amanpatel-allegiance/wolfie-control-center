import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * User-scoped Supabase client (respects RLS + auth). Use in Server Components.
 */
export async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl(), env.supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Route handlers can't set cookies in some paths; ignore.
        }
      },
    },
  });
}

/**
 * Service-role client. NEVER return data from this in a Server Component
 * without an explicit authorization check. Only for cron endpoints, alert engine,
 * manual-run dispatch, and admin actions after an authorization gate.
 */
export function supabaseServiceRole() {
  return createClient(env.supabaseUrl(), env.supabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
