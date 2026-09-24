import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SagaReader, type ReaderEpisodeRef } from "@/components/saga/SagaReader";
import { EpisodeExtras } from "@/components/saga/EpisodeExtras";
import {
  coverSrc,
  getEpisode,
  getEpisodes,
  getNeighbours,
  getPages,
  ogSrc,
  saga,
  type SagaEpisode,
} from "@/data/saga";
import { getTranscript } from "@/data/sagaTranscript";
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
  titleId: e.titleId,
  cover: coverSrc(e),
});

export default async function EpisodePage({ params }: Props) {
  const { slug } = await params;
  const ep = getEpisode(slug);
  if (!ep) notFound();
  const { prev, next } = getNeighbours(ep);

  const schema = {
    "@context": "https://schema.org",
    "@type": "ComicIssue",
    name: `Episode ${ep.number}: ${ep.title}`,
    issueNumber: ep.number,
    description: ep.logline,
    url: `${site.baseUrl}/saga/${ep.slug}`,
    image: `${site.baseUrl}${ogSrc(ep)}`,
    inLanguage: ["en", "id"],
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
        <EpisodeExtras models={ep.featuredModels} transcript={getTranscript(ep)} />
      </SagaReader>
    </>
  );
}
