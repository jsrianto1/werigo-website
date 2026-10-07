import type { Metadata } from "next";
import { AccountShell } from "@/components/account/AccountShell";
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
    <AccountShell name={user.name} email={user.email} title="Referral" lede="Share your code, your friends save and you earn.">
      <ReferralDashboard siteUrl={siteUrl} />
    </AccountShell>
  );
}
