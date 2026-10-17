import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { safeNext } from "@/lib/safeNext";
import { STAFF_ROLES, type Role } from "@/lib/auth";
export const metadata: Metadata = { title: "Continue to Werigo", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
/** Preserve legacy OAuth callbacks without asking for documents at sign-up. */
export default async function CompleteAccountPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const target = safeNext((await searchParams).next, "/account");
  const user = await getSessionUser();
  if (!user) redirect(`/account/login?next=${encodeURIComponent(target)}`);
  if (STAFF_ROLES.includes(user.role as Role)) redirect("/admin");
  redirect(target.startsWith("/account/complete") ? "/account" : target);
}
