import Image from "next/image";

/** The official WEDISON artwork is never redrawn, filtered or recoloured. */
export function WedisonEndorsement({ className = "" }: { className?: string }) {
  return <span className={`brand-endorsement ${className}`}><span>Powered by</span><Image src="/app/wedison-official.png" alt="WEDISON" width={2838} height={381} loading="eager" unoptimized /></span>;
}
export function BrandLockup({ className = "" }: { className?: string }) {
  return <span className={`brand-lockup ${className}`}><Image className="brand-logo-art" src="/brand/werigo-logo-compact.png" alt="WERIGO" width={1217} height={482} loading="eager" unoptimized /><WedisonEndorsement /></span>;
}
