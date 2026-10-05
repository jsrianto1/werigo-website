import type { Metadata } from "next";
import { Section } from "@/components/ui/Section";
import { AccountNav } from "@/components/account/AccountNav";
import { ReferralDashboard } from "@/components/account/ReferralDashboard";
import { requireCustomer } from "@/lib/customerGate";
import { site } from "@/lib/config";

export const metadata: Metadata = {
  title: "Referral",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ReferralPage() {
  const user = await requireCustomer("/account/referral");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || site.baseUrl;
  return (
    <Section className="!py-10">
      <div className="mx-auto max-w-3xl">
        <AccountNav name={user.name} />
        <div className="mt-6">
          <ReferralDashboard siteUrl={siteUrl} />
        </div>
      </div>
    </Section>
  );
}
