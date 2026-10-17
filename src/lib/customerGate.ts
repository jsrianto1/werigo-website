import "server-only";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { STAFF_ROLES, type Role, type SessionUser } from "@/lib/auth";

/**
 * Gate for customer account pages: signed in, a customer (staff go to
 * /admin), Documents are requested only during rental checkout.
 */
export async function requireCustomer(path: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/account/login?next=${encodeURIComponent(path)}`);
  if (STAFF_ROLES.includes(user.role as Role)) redirect("/admin");
  return user;
}
