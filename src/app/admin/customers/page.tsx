import type { Metadata } from "next";
import { getAdmin } from "@/lib/adminAuth";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { CustomerDashboard } from "@/components/admin/CustomerDashboard";
import { LEAD_CAPTURE_ENABLED } from "@/lib/leadCaptureMode";

export const metadata: Metadata = {
  title: "Customers Admin",
  robots: { index: false, follow: false },
};

// Always evaluated per-request: the admin gate must never be cached.
export const dynamic = "force-dynamic";

/**
 * Customer database. Unlike /admin/bookings this screen is not tied
 * to the booking mode: form capture runs while bookings are handled
 * on WhatsApp.
 */
export default async function AdminCustomersPage() {
  if (!LEAD_CAPTURE_ENABLED) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="font-display text-2xl text-ink">
          Customer capture is switched off
        </h1>
        <p className="mt-3 text-sm text-ink-soft">
          LEAD_CAPTURE=off is set on this deployment, so no form
          submissions are being stored. Remove the variable to start
          recording again (see README, Customer database).
        </p>
      </div>
    );
  }

  const admin = await getAdmin();
  if (!admin) {
    return <AdminLogin />;
  }
  return <CustomerDashboard adminEmail={admin.email} />;
}
