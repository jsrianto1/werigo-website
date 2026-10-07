import type { Metadata } from "next";
import { AccountShell } from "@/components/account/AccountShell";
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
    <AccountShell name={user.name} email={user.email} title="Profile" lede="Your details, rider documents and password.">
      <div className="space-y-6">
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
    </AccountShell>
  );
}
