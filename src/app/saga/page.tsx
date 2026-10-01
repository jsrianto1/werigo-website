import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import type { Metadata } from "next";
import { SagaSeries } from "@/components/saga/SagaSeries";
import { getEpisodes, saga } from "@/data/saga";
import { site } from "@/lib/config";
import { jsonLd } from "@/lib/schema";

export const metadata: Metadata = {
  title: "WERIGO SAGA, the Werigo Webtoon Set in Bali",
  description:
    "Read WERIGO SAGA free in English or Indonesian. Follow Arya, a delivery rider in Bali, and a guild of electric riders through every chapter.",
  alternates: { canonical: "/saga" },
  openGraph: {
    title: "WERIGO SAGA, the Werigo Webtoon Set in Bali",
    description: saga.tagline,
    url: `${site.baseUrl}/saga`,
    images: [{ url: "/media/saga/covers/ep-3-og.jpg", width: 1200, height: 630, alt: "WERIGO SAGA key art" }],
  },
};

export default function SagaPage() {
  const episodes = getEpisodes();

  const schema = {
    "@context": "https://schema.org",
    "@type": "ComicSeries",
    name: saga.title,
    description: saga.synopsis.join(" "),
    url: `${site.baseUrl}/saga`,
    inLanguage: ["en", "id"],
    isAccessibleForFree: true,
    publisher: { "@type": "Organization", name: site.name, url: site.baseUrl },
    hasPart: episodes.map((e) => ({
      "@type": "ComicIssue",
      issueNumber: e.number,
      name: `Chapter ${e.number}: ${e.title}`,
      url: `${site.baseUrl}/saga/${e.slug}`,
    })),
  };
  return (
    <>
      <div className="bg-[#0b100f]"><Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "WERIGO SAGA", path: "/saga" }]} dark /></div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      <SagaSeries />
    </>
  );
}
