import type { Metadata } from "next";
import { Leaf, MapPin, ShieldCheck, Zap } from "lucide-react";
import { Section, SectionHeading } from "@/components/ui/Section";
import { RouteLine } from "@/components/ui/RouteLine";
import { ButtonLink } from "@/components/ui/Button";
import { MediaImage } from "@/components/media/MediaImage";

export const metadata: Metadata = {
  title: "About Werigo, Electric Mobility for Bali",
  description:
    "Werigo is Wedison's electric motorcycle rental and mobility service in Bali, built on a simple idea: exploring the island shouldn't cost the island. Meet the brand and its mission.",
  alternates: { canonical: "/about" },
};

const values = [
  {
    icon: Leaf,
    title: "The island comes first",
    text: "Bali gives its visitors everything. Electric riding is how we give something back. It leaves no exhaust in the rice fields and no engine noise over the temple bells.",
  },
  {
    icon: ShieldCheck,
    title: "Honesty over hype",
    text: "Real-world range figures, complete pricing before you book, and no invented reviews or inflated claims. If we haven't earned it yet, we don't publish it.",
  },
  {
    icon: MapPin,
    title: "Local to the core",
    text: "Our team lives and rides here. Delivery windows, road advice and support all come from people who know exactly which gang floods in the rain.",
  },
  {
    icon: Zap,
    title: "Premium means taken care of",
    text: "Charged batteries, fitted helmets and one WhatsApp thread for everything. For us, premium means you never have to think about the machine.",
  },
];

export default function AboutPage() {
  return (
    <>
      <Section className="!pb-8">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeading
              eyebrow="About Werigo · Powered by Wedison"
              title="Exploring the island shouldn't cost the island"
              lede="Bali mostly gets explored with engines running, and the island feels it. We think it deserves a quieter ride."
            />
            <p className="max-w-xl leading-relaxed text-ink-soft">
              Werigo is Wedison&apos;s electric motorcycle rental and mobility
              service in Bali. We rent official Wedison electric motorcycles with
              honest specs, delivered to your door and backed by a local team
              on WhatsApp. Werigo is now live in Bali. Book your electric
              ride and explore the island with quiet, powerful mobility.
            </p>
            <div className="mt-8">
              <ButtonLink href="/fleet" variant="primary" size="lg">
                Meet the fleet
              </ButtonLink>
            </div>
          </div>
          <MediaImage
            id="about-team"
            fallbackLabel="Werigo team & fleet photo"
            ratio="4/3"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>
      </Section>
      <RouteLine />

      <Section tone="wash" labelledBy="values-heading">
        <SectionHeading
          eyebrow="What we stand for"
          title="Four promises we build everything on"
          id="values-heading"
        />
        <div className="grid gap-6 sm:grid-cols-2">
          {values.map((value) => (
            <div
              key={value.title}
              className="rounded-[14px] border border-line bg-card p-6"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary-soft text-primary">
                <value.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-display text-xl text-ink">{value.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{value.text}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section labelledBy="story-heading">
        <div className="mx-auto max-w-2xl">
          <SectionHeading
            eyebrow="The story"
            title="Why 'Werigo'?"
            id="story-heading"
          />
          <div className="space-y-4 leading-relaxed text-ink-soft">
            <p>
              The name comes from the simplest travel sentence there is:{" "}
              <em className="font-medium text-ink">“where we go.”</em> It&apos;s the
              question every good Bali morning starts with. Coffee first, then
              a map, then the keys.
            </p>
            <p>
              Our answer is anywhere, quietly. The company story of the
              founders, the first bikes and the milestones will be told here as
              it actually happens. We&apos;d rather leave this space honest
              than fill it with an invented history.
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}
