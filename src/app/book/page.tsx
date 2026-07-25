import type { Metadata } from "next";
import { Suspense } from "react";
import { Section } from "@/components/ui/Section";
import { BookSearchResults } from "@/components/booking/BookSearchResults";

export const metadata: Metadata = {
  title: "Book Your Electric Motorcycle — Bali Rental Search",
  description:
    "Search Werigo's electric motorcycle availability in Bali. Choose your delivery area and dates, compare models and book online in minutes.",
  alternates: { canonical: "/book" },
};

export default function BookPage() {
  return (
    <Section>
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
