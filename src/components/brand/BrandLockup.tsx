import Image from "next/image";

/** The official WEDISON artwork is never redrawn, filtered or recoloured. */
export function WedisonEndorsement({ className = "" }: { className?: string }) {
  return <span className={`brand-endorsement ${className}`}><span>Powered by</span><Image src="/app/wedison-official.png" alt="WEDISON" width={2838} height={381} unoptimized /></span>;
}
export function BrandLockup({ className = "" }: { className?: string }) {
  return <span className={`brand-lockup ${className}`}><span className="brand-wordmark">WERIGO<span aria-hidden="true">.</span></span><WedisonEndorsement /></span>;
}
