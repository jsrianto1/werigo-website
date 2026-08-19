import type { Metadata } from "next";
import { ArrowRight, MessageCircle } from "lucide-react";
import { Section, SectionHeading } from "@/components/ui/Section";
import { RouteLine } from "@/components/ui/RouteLine";
import { ButtonLink } from "@/components/ui/Button";
import { Accordion } from "@/components/ui/Accordion";
import { RidingMotorcycle } from "@/components/ui/RidingMotorcycle";
import {
  partnerCommissionRate,
  partnerTypes,
  partnerSteps,
  partnerBenefits,
} from "@/data/partners";
import { buildPartnerApplicationWhatsAppUrl } from "@/lib/whatsapp";
import { faqSchema, jsonLd } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Partner Program for Hotels, Villas and Tour Operators",
  description:
    "Refer your guests to Werigo electric motorcycle rental in Bali and earn a 10% commission on every completed rental. Apply on WhatsApp in a few minutes.",
  alternates: { canonical: "/partners" },
};

const partnerFaq = [
  {
    question: "Who can join the Werigo Partner Program?",
    answer:
      "Hotels, villas, guesthouses, tour operators and travel agents in Bali who want to offer their guests electric motorcycle rental. Message us on WhatsApp and we'll confirm whether your property or business fits the program.",
  },
  {
    question: "How much commission do I earn?",
    answer: `You earn ${partnerCommissionRate} on every rental completed through your referral code. There's no cost to join and nothing to purchase or stock.`,
  },
  {
    question: "How does Werigo know a booking came from me?",
    answer:
      "Once you're approved, we give you a personal referral code. Your guest mentions it or enters it as their promo code when they book, and it's included in their request so our team can attribute the commission to you.",
  },
  {
    question: "Do I need to manage bookings or the motorcycles myself?",
    answer:
      "No. Werigo confirms availability, delivers the motorcycle with at least 80% battery and supports the guest on WhatsApp for the whole rental. Your part is the referral.",
  },
  {
    question: "How and when do I get paid?",
    answer:
      "Payout details are confirmed with you directly on WhatsApp once you're approved as a partner.",
  },
];

export default function PartnersPage() {
  return (
    <>
      {/* ===== Hero ===== */}
      <div className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 -z-10 h-[420px] bg-gradient-to-b from-primary-soft/80 via-primary-faint to-page"
        />
        <Section className="!pb-10">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow mx-auto mb-4">
              Werigo Partner Program
            </p>
            <h1 className="font-display text-4xl leading-[1.08] text-ink sm:text-5xl">
              Refer your guests, earn on every ride
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
              If your guests ask you how to get around Bali, you can give
              them an answer that pays you back. Refer them to Werigo and
              earn a {partnerCommissionRate} commission on every completed
              rental.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a
                href={buildPartnerApplicationWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-[10px] bg-accent px-7 text-base font-semibold text-white transition-colors hover:bg-accent-strong"
              >
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
                Apply on WhatsApp
              </a>
              <a
                href="#how-it-works"
                className="inline-flex min-h-12 items-center gap-2 rounded-[10px] border border-line-strong px-6 text-base font-semibold text-ink transition-colors hover:border-primary hover:text-primary"
              >
                See how it works
              </a>
            </div>
          </div>
        </Section>
        <RouteLine className="-mt-2" />
      </div>

      {/* ===== Who it's for ===== */}
      <Section labelledBy="who-heading">
        <SectionHeading
          eyebrow="Who it's for"
          title="Built for the people already hosting your guests"
          lede="If guests come to you asking about getting around Bali, this program is for you."
          id="who-heading"
        />
        <ul className="grid gap-5 sm:grid-cols-3">
          {partnerTypes.map((type) => (
            <li
              key={type.id}
              className="rounded-[14px] border border-line bg-card p-6 transition-shadow hover:shadow-[0_12px_32px_-18px_rgba(14,43,39,0.35)]"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-soft text-primary">
                <type.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-display text-xl text-ink">
                {type.label}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                {type.description}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      {/* ===== How it works ===== */}
      <Section tone="wash" labelledBy="how-heading" id="how-it-works">
        <SectionHeading
          eyebrow="How it works"
          title="From application to your first commission"
          id="how-heading"
        />
        <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {partnerSteps.map((step, i) => (
            <li
              key={step.title}
              className="rounded-[14px] border border-line bg-card p-6"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white">
                  <step.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="tnum text-sm font-semibold text-ink-faint">
                  Step {i + 1}
                </span>
              </div>
              <h3 className="mt-4 font-display text-xl text-ink">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                {step.text}
              </p>
            </li>
          ))}
        </ol>
      </Section>

      {/* ===== What you get ===== */}
      <Section labelledBy="benefits-heading">
        <SectionHeading
          eyebrow="What you get"
          title="A commission, not a chore"
          lede="No inventory, no charging, no maintenance. You refer, we handle the rest."
          id="benefits-heading"
        />
        <ul className="grid gap-6 sm:grid-cols-3">
          {partnerBenefits.map((benefit) => (
            <li
              key={benefit.title}
              className="rounded-[14px] border border-line bg-card p-6"
            >
              <benefit.icon className="h-6 w-6 text-accent" aria-hidden="true" />
              <h3 className="mt-3 font-display text-xl text-ink">
                {benefit.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                {benefit.text}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <RidingMotorcycle />

      {/* ===== FAQ ===== */}
      <Section tone="wash" labelledBy="partner-faq-heading">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr]">
          <SectionHeading
            eyebrow="Questions"
            title="Partner Program, explained"
            id="partner-faq-heading"
          />
          <Accordion items={partnerFaq} />
        </div>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(faqSchema(partnerFaq)) }}
        />
      </Section>

      {/* ===== Final CTA ===== */}
      <Section labelledBy="partner-cta-heading">
        <div className="relative overflow-hidden rounded-[14px] bg-primary px-6 py-14 text-center sm:px-12">
          <RouteLine className="absolute inset-x-0 top-4 opacity-40" />
          <h2
            id="partner-cta-heading"
            className="font-display text-3xl leading-tight text-white md:text-4xl"
          >
            Your next guest question could earn you a commission
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-white/85">
            Message our team on WhatsApp to apply. Most partners are set up
            with a referral code the same day.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href={buildPartnerApplicationWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-[10px] bg-accent px-7 text-base font-semibold text-white transition-colors hover:bg-accent-strong"
            >
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
              Apply on WhatsApp
            </a>
            <ButtonLink
              href="/fleet"
              size="lg"
              className="!bg-white/10 !text-white hover:!bg-white/20"
            >
              Browse the fleet
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}
