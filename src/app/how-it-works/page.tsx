import { pageMetadata } from "@/lib/seo";
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

export const metadata = pageMetadata("How to Rent an Electric Scooter in Bali", "Choose your dates and electric scooter, review your estimate and confirm with Werigo on WhatsApp. Hotel delivery, charging guidance and local support.", "/how-it-works");

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
    text: "Your motorcycle arrives at your hotel, villa or guesthouse with at least 80% battery. We do a condition walk-around together, fit your helmets, and run through the controls until you're comfortable.",
  },
  {
    icon: KeyRound,
    title: "Ride the island",
    text: "Explore on your own schedule. Two sanitised helmets and an installed phone holder are always included; our team explains the controls and charging before you set off. Claimed range varies with riding conditions.",
  },
  {
    icon: BatteryCharging,
    title: "Charge overnight",
    text: "Charge with the official charger using a suitable outlet at your accommodation. Confirm access with your host and ask us about charging time for your model.",
  },
  {
    icon: MessageCircle,
    title: "Support while you ride",
    text: "Questions about charging, your rental or an extension? Message our local team on WhatsApp, daily from 08:00 to 20:00 WITA.",
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
        <SectionHeading as="h1"
          eyebrow="How it works"
          title="Your ride, from first click to handover."
          lede="Choose your electric scooter, check the estimate and arrange delivery with our local team. Here is what happens next."
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
