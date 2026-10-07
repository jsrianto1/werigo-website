import type { Metadata } from "next";
import { AccountShell } from "@/components/account/AccountShell";
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
    <AccountShell name={user.name} email={user.email} title="My bookings" lede="Pay, see details or message us about any booking.">
      <BookingsList />
    </AccountShell>
  );
}
