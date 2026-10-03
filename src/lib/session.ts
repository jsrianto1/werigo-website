import "server-only";
import { headers } from "next/headers";
import { auth, type SessionUser } from "@/lib/auth";

/**
 * Current signed-in user (any role) for route handlers and server
 * components. Banned users are treated as signed out. Never throws.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const user = session?.user as SessionUser | undefined;
    if (!user || user.banned) return null;
    return user;
  } catch (err) {
    console.error(`[session] lookup failed: ${err instanceof Error ? err.message.slice(0, 200) : String(err)}`);
    return null;
  }
}
