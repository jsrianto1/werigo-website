import type { Metadata } from "next";
import { Section } from "@/components/ui/Section";
import { AccountNav } from "@/components/account/AccountNav";
import { ProfileForm } from "@/components/account/ProfileForm";
import { IdentityForm } from "@/components/account/IdentityForm";
import { requireCustomer } from "@/lib/customerGate";

export const metadata: Metadata = {
  title: "My Profile",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireCustomer("/account/profile");
  return (
    <Section className="!py-10">
      <div className="mx-auto max-w-3xl">
        <AccountNav name={user.name} />
        <div className="mt-6 space-y-6">
          <div className="rounded-[14px] border border-line bg-card p-6">
            <IdentityForm heading="Rider documents" />
          </div>
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
