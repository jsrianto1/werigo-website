import Image from "next/image";

/** The official WEDISON artwork is never redrawn, filtered or recoloured. */
export function WedisonEndorsement({ className = "" }: { className?: string }) {
  return <span className={`brand-endorsement ${className}`}><span>Powered by</span><Image className="brand-wedison-colour" src="/app/wedison-official.png" alt="WEDISON" width={2838} height={381} loading="eager" unoptimized /><Image className="brand-wedison-white" src="/app/wedison-official-white.png" alt="WEDISON" width={2837} height={369} loading="eager" unoptimized /></span>;
}
export function BrandLockup({ className = "" }: { className?: string }) {
  return <span className={`brand-lockup ${className}`}><Image className="brand-logo-art brand-logo-teal" src="/brand/journey-loop-v20261119/wordmark-teal.svg" alt="WERIGO" width={921} height={264} loading="eager" unoptimized /><Image className="brand-logo-art brand-logo-white" src="/brand/journey-loop-v20261119/wordmark-white.svg" alt="WERIGO" width={921} height={264} loading="eager" unoptimized /><WedisonEndorsement /></span>;
}
