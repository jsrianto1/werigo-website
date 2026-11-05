import type { Metadata } from "next";
import { getAdmin } from "@/lib/adminAuth";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { AdminShell } from "@/components/admin/AdminShell";
import { ContentManager } from "@/components/admin/ContentManager";

export const metadata: Metadata = { title: "Content Studio", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ContentPage() {
  const admin = await getAdmin();
  if (!admin) return <AdminLogin/>;
  return <AdminShell adminEmail={admin.email} adminName={admin.name} adminRole={admin.role} mustChangePassword={admin.mustChangePassword}>
    <ContentManager superAdmin={admin.role === "super_admin"}/>
  </AdminShell>;
}
