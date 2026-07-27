import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, MapPin, Truck, Compass, Bike } from "lucide-react";
import { Section, SectionHeading } from "@/components/ui/Section";
import { RidingMotorcycle } from "@/components/ui/RidingMotorcycle";
import { AreaImage } from "@/components/areas/AreaImage";
import { getAreaMedia } from "@/data/areaMedia";
import { VehicleCard } from "@/components/fleet/VehicleCard";
import { ButtonLink } from "@/components/ui/Button";
import { serviceAreas, getArea } from "@/data/locations";
import { getPrimaryCards } from "@/data/vehicles";

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return serviceAreas.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const area = getArea(slug);
  if (!area) return {};
  return {
    title: `Scooter Rental ${area.name} with Electric Motorcycle Delivery`,
    description: `Rent an electric scooter in ${area.name}, Bali with Werigo. ${
      area.deliveryFee === 0 ? "Free delivery" : "Delivery"
    } to your hotel or villa, ${area.deliveryWindow.toLowerCase()}. Book online.`,
    alternates: { canonical: `/delivery-areas/${slug}` },
    openGraph: getAreaMedia(slug)
      ? {
          images: [
            {
              url: getAreaMedia(slug)!.src,
              width: getAreaMedia(slug)!.width,
              height: getAreaMedia(slug)!.height,
              alt: getAreaMedia(slug)!.alt,
            },
          ],
        }
      : undefined,
  };
}

export default async function AreaPage({ params }: Props) {
  const { slug } = await params;
  const area = getArea(slug);
  if (!area) notFound();

  const featured = getPrimaryCards().slice(0, 3);

  return (
    <>
      <Section className="!pb-10">
        <nav aria-label="Breadcrumb" className="mb-8">
          <ol className="flex items-center gap-1.5 text-sm text-ink-faint">
            <li>
              <Link href="/" className="transition-colors hover:text-primary">
                Home
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-3.5 w-3.5" />
            </li>
            <li>
              <Link
                href="/delivery-areas"
                className="transition-colors hover:text-primary"
              >
                Delivery Areas
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-3.5 w-3.5" />
            </li>
            <li aria-current="page" className="font-medium text-ink">
              {area.name}
            </li>
          </ol>
        </nav>

        <AreaImage
          slug={slug}
          variant="hero"
          priority
          className="mb-10 h-64 sm:h-80 lg:h-96"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/80">
            Electric scooter rental · Powered by Wedison
          </p>
          <h1 className="mt-1 font-display text-4xl leading-tight text-white md:text-5xl">
            {area.name}
          </h1>
        </AreaImage>

        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="text-lg font-medium text-ink">{area.vibe}</p>
            <p className="mt-5 max-w-2xl leading-relaxed text-ink-soft">
              {area.description}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/book" variant="accent" size="lg">
                Check availability in {area.name}
              </ButtonLink>
            </div>
          </div>

          <div className="space-y-4 lg:pt-10">
            <div className="rounded-[14px] border border-line bg-card p-5">
              <h2 className="flex items-center gap-2 font-semibold text-ink">
                <Truck className="h-4 w-4 text-primary" aria-hidden="true" />
                Delivery in {area.name}
              </h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-soft">Fee</dt>
                  <dd className="font-semibold text-ink">
                    {area.deliveryFee === 0 ? (
                      <span className="text-ok">Free</span>
                    ) : (
                      <span>Confirmed with your quote</span>
                    )}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-soft">Window</dt>
                  <dd className="tnum text-right font-medium text-ink">
                    {area.deliveryWindow}
                  </dd>
                </div>
              </dl>
            </div>
            <div className="rounded-[14px] border border-line bg-card p-5">
              <h2 className="flex items-center gap-2 font-semibold text-ink">
                <Bike className="h-4 w-4 text-primary" aria-hidden="true" />
                Riding notes
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                {area.ridingNotes}
              </p>
            </div>
          </div>
        </div>
      </Section>

      <Section tone="wash" labelledBy="landmarks-heading" className="!py-14">
        <h2
          id="landmarks-heading"
          className="flex items-center gap-2 font-display text-2xl text-ink"
        >
          <Compass className="h-5 w-5 text-primary" aria-hidden="true" />
          Worth riding to
        </h2>
        <ul className="mt-5 flex flex-wrap gap-2.5">
          {area.landmarks.map((landmark) => (
            <li
              key={landmark}
              className="flex items-center gap-1.5 rounded-full border border-line bg-card px-4 py-2 text-sm text-ink-soft"
            >
              <MapPin className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              {landmark}
            </li>
          ))}
        </ul>
      </Section>

      <RidingMotorcycle />

      <Section labelledBy="area-fleet-heading">
        <SectionHeading
          eyebrow="Popular here"
          title={`Rides our ${area.name} customers choose`}
          id="area-fleet-heading"
        />
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {featured.map((vehicle) => (
            <VehicleCard key={vehicle.id} entry={vehicle} />
          ))}
        </div>
      </Section>
    </>
  );
}
