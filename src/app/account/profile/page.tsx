import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Section } from "@/components/ui/Section";
import { AccountNav } from "@/components/account/AccountNav";
import { ProfileForm } from "@/components/account/ProfileForm";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "My Profile",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getSessionUser();
  if (!user) redirect("/account/login?next=/account/profile");
  return (
    <Section className="!py-10">
      <div className="mx-auto max-w-3xl">
        <AccountNav name={user.name} />
        <div className="mt-6">
          <ProfileForm
            user={{
              name: user.name,
              email: user.email,
              emailVerified: user.emailVerified,
              phone: user.phone ?? null,
              nationality: user.nationality ?? null,
            }}
          />
        </div>
      </div>
    </Section>
  );
}
