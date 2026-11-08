import Link from "next/link";
import { BrandLockup } from "@/components/brand/BrandLockup";

export function Logo({ variant = "header", className = "" }: { variant?: "header" | "footer"; className?: string }) {
  return <Link href="/" aria-label="Werigo home" className={`brand-site-logo brand-site-logo-${variant} ${className}`}><BrandLockup /></Link>;
}
