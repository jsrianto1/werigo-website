import Link from "next/link";
import { ArrowUpRight, CalendarDays, Gift, UserRound, MessageCircle, Compass, Shield, Settings, Download, FileText, LockKeyhole, ClipboardCheck, ChevronRight, BatteryCharging } from "lucide-react";
import { getSessionUser } from "@/lib/session";
import { buildSupportWhatsAppUrl } from "@/lib/whatsapp";
import { AppSignOut } from "@/components/pwa/AppSignOut";
import { AppAppearance } from "@/components/pwa/AppAppearance";
import { PoweredByWedison } from "@/components/pwa/AppBrand";
export const dynamic = "force-dynamic";
export default async function AppAccount() {
  const user = await getSessionUser();
  const staff = user?.role === "admin" || user?.role === "super_admin";
  const profile = staff ? "/admin/profile" : "/app/profile";
  return <section className="wr-reference-account">
    <div className="wr-account-name"><div><h1>{user?.name || "Your account"}</h1><Link className="wr-account-club-chip" href="/app/rewards"><Gift size={13} />Werigo Ride Club</Link></div><Link href={user ? profile : "/app/login"} className="wr-account-avatar" aria-label="Open your profile"><UserRound size={32} /></Link></div>
    {!user && <Link className="wr-account-signin" href="/app/login">Log in or sign up<ArrowUpRight size={18} /></Link>}
    <Link className="wr-account-personal" href={user ? profile : "/app/login"}><span>Personal account<UserRound size={17} /></span><ChevronRight size={19} /></Link>
    <div className="wr-account-quick"><a href={buildSupportWhatsAppUrl()} target="_blank" rel="noopener noreferrer"><MessageCircle size={25} /><span>Help</span></a><Link href="/app/rewards"><Gift size={25} /><span>Ride Points</span></Link><Link href="/app/activity"><CalendarDays size={25} /><span>Bookings</span></Link><Link href={profile}><UserRound size={25} /><span>My details</span></Link></div>
    <Link className="wr-account-privacy" href={profile}><span><strong>Your details, your control.</strong><small>Manage your profile and rider documents.</small></span><ClipboardCheck size={66} strokeWidth={1.3} /></Link>
    <div className="wr-account-rows">
      <Link href={profile}><Settings size={23} /><span>Account settings</span><ChevronRight size={18} /></Link>
      <AppAppearance />
      <Link href="/app/login?install=1"><Download size={23} /><span>Install Werigo</span><ChevronRight size={18} /></Link>
      <Link href="/app/explore"><Compass size={23} /><span>What to do?</span><ChevronRight size={18} /></Link>
      <Link href="/app/charge"><BatteryCharging size={23} /><span>Charging locations</span><ChevronRight size={18} /></Link>
      {staff && <Link href="/admin"><Shield size={23} /><span>Staff dashboard</span><ChevronRight size={18} /></Link>}
      <Link href="/terms"><FileText size={23} /><span>Rental terms</span><ChevronRight size={18} /></Link>
      <Link href="/privacy"><LockKeyhole size={23} /><span>Privacy policy</span><ChevronRight size={18} /></Link>
      <Link href="/"><ArrowUpRight size={23} /><span>Werigo website</span><ChevronRight size={18} /></Link>
    </div>
    {user && <AppSignOut />}
    <div className="wr-account-endorsement"><PoweredByWedison /></div>
  </section>;
}
