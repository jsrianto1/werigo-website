import { site } from "@/lib/config";
import { pageMetadata } from "@/lib/seo";
import { Leaf, MapPin, ShieldCheck, Zap } from "lucide-react";
import { Section, SectionHeading } from "@/components/ui/Section";
import { RouteLine } from "@/components/ui/RouteLine";
import { ButtonLink } from "@/components/ui/Button";
import { MediaImage } from "@/components/media/MediaImage";

export const metadata = pageMetadata("About Werigo: Electric Scooter Rentals in Bali", "Meet Werigo, powered by Wedison. Official electric motorcycles for your Bali holiday or longer stay, with hotel delivery and a local WhatsApp team.", "/about");

const values = [
  {
    icon: Leaf,
    title: "The island comes first",
    text: "Bali gives its visitors everything. Electric riding is how we give something back. It leaves no exhaust in the rice fields and no engine noise over the temple bells.",
  },
  {
    icon: ShieldCheck,
    title: "Honesty over hype",
    text: "Official model specifications and an itemised quote before you confirm. Our team explains the rental, delivery and any optional extras.",
  },
  {
    icon: MapPin,
    title: "Local to the core",
    text: "Our Bali team handles delivery, handover and WhatsApp support. You can reach us daily from 08:00 to 20:00 WITA.",
  },
  {
    icon: Zap,
    title: "Premium means taken care of",
    text: "At least 80% battery at handover, two sanitised helmets and a practical briefing. Start your rental knowing your motorcycle and how to charge it.",
  },
];

export default function AboutPage() {
  return (
    <>
      <Section className="!pb-8">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeading as="h1"
              eyebrow="About Werigo · Powered by Wedison"
              title="A Bali ride, backed by people here."
              lede="Official Wedison electric motorcycles, a local rental team and a handover at your hotel or villa."
            />
            <p className="max-w-xl leading-relaxed text-ink-soft">
              Werigo is Wedison&apos;s electric motorcycle rental and mobility
              service in Bali. We rent official Wedison electric motorcycles with
              honest specs, delivered to your door and backed by a local team
              on WhatsApp. Werigo is now live in Bali. Book your electric
              ride and explore the island with quiet, powerful mobility.
            </p>
            <address className="mt-5 max-w-xl text-sm not-italic leading-relaxed text-ink-soft">
              <a href={site.mapsUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{site.address.display}</a>
            </address>
            <div className="mt-8">
              <ButtonLink href="/fleet" variant="primary" size="lg">
                Meet the fleet
              </ButtonLink>
            </div>
          </div>
          <MediaImage
            id="fleet-athena-main"
            fallbackLabel="Official Wedison Athena motorcycle"
            fit="contain"
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
