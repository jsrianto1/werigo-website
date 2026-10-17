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
    <span className="wr-wordmark" aria-label="WERIGO"><span>WERI</span><span>GO</span><i aria-hidden="true" /></span>
    <PoweredByWedison />
  </span>;
}
