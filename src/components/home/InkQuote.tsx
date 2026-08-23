/**
 * Typographic interlude: the brand line set in two voices (sans, then
 * italic serif) while drops of Werigo teal ink drift across the band.
 * Pure CSS animation (keyframes in globals.css), no JavaScript, and
 * the drops hold still for visitors who prefer reduced motion. The
 * same artwork is rendered to video for Instagram from
 * werigo-ink-animation/ink.html; keep the two in step.
 */

const blobs = [
  { s: "clamp(72px, 11vw, 190px)", y: "46%", x: "8%", d: "0s", bt: "6s", b: "34px" },
  { s: "clamp(56px, 9vw, 150px)", y: "58%", x: "30%", d: "-4.1s", bt: "4s", b: "-28px" },
  { s: "clamp(90px, 14vw, 240px)", y: "38%", x: "52%", d: "-7.3s", bt: "6s", b: "48px" },
  { s: "clamp(44px, 7vw, 120px)", y: "66%", x: "70%", d: "-2s", bt: "3s", b: "22px" },
  { s: "clamp(64px, 10vw, 170px)", y: "28%", x: "86%", d: "-9.8s", bt: "4s", b: "-40px" },
  { s: "clamp(36px, 6vw, 100px)", y: "54%", x: "44%", d: "-5.9s", bt: "3s", b: "30px" },
];

export function InkQuote() {
  return (
    <section aria-label="Ride Bali on electric, the quiet way" className="relative overflow-hidden">
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="ink-stage relative h-[400px] sm:h-[500px] lg:h-[600px]">
          <p className="absolute inset-0">
            <span className="absolute left-0 top-[12%] font-sans text-[clamp(2.4rem,7.5vw,6.4rem)] font-semibold leading-[1.02] tracking-[-0.03em] text-ink">
              Ride Bali
              <br />
              on electric.
            </span>
            <span className="absolute bottom-[10%] right-0 text-right font-display text-[clamp(2.4rem,7.5vw,6.4rem)] italic leading-[1.02] tracking-[-0.01em] text-ink">
              the quiet
              <br />
              way.
            </span>
          </p>

          <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
            <filter id="werigo-goo" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
              <feGaussianBlur in="SourceGraphic" stdDeviation="14" result="b" />
              <feColorMatrix in="b" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="g" />
              <feGaussianBlur in="g" stdDeviation="1" />
            </filter>
          </svg>

          <div className="ink-layer" aria-hidden="true">
            {blobs.map((bl, i) => (
              <span
                key={i}
                className="ink-blob"
                style={
                  {
                    "--s": bl.s,
                    "--y": bl.y,
                    "--x": bl.x,
                    "--d": bl.d,
                    "--bt": bl.bt,
                    "--b": bl.b,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
