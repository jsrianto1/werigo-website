import Image from "next/image";

/** Wing silhouette from Werigo's existing identity. Wedison artwork stays unmodified. */
export function WerigoWing({ className = "" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 780 280" fill="currentColor" aria-hidden="true"><path d="M14 14 235 74 300 181 94 88 309 264 353 264 390 164 427 264 471 264 687 88 481 181 546 74 766 14 546 151 481 181 390 72 300 181 235 151Z"/></svg>;
}

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
      <WerigoWing className="wr-route-mark" />
      <span className="wr-wordmark-name" aria-hidden="true">WERIGO<span className="wg-wordmark-stop">.</span></span>
    </span>
    <PoweredByWedison />
  </span>;
}
