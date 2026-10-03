import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Section } from "@/components/ui/Section";
import { AccountNav } from "@/components/account/AccountNav";
import { BookingsList } from "@/components/account/BookingsList";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "My Bookings",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) redirect("/account/login?next=/account");
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
