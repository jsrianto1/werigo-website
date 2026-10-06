import type { Metadata } from "next";
import { getAdmin } from "@/lib/adminAuth";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { AdminShell } from "@/components/admin/AdminShell";
import { MembershipManager } from "@/components/admin/MembershipManager";
export const metadata:Metadata={title:"Membership Admin",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export default async function MembershipAdminPage(){
  const admin=await getAdmin();if(!admin)return <AdminLogin/>;
  return <AdminShell adminEmail={admin.email} adminRole={admin.role} mustChangePassword={admin.mustChangePassword}><MembershipManager canAdjust={admin.role==="super_admin"}/></AdminShell>;
}
