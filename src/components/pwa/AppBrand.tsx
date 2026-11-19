import { BrandLockup, WedisonEndorsement } from "@/components/brand/BrandLockup";
import Image from "next/image";

/** Approved Journey Loop symbol; retained export name keeps existing callers stable. */
export function WerigoWing({ className = "" }: { className?: string }) {
  return <Image className={className} src="/brand/journey-loop-v20261119/symbol-teal.svg" width={168} height={163} alt="" aria-hidden="true" unoptimized/>;
}

/** App identity only. The endorsement uses the original, unmodified Wedison artwork. */
export function PoweredByWedison({ className = "" }: { className?: string }) {
  return <WedisonEndorsement className={`wr-endorsement ${className}`}/>;
}

export function AppBrand({ hero = false }: { hero?: boolean }) {
  return <BrandLockup className={`wr-app-brand${hero ? " wr-app-brand-hero" : ""}`}/>;
}
