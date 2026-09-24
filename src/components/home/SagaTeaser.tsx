import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { coverSrc, getEpisodes, saga } from "@/data/saga";

/**
 * Homepage teaser for WERIGO SAGA, the Werigo webtoon. A dark card with
 * fanned episode covers; the reading CTA is teal so the page keeps a
 * single orange booking action per view.
 */
export function SagaTeaser() {
  const episodes = getEpisodes();
  if (!episodes.length) return null;
  const fan = episodes.slice(-3);
  const latest = episodes[episodes.length - 1];

  return (
    <Section labelledBy="saga-teaser-heading" className="!pt-4 md:!pt-6">
      <div className="relative overflow-hidden rounded-[24px] bg-[#0b100f] text-ink-inverse">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_70%_at_85%_40%,rgba(46,224,176,0.2),transparent_70%)]"
        />
        <div className="relative grid items-center gap-10 p-6 sm:p-10 lg:grid-cols-[1fr_1fr] lg:p-14">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#2ee0b0]">New: the Werigo webtoon</p>
            <h2 id="saga-teaser-heading" className="mt-3 font-display text-3xl leading-tight text-white md:text-4xl">
              Take a break and read {saga.title}
            </h2>
            <p className="mt-4 max-w-lg leading-relaxed text-white/75">
              A delivery rider in Denpasar, a bike that changes everything and a System only he can see. Free to read
              here, one episode at a time, and every bike in it is one you can rent from us.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href={`/saga/${episodes[0].slug}`}
                className="inline-flex min-h-12 items-center gap-2 rounded-[10px] bg-[#2ee0b0] px-6 text-base font-semibold text-[#06201a] transition-colors hover:bg-[#5ff0c8]"
              >
                <BookOpen className="h-5 w-5" aria-hidden="true" />
                Read Episode 1
              </Link>
              <Link
                href="/saga"
                className="inline-flex min-h-12 items-center gap-2 rounded-[10px] border border-white/25 px-6 text-base font-semibold text-white hover:border-white/50"
              >
                All {episodes.length} episodes
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <Link
            href={`/saga/${latest.slug}`}
            aria-label={`Read the newest episode, Episode ${latest.number}: ${latest.title}`}
            className="group relative mx-auto block h-[260px] w-full max-w-[420px] sm:h-[320px]"
          >
            {fan.map((e, i) => {
              const pos = [
                "left-0 top-8 -rotate-6",
                "left-1/2 top-0 -translate-x-1/2 rotate-0 z-10",
                "right-0 top-8 rotate-6",
              ][fan.length === 3 ? i : 1];
              return (
                <div
                  key={e.slug}
                  className={`absolute w-[46%] overflow-hidden rounded-[14px] border border-white/15 shadow-2xl transition-transform duration-300 group-hover:-translate-y-1 ${pos}`}
                >
                  <Image
                    src={coverSrc(e)}
                    alt=""
                    width={320}
                    height={320}
                    sizes="200px"
                    className="aspect-[3/4] h-auto w-full object-cover"
                  />
                  <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-3 pb-2 pt-6 text-xs font-semibold text-white">
                    Episode {e.number}
                  </p>
                </div>
              );
            })}
          </Link>
        </div>
      </div>
    </Section>
  );
}
