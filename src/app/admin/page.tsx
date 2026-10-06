import type { Metadata } from "next";
import { WHATSAPP_FIRST_BOOKING } from "@/lib/bookingMode";
import { getAdmin } from "@/lib/adminAuth";
import { getAdminOverview, type AdminOverview } from "@/lib/adminOverview";
import { logStorageError, storageErrorFromThrown } from "@/lib/storageErrors";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminHome } from "@/components/admin/AdminHome";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

// Always evaluated per-request: the admin gate must never be cached.
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (WHATSAPP_FIRST_BOOKING) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="font-display text-2xl text-ink">Booking database temporarily disabled</h1>
      </div>
    );
  }
  const admin = await getAdmin();
  if (!admin) return <AdminLogin />;

  let overview: AdminOverview | null = null;
  try {
    overview = await getAdminOverview();
  } catch (err) {
    logStorageError(storageErrorFromThrown("admin_overview", err));
  }

  return (
    <AdminShell adminEmail={admin.email} adminRole={admin.role}>
      <AdminHome name={admin.name} role={admin.role} overview={overview} />
    </AdminShell>
  );
}
