import type { Metadata } from "next";
import { getAdmin } from "@/lib/adminAuth";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const metadata: Metadata = {
  title: "Bookings Admin",
  robots: { index: false, follow: false },
};

// Always evaluated per-request: the admin gate must never be cached.
export const dynamic = "force-dynamic";

export default async function AdminBookingsPage() {
  const admin = await getAdmin();
  if (!admin) {
    return <AdminLogin />;
  }
  return <AdminDashboard adminEmail={admin.email} />;
}
