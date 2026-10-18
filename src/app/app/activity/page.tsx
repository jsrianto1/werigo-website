import Link from "next/link";
import { ArrowRight, Route } from "lucide-react";
import { getSessionUser } from "@/lib/session";
import { BookingsList } from "@/components/account/BookingsList";
export const dynamic = "force-dynamic";
export default async function AppActivity() {
  const user = await getSessionUser();
  const staff = user?.role === "admin" || user?.role === "super_admin";
  return <section className="wr-reference-activity"><p className="wg-overline">YOUR WERIGO JOURNEY</p><h1 className="ra-page-title">My rides.</h1>{user && !staff ? <BookingsList bookingBase="/app/rent" appMode /> : <section className="wr-activity-signed-out wg-rides-empty"><span className="wg-empty-symbol"><Route size={42}/></span><h2>Your next chapter<br/>starts with a ride.</h2><p>{staff ? "You’re signed in as staff. Manage customer bookings in the staff dashboard." : "Your upcoming rentals and past rides belong here. Log in to pick up where you left off."}</p><Link className="ra-button" href={staff ? "/admin" : "/app/login?next=/app/activity"}>{staff ? "Open staff dashboard" : "Log in to see my rides"}<ArrowRight size={18} /></Link></section>}</section>;
}
