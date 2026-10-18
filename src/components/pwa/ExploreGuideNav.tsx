"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ArrowUpRight, BedDouble, Coffee, Compass, Dumbbell, ShoppingBag } from "lucide-react";

const guides = [
  { href: "/app/explore", label: "What to do?", icon: Compass, image: "/media/areas/canggu/hero.webp", alt: "Surfer on Canggu beach at sunset", description: "Surf, snorkel, explore" },
  { href: "/app/cafes", label: "Café hopping", icon: Coffee, image: "/app/places/milk-madu-berawa.webp", alt: "Open-air tables at Milk & Madu Berawa", description: "Coffee, brunch & a new favourite" },
  { href: "/app/stays", label: "Where to stay?", icon: BedDouble, image: "/app/stays/citadines-berawa.jpg", alt: "Citadines Berawa Beach Bali", description: "Find your Bali base · Ascott" },
  { href: "/app/shop", label: "Where to shop?", icon: ShoppingBag, image: "/app/places/pepito.webp", alt: "Pepito Market Dewi Sri storefront", description: "Everyday essentials · Pepito" },
  { href: "/app/wellness", label: "Workout & wellness", icon: Dumbbell, image: "/app/places/sunset-berawa.webp", alt: "Reformer class at Sunset Pilates Berawa", description: "Gym, Pilates, yoga & recovery" },
];
export function ExploreGuideNav({ visual = false }: { visual?: boolean }) {
  const pathname = usePathname();
  if (visual) return <nav className="wg-guide-cards" aria-label="Explore Bali by interest">{guides.map(guide => <Link key={guide.href} href={guide.href} className="wg-guide-card"><span className="wg-guide-card-photo"><Image src={guide.image} alt={guide.alt} fill sizes="(max-width:760px) 45vw, 380px"/></span><span className="wg-guide-card-copy"><strong>{guide.label}<ArrowUpRight size={16}/></strong><small>{guide.description}</small></span></Link>)}</nav>;
  return <nav className="wg-guide-nav" aria-label="Bali guides">{guides.map(guide => <Link key={guide.href} href={guide.href} aria-current={pathname === guide.href ? "page" : undefined}><guide.icon size={17} aria-hidden="true"/>{guide.label}</Link>)}</nav>;
}
