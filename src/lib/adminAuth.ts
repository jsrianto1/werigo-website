import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { resolveSupabaseServerConfig } from "@/lib/supabaseServer";

/**
 * Admin authentication for /admin pages and /api/admin routes.
 * A user is an admin only if they hold a valid Supabase Auth session
 * AND their email is in the server-only ADMIN_EMAILS allowlist.
 * The allowlist never reaches the client.
 */

export interface AdminIdentity {
  email: string;
}

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function getAdmin(): Promise<AdminIdentity | null> {
  // Session verification uses the publishable key only — never the
  // secret key, which plays no role in cookie auth.
  const { url, publishableKey: key } = resolveSupabaseServerConfig();
  if (!url || !key) return null;

  const cookieStore = await cookies();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => {
        /* read-only in route handlers/server components */
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email?.toLowerCase();
  if (!email || !adminEmails().includes(email)) return null;
  return { email };
}
