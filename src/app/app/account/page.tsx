import Link from "next/link";
import { ArrowUpRight, CalendarDays, Gift, UserRound, MessageCircle, Compass, Shield } from "lucide-react";
import { getSessionUser } from "@/lib/session";
import { buildSupportWhatsAppUrl } from "@/lib/whatsapp";
import { AppSignOut } from "@/components/pwa/AppSignOut";
export const dynamic = "force-dynamic";
export default async function AppAccount() {
  const user = await getSessionUser();
  const staff = user?.role === "admin" || user?.role === "super_admin";
  return <><p className="ra-eyebrow">Your Werigo account</p><h1 className="ra-page-title">{user ? `Hi, ${user.name.split(" ")[0]}.` : "Let’s make it your ride."}</h1><p className="ra-lead">One account for your rentals, Ride Points and details.</p>{!user && <Link className="ra-button" href="/app/login">Sign in or create an account <ArrowUpRight size={18}/></Link>}<div className="ra-account-links">{[
    { href: "/app/activity", title: "My bookings", detail: "Upcoming rentals, payment status & history", icon: CalendarDays },
    { href: "/app/rewards", title: "Ride Club", detail: "Your points, membership & rewards history", icon: Gift },
    { href: staff ? "/admin/profile" : "/app/profile", title: "My details", detail: "Contact information & rider documents", icon: UserRound },
    { href: "/app/explore", title: "Explore Bali", detail: "Ideas for your next day out", icon: Compass },
  ].map(item => <Link href={item.href} key={item.title}><item.icon size={23}/><div><h2>{item.title}</h2><p>{item.detail}</p></div><ArrowUpRight size={20}/></Link>)}{staff && <Link href="/admin"><Shield size={23}/><div><h2>Staff dashboard</h2><p>Manage customer rentals</p></div><ArrowUpRight size={20}/></Link>}<a href={buildSupportWhatsAppUrl()} target="_blank" rel="noopener noreferrer"><MessageCircle size={23}/><div><h2>Help from Werigo</h2><p>WhatsApp · daily 08:00–20:00 WITA</p></div><ArrowUpRight size={20}/></a></div>{user && <AppSignOut/>}<p className="ra-footnote"><Link href="/terms">Rental terms</Link> · <Link href="/privacy">Privacy policy</Link> · <Link href="/">Werigo website</Link></p></>;
}
