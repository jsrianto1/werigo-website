import Link from "next/link";
import { CalendarDays, ArrowRight } from "lucide-react";
import { getSessionUser } from "@/lib/session";
import { BookingsList } from "@/components/account/BookingsList";
export const dynamic = "force-dynamic";
export default async function AppActivity() {
  const user = await getSessionUser();
  const staff = user?.role === "admin" || user?.role === "super_admin";
  return <><p className="ra-eyebrow">Your rentals</p><h1 className="ra-page-title">My bookings</h1><p className="ra-lead">Rental details, payment status and past rides, all in one place.</p>{user && !staff ? <BookingsList bookingBase="/app/rent"/> : <section className="wr-activity-empty"><CalendarDays size={42}/><h2>{staff ? "You’re signed in as staff." : "Your next ride starts here."}</h2><p>{staff ? "Manage customer bookings in the staff dashboard. Customer accounts see their own rental history here." : "Sign in to see your bookings and payment status. You can browse bikes and prices before creating an account."}</p><Link className="ra-button" href={staff ? "/admin" : "/app/login?next=/app/activity"}>{staff ? "Open staff dashboard" : "Sign in to see bookings"}<ArrowRight size={18}/></Link></section>}</>;
}
