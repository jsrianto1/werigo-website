import type { Metadata } from "next";
import { WHATSAPP_FIRST_BOOKING } from "@/lib/bookingMode";
import { getAdmin } from "@/lib/adminAuth";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminShell } from "@/components/admin/AdminShell";

export const metadata: Metadata = {
  title: "Bookings Admin",
  robots: { index: false, follow: false },
};

// Always evaluated per-request: the admin gate must never be cached.
export const dynamic = "force-dynamic";

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; payment?: string }>;
}) {
  // WhatsApp-only mode: booking storage is disconnected. Render the
  // internal notice before any database call (including auth) happens.
  if (WHATSAPP_FIRST_BOOKING) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="font-display text-2xl text-ink">
          Booking database temporarily disabled
        </h1>
        <p className="mt-3 text-sm text-ink-soft">
          Public booking requests are being handled directly through
          WhatsApp while the database is disconnected. The admin dashboard
          will return when storage is reactivated (see README, Booking
          database).
        </p>
      </div>
    );
  }

  const admin = await getAdmin();
  if (!admin) {
    return <AdminLogin />;
  }
  const { q, status, payment } = await searchParams;
  return (
    <AdminShell adminEmail={admin.email} adminRole={admin.role}>
      <AdminDashboard
        adminRole={admin.role}
        initialFilters={{ search: q ?? "", status: status ?? "", paymentStatus: payment ?? "" }}
      />
    </AdminShell>
  );
}
