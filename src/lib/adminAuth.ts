import "server-only";
import { headers } from "next/headers";
import { auth, STAFF_ROLES, type Role } from "@/lib/auth";
import { resolveMember } from "@/ops/lib/auth";
import { opsDatabase } from "@/ops/lib/database";
import { websiteRoleForDualMember } from "@/ops/lib/dual-identity";

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
  /** Temporary password still in use: the admin pages send them to set their own. */
  mustChangePassword: boolean;
  provider?: "email" | "workspace";
  impersonated?: boolean;
  sessionStartedAt?: number;
}

export async function getEmailAdmin(): Promise<AdminIdentity | null> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const user = session?.user as
      | (typeof auth.$Infer.Session)["user"] & { role?: string | null; banned?: boolean | null; mustChangePassword?: boolean | null }
      | undefined;
    if (!user || user.banned) return null;
    const role = user.role as Role | undefined;
    if (!role || !STAFF_ROLES.includes(role)) return null;
    const sessionInfo = session?.session as {impersonatedBy?: string | null; createdAt?: Date} | undefined;
    return { id: user.id, email: user.email.toLowerCase(), name: user.name, role, mustChangePassword: Boolean(user.mustChangePassword), provider: "email", impersonated: Boolean(sessionInfo?.impersonatedBy), sessionStartedAt: sessionInfo?.createdAt ? new Date(sessionInfo.createdAt).getTime() : undefined };
  } catch (err) {
    // Database down or auth misconfigured: treat as signed out, never crash the page.
    console.error(`[admin-auth] session check failed: ${err instanceof Error ? err.message.slice(0, 200) : String(err)}`);
    return null;
  }
}

export const canManageDualAccounts = (opsRole: unknown, admin: AdminIdentity | null) =>
  opsRole === 'owner' && admin?.role === 'super_admin' && !admin.mustChangePassword && !admin.impersonated;

export async function getAdmin(): Promise<AdminIdentity | null> {
  try {
    const member = await resolveMember(opsDatabase());
    const role = member && websiteRoleForDualMember({id: member.id, email: member.email, role: member.role});
    if (member && role) {
      // No Better Auth user or fabricated email; the immutable principal ID is
      // used as the actor key by existing website audit writers.
      return { id: member.id, email: member.id, name: member.name, role, mustChangePassword: false, provider: "workspace" };
    }
  } catch {
    console.error('[admin-auth] Could not resolve workspace session.');
  }
  return getEmailAdmin();
}
