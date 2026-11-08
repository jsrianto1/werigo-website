import { BrandLockup, WedisonEndorsement } from "@/components/brand/BrandLockup";

/** Wing silhouette from Werigo's existing identity. Wedison artwork stays unmodified. */
export function WerigoWing({ className = "" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 780 280" fill="currentColor" aria-hidden="true"><path d="M14 14 235 74 300 181 94 88 309 264 353 264 390 164 427 264 471 264 687 88 481 181 546 74 766 14 546 151 481 181 390 72 300 181 235 151Z"/></svg>;
}

/** App identity only. The endorsement uses the original, unmodified Wedison artwork. */
export function PoweredByWedison({ className = "" }: { className?: string }) {
  return <WedisonEndorsement className={`wr-endorsement ${className}`}/>;
}

export function AppBrand({ hero = false }: { hero?: boolean }) {
  return <BrandLockup className={`wr-app-brand${hero ? " wr-app-brand-hero" : ""}`}/>;
}
