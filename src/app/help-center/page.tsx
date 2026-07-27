import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Section, SectionHeading } from "@/components/ui/Section";
import { Accordion } from "@/components/ui/Accordion";
import { faqCategories, helpGroups } from "@/data/faqs";
import { buildSupportWhatsAppUrl } from "@/lib/whatsapp";
import { faqSchema, jsonLd } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Help Center — Rental Questions Answered",
  description:
    "Everything about renting an electric motorcycle in Bali with Werigo: reservations, licences, charging, delivery, payments, cancellation and emergency support.",
  alternates: { canonical: "/help-center" },
};

export default function HelpCenterPage() {
  const allItems = faqCategories.flatMap((c) => c.items);

  return (
    <Section>
      <SectionHeading
        eyebrow="Help Center"
        title="Answers before you ask"
        lede="Organised by topic, written plainly. If anything is missing, the team is one WhatsApp message away."
      />

      {/* Group quick-nav */}
      <nav aria-label="Help topics" className="mb-10">
        <ul className="flex flex-wrap gap-2">
          {helpGroups.map((group) => (
            <li key={group.id}>
              <a
                href={`#${group.id}`}
                className="inline-flex min-h-9 items-center rounded-full border border-line bg-card px-4 text-sm font-medium text-ink-soft transition-colors hover:border-primary hover:text-primary"
              >
                {group.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[1fr_300px]">
        <div className="space-y-10">
          {helpGroups.map((group) => {
            const items = group.categoryIds.flatMap(
              (id) => faqCategories.find((c) => c.id === id)?.items ?? []
            );
            return (
              <section key={group.id} id={group.id} aria-labelledby={`${group.id}-title`}>
                <h2
                  id={`${group.id}-title`}
                  className="mb-4 font-display text-2xl text-ink"
                >
                  {group.title}
                </h2>
                <Accordion items={items} />
              </section>
            );
          })}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[14px] border border-line bg-primary-faint p-6">
            <MessageCircle className="h-6 w-6 text-primary" aria-hidden="true" />
            <h2 className="mt-3 font-display text-xl text-ink">Still stuck?</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              Real answers from the Bali team, on the app you already use.
            </p>
            <a
              href={buildSupportWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              WhatsApp us
            </a>
            <p className="mt-3 text-xs text-ink-faint">
              Or use the{" "}
              <Link
                href="/contact"
                className="font-medium text-primary underline underline-offset-2"
              >
                contact page
              </Link>
              .
            </p>
          </div>
        </aside>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(faqSchema(allItems)) }}
      />
    </Section>
  );
}
