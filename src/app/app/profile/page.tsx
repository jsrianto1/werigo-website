import Link from "next/link";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/account/ProfileForm";
import { IdentityForm } from "@/components/account/IdentityForm";
import { getSessionUser } from "@/lib/session";
export const dynamic = "force-dynamic";
export default async function AppProfile() {
  const user = await getSessionUser();
  if (!user) redirect("/app/login?next=/app/profile");
  if (user.role === "admin" || user.role === "super_admin") return <><h1 className="ra-page-title">Staff profile</h1><p className="ra-lead">Staff accounts are managed in the admin dashboard.</p><Link href="/admin/profile" className="ra-button">Open staff profile</Link></>;
  return <><h1 className="ra-page-title">My details</h1><p className="ra-lead">Your contact information and rider documents.</p><ProfileForm user={{ name: user.name, email: user.email, emailVerified: user.emailVerified, phone: user.phone ?? null, nationality: user.nationality ?? null }}/><div className="mt-8"><IdentityForm/></div></>;
}
