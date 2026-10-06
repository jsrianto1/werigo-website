import type { Metadata } from "next";
import { WHATSAPP_FIRST_BOOKING } from "@/lib/bookingMode";
import { getAdmin } from "@/lib/adminAuth";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { AdminShell } from "@/components/admin/AdminShell";
import { CustomerDetail } from "@/components/admin/CustomerDetail";

export const metadata: Metadata = {
  title: "Customer Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  if (WHATSAPP_FIRST_BOOKING) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="font-display text-2xl text-ink">Booking database temporarily disabled</h1>
      </div>
    );
  }
  const admin = await getAdmin();
  if (!admin) return <AdminLogin />;
  const { id } = await params;
  return (
    <AdminShell adminEmail={admin.email} adminRole={admin.role} mustChangePassword={admin.mustChangePassword}>
      <CustomerDetail id={id} />
    </AdminShell>
  );
}
