import type { ReactNode } from "react";

/**
 * Standard page section: consistent max width + vertical rhythm.
 * tone="wash" renders on the laguna wash; tone="deep" on the dark band.
 */
export function Section({
  children,
  tone = "page",
  className = "",
  id,
  labelledBy,
}: {
  children: ReactNode;
  tone?: "page" | "wash" | "deep" | "card";
  className?: string;
  id?: string;
  labelledBy?: string;
}) {
  const tones = {
    page: "",
    wash: "bg-primary-faint",
    deep: "bg-deep text-ink-inverse",
    card: "bg-card",
  };
  return (
    <section id={id} aria-labelledby={labelledBy} className={tones[tone]}>
      {/* className merges here so padding overrides (e.g. !py-0) act on
          the element that actually carries the section padding. */}
      <div
        className={`mx-auto w-full max-w-[1400px] px-4 py-16 sm:px-6 md:py-16 lg:px-8 lg:py-20 xl:px-10 ${className}`}
      >
        {children}
      </div>
    </section>
  );
}

/** Section heading block: eyebrow + display title + optional lede. */
export function SectionHeading({
  eyebrow,
  title,
  lede,
  id,
  align = "left",
  inverse = false,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  id?: string;
  align?: "left" | "center";
  inverse?: boolean;
}) {
  return (
    <div
      className={`mb-10 max-w-2xl md:mb-12 ${
        align === "center" ? "mx-auto text-center" : ""
      }`}
    >
      {eyebrow ? (
        <p className={`eyebrow mb-3 ${inverse ? "!text-ink-inverse/70" : ""}`}>
          {eyebrow}
        </p>
      ) : null}
      <h2
        id={id}
        className={`font-display text-3xl leading-tight md:text-4xl ${
          inverse ? "text-ink-inverse" : "text-ink"
        }`}
      >
        {title}
      </h2>
      {lede ? (
        <p
          className={`mt-4 text-base leading-relaxed md:text-lg ${
            inverse ? "text-ink-inverse/80" : "text-ink-soft"
          }`}
        >
          {lede}
        </p>
      ) : null}
    </div>
  );
}
