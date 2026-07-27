import type { Metadata } from "next";
import { Suspense } from "react";
import { Section } from "@/components/ui/Section";
import { CheckoutFlow } from "@/components/booking/CheckoutFlow";

export const metadata: Metadata = {
  title: "Checkout: Complete Your Booking",
  description:
    "Add extras, enter your details and review your Werigo electric motorcycle booking.",
  alternates: { canonical: "/book/checkout" },
  robots: { index: false, follow: true },
};

export default function CheckoutPage() {
  return (
    <Section>
      <Suspense
        fallback={
          <div className="space-y-4" aria-busy="true" aria-label="Loading checkout">
            <div className="h-8 w-64 animate-pulse rounded-md bg-sunken" />
            <div className="h-96 animate-pulse rounded-[14px] bg-sunken" />
          </div>
        }
      >
        <CheckoutFlow />
      </Suspense>
    </Section>
  );
}
