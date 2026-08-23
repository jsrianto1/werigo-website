import Image from "next/image";

/**
 * Typographic interlude: the brand line set in two voices (sans, then
 * italic serif) while the four Wedison models ride across the band one
 * after another. Pure CSS animation (keyframes in globals.css), no
 * JavaScript; under prefers-reduced-motion a single motorcycle stands
 * still in the middle. The same artwork is rendered to video for
 * Instagram from werigo-ink-animation/ride.html; keep the two in step.
 * Cutouts are the approved studio photos with the background removed
 * (public/media/fleet/<model>/cutout.webp).
 */

const riders = [
  { slug: "bees", width: 788, height: 852 },
  { slug: "victory", width: 847, height: 814 },
  { slug: "athena", width: 1101, height: 952 },
  { slug: "edpower", width: 1300, height: 914 },
];

export function RideQuote() {
  return (
    <section aria-label="Ride Bali on electric, the quiet way" className="relative overflow-hidden bg-white">
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="ride-stage relative">
          <p className="absolute inset-0">
            <span className="absolute left-0 top-[4%] font-sans text-[clamp(2rem,6vw,5.2rem)] font-semibold leading-[1.02] tracking-[-0.03em] text-ink">
              Ride Bali
              <br />
              on electric.
            </span>
            <span className="absolute bottom-[5%] right-0 text-right font-display text-[clamp(2rem,6vw,5.2rem)] italic leading-[1.02] tracking-[-0.01em] text-ink">
              the quiet
              <br />
              way.
            </span>
          </p>

          <div className="ride-road" aria-hidden="true" />
          {riders.map((r, i) => (
            <div
              key={r.slug}
              className="ride-rider"
              aria-hidden="true"
              style={{ "--k": `${i * 3}s` } as React.CSSProperties}
            >
              <Image
                src={`/media/fleet/${r.slug}/cutout.webp`}
                alt=""
                width={r.width}
                height={r.height}
                sizes="(max-width: 640px) 45vw, 420px"
                className="h-full w-auto"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
