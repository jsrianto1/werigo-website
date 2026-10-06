import type { Metadata } from "next";
import { Section } from "@/components/ui/Section";
import { AccountNav } from "@/components/account/AccountNav";
import { BookingsList } from "@/components/account/BookingsList";
import { requireCustomer } from "@/lib/customerGate";

export const metadata: Metadata = {
  title: "My Bookings",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requireCustomer("/account");
  return (
    <Section className="!py-10">
      <div className="mx-auto max-w-3xl">
        <AccountNav name={user.name} />
        <div className="mt-6">
          <BookingsList />
        </div>
      </div>
    </Section>
  );
}
