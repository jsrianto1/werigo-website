import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getSessionUser } from "@/lib/session";
import { BookingsList } from "@/components/account/BookingsList";
export const dynamic = "force-dynamic";
export default async function AppActivity() {
  const user = await getSessionUser();
  const staff = user?.role === "admin" || user?.role === "super_admin";
  return <section className="wr-reference-activity"><h1 className="ra-page-title">Activity</h1>{user && !staff ? <BookingsList bookingBase="/app/rent" appMode /> : <section className="wr-activity-signed-out"><h2>Your rentals</h2><p>{staff ? "You’re signed in as staff. Manage customer bookings in the staff dashboard." : "Log in to see your upcoming rentals and past rides."}</p><Link className="ra-button" href={staff ? "/admin" : "/app/login?next=/app/activity"}>{staff ? "Open staff dashboard" : "Log in to see activity"}<ArrowRight size={18} /></Link></section>}</section>;
}
