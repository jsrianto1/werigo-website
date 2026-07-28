import type { Metadata } from "next";
import {
  CalendarCheck,
  Truck,
  KeyRound,
  BatteryCharging,
  MessageCircle,
  Undo2,
  ShieldCheck,
  FileCheck,
} from "lucide-react";
import { Section, SectionHeading } from "@/components/ui/Section";
import { RouteLine } from "@/components/ui/RouteLine";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "How It Works: Electric Motorcycle Rental Made Simple",
  description:
    "How renting an electric motorcycle with Werigo works: book online, get free hotel delivery in Bali, ride with overnight charging, and hand back at collection. Step by step.",
  alternates: { canonical: "/how-it-works" },
};

const journey = [
  {
    icon: CalendarCheck,
    title: "Book online in minutes",
    text: "Choose your delivery area, dates and model. Add extras if you need them, tell us where you're staying, and send your request. It opens in WhatsApp and our team replies with availability and your quote.",
  },
  {
    icon: FileCheck,
    title: "We confirm the details",
    text: "A real person checks availability, your delivery window and any special requests, such as flight numbers, second riders or early starts. You approve the final quote before anything is fixed.",
  },
  {
    icon: Truck,
    title: "Delivery to your door",
    text: "Your motorcycle arrives at your hotel, villa or guesthouse fully charged. We do a condition walk-around together, fit your helmets, and run through the controls until you're comfortable.",
  },
  {
    icon: KeyRound,
    title: "Ride the island",
    text: "Explore on your own schedule. Two helmets, a phone holder and a rain poncho are always included; the range figures we quote are honest Bali numbers, not brochure optimism.",
  },
  {
    icon: BatteryCharging,
    title: "Charge overnight",
    text: "Plug into any standard outlet at your accommodation, the same way you charge your phone. A full overnight charge covers a typical exploring day twice over.",
  },
  {
    icon: MessageCircle,
    title: "Support while you ride",
    text: "Questions, extensions, a puncture or a battery worry? Message the team on WhatsApp. Emergencies get a dedicated line, printed on your key tag.",
  },
  {
    icon: Undo2,
    title: "Easy return or collection",
    text: "We collect from where you're staying, or from a different area if you booked a one-way. Quick check together, written confirmation on WhatsApp, done.",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <Section className="!pb-6">
        <SectionHeading
          eyebrow="How it works"
          title="From booking to open road, without the friction"
          lede="Renting with Werigo is designed around one idea: your holiday time is too valuable for queues, paperwork and fuel stations."
        />
      </Section>
      <RouteLine />

      <Section className="!pt-8">
        <ol className="relative mx-auto max-w-3xl space-y-8">
          {journey.map((step, i) => (
            <li key={step.title} className="relative flex gap-5">
              {/* connector */}
              {i < journey.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="absolute left-[22px] top-14 h-[calc(100%-24px)] w-px bg-line-strong"
                />
              ) : null}
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                <step.icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="pb-2">
                <p className="tnum text-xs font-semibold uppercase tracking-wider text-ink-faint">
                  Step {i + 1}
                </p>
                <h2 className="mt-1 font-display text-xl text-ink">{step.title}</h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
                  {step.text}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section tone="wash" labelledBy="requirements-heading">
        <div className="mx-auto max-w-3xl">
          <SectionHeading
            eyebrow="Before you book"
            title="What you'll need"
            id="requirements-heading"
          />
          <ul className="grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: FileCheck,
                title: "A valid licence",
                text: "An International Driving Permit with motorcycle endorsement, carried with your home licence.",
              },
              {
                icon: ShieldCheck,
                title: "18 or older",
                text: "All riders must be at least 18. Second riders can be added in the booking notes.",
              },
              {
                icon: MessageCircle,
                title: "A WhatsApp number",
                text: "It's how we confirm bookings, coordinate delivery and support you on the road.",
              },
              {
                icon: KeyRound,
                title: "Somewhere to charge",
                text: "Any standard power outlet at your accommodation does the job overnight.",
              },
            ].map((req) => (
              <li key={req.title} className="rounded-[14px] border border-line bg-card p-5">
                <req.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                <h3 className="mt-3 font-semibold text-ink">{req.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">{req.text}</p>
              </li>
            ))}
          </ul>
          <div className="mt-10 text-center">
            <ButtonLink href="/book" variant="accent" size="lg">
              Start your booking
            </ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}
