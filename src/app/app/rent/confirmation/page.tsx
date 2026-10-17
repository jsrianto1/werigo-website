import { Suspense } from "react";
import { ConfirmationView } from "@/components/booking/ConfirmationView";
export default function AppConfirmation() {
  return <Suspense fallback={<p role="status">Loading your booking…</p>}><ConfirmationView bookingBase="/app/rent" accountPath="/app/activity" loginPath="/app/login"/></Suspense>;
}
