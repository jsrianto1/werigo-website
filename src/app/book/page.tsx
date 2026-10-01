import { T } from "@/components/i18n/LanguageProvider";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Section } from "@/components/ui/Section";
import { BookSearchResults } from "@/components/booking/BookSearchResults";

export const metadata: Metadata = {
  title: "Book Your Electric Motorcycle in Bali",
  description:
    "Book a Wedison electric scooter in Bali. Choose your area and dates, compare rental rates and confirm availability with Werigo on WhatsApp.",
  alternates: { canonical: "/book" },
};

export default function BookPage() {
  return (
    <Section>
      <div className="mx-auto mb-8 max-w-3xl">
        <h1 className="font-display text-3xl text-ink md:text-4xl"><T>Book an electric scooter in Bali</T></h1>
        <p className="mt-3 text-ink-soft"><T>Choose your delivery area and rental dates, then compare Wedison models and daily, weekly or monthly rates. Minimum rental is 2 days. Our team confirms availability and your final quote on WhatsApp.</T></p>
      </div>
      <Suspense
        fallback={
          <div className="space-y-4" aria-busy="true" aria-label="Loading search">
            <div className="h-8 w-64 animate-pulse rounded-md bg-sunken" />
            <div className="h-64 animate-pulse rounded-[14px] bg-sunken" />
          </div>
        }
      >
        <BookSearchResults />
      </Suspense>
    </Section>
  );
}
