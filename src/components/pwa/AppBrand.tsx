import Image from "next/image";

/** App identity only. The endorsement uses the original, unmodified Wedison artwork. */
export function PoweredByWedison({ className = "" }: { className?: string }) {
  return <span className={`wr-endorsement ${className}`}>
    <span>Powered by</span>
    <Image src="/app/wedison-official.png" width={2838} height={381} alt="WEDISON" unoptimized />
  </span>;
}

export function AppBrand({ hero = false }: { hero?: boolean }) {
  return <span className={`wr-app-brand${hero ? " wr-app-brand-hero" : ""}`}>
    <span className="wr-wordmark" aria-label="WERIGO">
      <svg className="wr-route-mark" viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="12" fill="currentColor"/><path d="m8.5 13 6 14 5.5-11.5L25.5 27l6-14" fill="none" stroke="#f8f9f7" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="31.5" cy="13" r="2.8" fill="#5bd4b2"/></svg>
      <span className="wr-wordmark-name" aria-hidden="true">werigo</span>
    </span>
    <PoweredByWedison />
  </span>;
}
