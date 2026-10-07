import type { Metadata } from "next";
import { Suspense } from "react";
import { WHATSAPP_FIRST_BOOKING } from "@/lib/bookingMode";
import { getAdmin } from "@/lib/adminAuth";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { AdminShell } from "@/components/admin/AdminShell";
import { CustomersList } from "@/components/admin/CustomersList";

export const metadata: Metadata = {
  title: "Customers Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function Page() {
  if (WHATSAPP_FIRST_BOOKING) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="font-display text-2xl text-ink">Booking database temporarily disabled</h1>
      </div>
    );
  }
  const admin = await getAdmin();
  if (!admin) return <AdminLogin />;
  
  return (
    <AdminShell adminEmail={admin.email} adminName={admin.name} adminRole={admin.role} mustChangePassword={admin.mustChangePassword}>
      <Suspense fallback={null}><CustomersList /></Suspense>
    </AdminShell>
  );
}
