import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { SagaReader, type ReaderEpisodeRef } from "@/components/saga/SagaReader";
import {
  coverSrc,
  getEpisode,
  getEpisodes,
  getNeighbours,
  getPages,
  getTranscript,
  modelNames,
  ogSrc,
  saga,
  type SagaEpisode,
} from "@/data/saga";
import { site } from "@/lib/config";
import { jsonLd } from "@/lib/schema";

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return getEpisodes().map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const ep = getEpisode(slug);
  if (!ep) return {};
  const title = `WERIGO SAGA Episode ${ep.number}: ${ep.title}`;
  return {
    title,
    description: `${ep.logline} Read Episode ${ep.number} of WERIGO SAGA, the Werigo webtoon set in Bali, free on werigo.co.`,
    alternates: { canonical: `/saga/${ep.slug}` },
    openGraph: {
      type: "article",
      title,
      description: ep.logline,
      url: `${site.baseUrl}/saga/${ep.slug}`,
      images: [{ url: ogSrc(ep), width: 1200, height: 630, alt: `${saga.title} Episode ${ep.number} cover art` }],
    },
    twitter: { card: "summary_large_image", title, description: ep.logline, images: [ogSrc(ep)] },
  };
}

const toRef = (e: SagaEpisode): ReaderEpisodeRef => ({
  number: e.number,
  slug: e.slug,
  title: e.title,
  cover: coverSrc(e),
});

export default async function EpisodePage({ params }: Props) {
  const { slug } = await params;
  const ep = getEpisode(slug);
  if (!ep) notFound();
  const { prev, next } = getNeighbours(ep);
  const transcript = getTranscript(ep);

  const schema = {
    "@context": "https://schema.org",
    "@type": "ComicIssue",
    name: `Episode ${ep.number}: ${ep.title}`,
    issueNumber: ep.number,
    description: ep.logline,
    url: `${site.baseUrl}/saga/${ep.slug}`,
    image: `${site.baseUrl}${ogSrc(ep)}`,
    inLanguage: "en",
    isAccessibleForFree: true,
    isPartOf: { "@type": "ComicSeries", name: saga.title, url: `${site.baseUrl}/saga` },
    publisher: { "@type": "Organization", name: site.name, url: site.baseUrl },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      <h1 className="sr-only">
        {saga.title} Episode {ep.number}: {ep.title}
      </h1>
      <SagaReader
        episode={toRef(ep)}
        pages={getPages(ep)}
        prev={prev ? toRef(prev) : null}
        next={next ? toRef(next) : null}
        episodes={getEpisodes().map(toRef)}
      >
        {/* Ride what you just read */}
        <section aria-labelledby="ride-heading" className="mt-14">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#2ee0b0]">
            The bikes are real
          </p>
          <h2 id="ride-heading" className="mt-2 font-display text-2xl text-white sm:text-3xl">
            Ride what you just read
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">
            Every bike in this episode is a Wedison you can rent from Werigo in Bali. We deliver it to your hotel or
            villa with at least 80% battery, two helmets and a phone holder fitted.
          </p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {ep.featuredModels.map((m) => (
              <li key={m}>
                <Link
                  href={`/fleet/${m}`}
                  className="group flex items-center gap-4 rounded-[14px] border border-white/10 bg-white/[0.04] p-3 transition-colors hover:border-white/25 hover:bg-white/[0.07]"
                >
                  <div className="relative h-20 w-28 shrink-0 rounded-[10px] bg-white/90">
                    <Image
                      src={`/media/fleet/${m}/cutout.webp`}
                      alt={modelNames[m]}
                      fill
                      sizes="112px"
                      className="object-contain p-1.5"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white">{modelNames[m]}</p>
                    <p className="mt-0.5 text-sm text-white/60">See rates and details</p>
                  </div>
                  <ArrowRight
                    className="h-5 w-5 shrink-0 text-white/50 transition-transform group-hover:translate-x-1 group-hover:text-white"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/book"
            className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-[10px] bg-accent px-7 text-base font-semibold text-white transition-colors hover:bg-accent-strong"
          >
            Book your ride
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>

        {/* Transcript */}
        {transcript.length ? (
          <details className="group mt-12 rounded-[14px] border border-white/10 bg-white/[0.03]">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-sm font-semibold text-white/85 sm:px-5">
              Read the transcript
              <span className="text-white/50 transition-transform group-open:rotate-45" aria-hidden="true">
                +
              </span>
            </summary>
            <div className="border-t border-white/10 px-4 pb-6 pt-4 text-sm leading-relaxed text-white/75 sm:px-5">
              {transcript.map((beat, i) => (
                <div key={i} className="mt-4 first:mt-0">
                  <p>
                    <span className="font-semibold text-white">{beat.label}.</span> {beat.text}
                  </p>
                  {beat.lines.length ? (
                    <ul className="mt-1.5 space-y-1 border-l border-white/15 pl-3">
                      {beat.lines.map((l, j) => (
                        <li key={j}>
                          {l.who ? <span className="font-semibold text-[#9ff0d6]">{l.who}: </span> : null}
                          {l.text}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          </details>
        ) : null}

        <p className="mt-8 text-xs leading-relaxed text-white/45">{saga.disclaimer}</p>
      </SagaReader>
    </>
  );
}
