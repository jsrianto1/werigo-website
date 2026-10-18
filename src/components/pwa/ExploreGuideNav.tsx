"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BedDouble, Coffee, Compass, Dumbbell, ShoppingBag } from "lucide-react";

const guides = [
  { href: "/app/explore", label: "What to do?", icon: Compass },
  { href: "/app/cafes", label: "Café hopping", icon: Coffee },
  { href: "/app/stays", label: "Where to stay?", icon: BedDouble },
  { href: "/app/shop", label: "Where to shop?", icon: ShoppingBag },
  { href: "/app/wellness", label: "Workout & wellness", icon: Dumbbell },
];
export function ExploreGuideNav() {
  const pathname = usePathname();
  return <nav className="wg-guide-nav" aria-label="Bali guides">{guides.map(guide => <Link key={guide.href} href={guide.href} aria-current={pathname === guide.href ? "page" : undefined}><guide.icon size={17} aria-hidden="true"/>{guide.label}</Link>)}</nav>;
}
