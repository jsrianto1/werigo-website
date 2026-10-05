import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Section } from "@/components/ui/Section";
import { CompleteIdentity } from "@/components/account/CompleteIdentity";
import { getSessionUser } from "@/lib/session";
import { hasIdentity } from "@/lib/identity";
import { safeNext } from "@/lib/safeNext";
import { STAFF_ROLES, type Role } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Complete Your Account",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Rider documents step. Every customer passes here once: after Google
 * sign-in, and for accounts created before documents were required.
 */
export default async function CompleteAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const target = safeNext(next, "/account");
  const user = await getSessionUser();
  if (!user) redirect(`/account/login?next=${encodeURIComponent(`/account/complete?next=${target}`)}`);
  if (STAFF_ROLES.includes(user.role as Role)) redirect("/admin");
  if (await hasIdentity(user.id)) redirect(target);
  return (
    <Section>
      <div className="mx-auto max-w-md rounded-[14px] border border-line bg-card p-6">
        <CompleteIdentity next={target} />
      </div>
    </Section>
  );
}
