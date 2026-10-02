import "server-only";
import { headers } from "next/headers";
import { auth, STAFF_ROLES, type Role } from "@/lib/auth";

/**
 * Admin authentication for /admin pages and /api/admin routes.
 * A request is an admin request only if it carries a valid session
 * whose user has a staff role ("admin" or "super_admin") and is not
 * banned. Roles live in the database, never in the client bundle.
 */

export interface AdminIdentity {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export async function getAdmin(): Promise<AdminIdentity | null> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const user = session?.user as
      | (typeof auth.$Infer.Session)["user"] & { role?: string | null; banned?: boolean | null }
      | undefined;
    if (!user || user.banned) return null;
    const role = user.role as Role | undefined;
    if (!role || !STAFF_ROLES.includes(role)) return null;
    return { id: user.id, email: user.email.toLowerCase(), name: user.name, role };
  } catch (err) {
    // Database down or auth misconfigured: treat as signed out, never crash the page.
    console.error(`[admin-auth] session check failed: ${err instanceof Error ? err.message.slice(0, 200) : String(err)}`);
    return null;
  }
}
