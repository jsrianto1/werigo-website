import Link from "next/link";

/**
 * PLACEHOLDER wordmark until the official Werigo logo arrives.
 * Swap the inner markup for the real SVG when provided — every
 * usage site references this component only.
 */
export function Logo({
  inverse = false,
  className = "",
}: {
  inverse?: boolean;
  className?: string;
}) {
  return (
    <Link
      href="/"
      aria-label="Werigo — home"
      className={`inline-flex items-baseline gap-0.5 ${className}`}
    >
      <span
        className={`font-display text-2xl font-semibold tracking-tight ${
          inverse ? "text-ink-inverse" : "text-ink"
        }`}
      >
        werigo
      </span>
      <span
        aria-hidden="true"
        className="inline-block h-2 w-2 translate-y-[-2px] rounded-full bg-accent"
      />
    </Link>
  );
}
