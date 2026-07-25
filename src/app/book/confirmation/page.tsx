import type { Metadata } from "next";
import { Suspense } from "react";
import { Section } from "@/components/ui/Section";
import { ConfirmationView } from "@/components/booking/ConfirmationView";

export const metadata: Metadata = {
  title: "Booking Confirmed",
  description: "Your Werigo electric motorcycle booking request has been recorded.",
  alternates: { canonical: "/book/confirmation" },
  robots: { index: false, follow: true },
};

export default function ConfirmationPage() {
  return (
    <Section>
      <Suspense
        fallback={
          <div
            className="mx-auto h-96 max-w-2xl animate-pulse rounded-[14px] bg-sunken"
            aria-busy="true"
            aria-label="Loading confirmation"
          />
        }
      >
        <ConfirmationView />
      </Suspense>
    </Section>
  );
}
