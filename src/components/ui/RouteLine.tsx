/**
 * Signature motif: the Werigo route line.
 * A dashed path that slowly "rides" — evoking a scooter route across
 * the island. Used as a section divider. Animation pauses under
 * prefers-reduced-motion (see globals.css).
 */
export function RouteLine({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`overflow-hidden ${className}`}>
      <svg
        viewBox="0 0 1440 48"
        fill="none"
        preserveAspectRatio="none"
        className="h-10 w-full"
      >
        <path
          d="M-10 34 C 180 34, 240 12, 420 14 S 720 40, 900 32 S 1220 8, 1450 18"
          stroke="var(--brand-primary)"
          strokeOpacity="0.35"
          strokeWidth="1.5"
          className="route-dash"
        />
        {/* location dot */}
        <circle cx="420" cy="14" r="3.5" fill="var(--brand-accent)" />
        <circle cx="900" cy="32" r="3.5" fill="var(--brand-primary)" fillOpacity="0.5" />
      </svg>
    </div>
  );
}
