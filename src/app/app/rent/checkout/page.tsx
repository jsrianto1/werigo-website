import { Suspense } from "react";
import { CheckoutFlow } from "@/components/booking/CheckoutFlow";
import { GOOGLE_SIGN_IN_ENABLED } from "@/lib/auth";
export default function AppCheckout() {
  return <div className="wr-checkout"><Suspense fallback={<p role="status">Loading your rental…</p>}><CheckoutFlow googleEnabled={GOOGLE_SIGN_IN_ENABLED} bookingBase="/app/rent"/></Suspense></div>;
}
