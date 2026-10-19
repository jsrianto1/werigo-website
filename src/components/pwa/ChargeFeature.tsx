import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

/** A photo-led charging entry point, immediately after motorcycle rental. */
export function ChargeFeature({ eyebrow = "WEDISON SUPERCHARGE" }: { eyebrow?: string }) {
  return <Link className="wg-charge-feature" href="/app/charge">
    <span className="wg-charge-feature-copy">
      <span className="wg-overline">{eyebrow}</span>
      <strong>Charge &amp; go.</strong>
      <span className="wg-charge-feature-description">A charging stop.<br/>A little more Bali.</span>
      <span className="wg-charge-feature-cta">Find charging spots<ArrowUpRight size={18} aria-hidden="true"/></span>
    </span>
    <Image src="/media/supercharge/supercharge-unit.webp" alt="Official Wedison SuperCharge station with its charging connectors" width={1200} height={1600} sizes="(max-width:760px) 120px, 150px"/>
  </Link>;
}
