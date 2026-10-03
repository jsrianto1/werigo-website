"use client";
import { T, useLanguage } from "@/components/i18n/LanguageProvider";


import { useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { MobileDrawer } from "@/components/layout/MobileDrawer";
import { LanguageSelector } from "@/components/i18n/LanguageSelector";
import { AccountMenu } from "@/components/account/AccountMenu";

// The logo links home, so the desktop nav starts at Our Fleet: nine
// items no longer fit beside the logo at the xl breakpoint without
// crowding into the language selector. Home stays in the drawer.
const navItems = [
  { href: "/fleet", label: "Our Fleet" },
  { href: "/monthly-scooter-rental-bali", label: "Monthly Rentals" },
  { href: "/supercharge", label: "SuperCharge" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/delivery-areas", label: "Delivery Areas" },
  { href: "/saga", label: "Saga" },
  { href: "/about", label: "About" },
  { href: "/partners", label: "Partners" },
  { href: "/help-center", label: "Help Center" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  const { t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  // Close menus on route change (state-adjust-during-render pattern)
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
  }

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  // The episode reader has its own sticky toolbar, so the site header
  // scrolls away there instead of stacking two sticky bars.
  const inReader = pathname.startsWith("/saga/");

  return (
    <header
      className={`${inReader ? "relative" : "sticky top-0"} z-50 border-b border-line bg-page/95 backdrop-blur-sm`}
    >
      <div className="mx-auto flex h-20 w-full max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 xl:px-10">
        <Logo />

        {/* Desktop nav */}
        <nav aria-label="Primary" className="hidden xl:block">
          <ul className="flex items-center gap-1">
            {navItems.filter((item) => ["/fleet", "/monthly-scooter-rental-bali", "/how-it-works", "/delivery-areas", "/saga", "/help-center"].includes(item.href)).map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={`whitespace-nowrap rounded-md px-2.5 py-2 text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? "text-primary"
                      : "text-ink-soft hover:text-ink"
                  }`}
                >
                  <T>{item.label}</T>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden md:block"><LanguageSelector /></div>
          <AccountMenu className="hidden sm:inline-flex" />

          <div className="hidden sm:block">
            <ButtonLink href="/book" variant="accent" size="md"><T>{"Check availability"}</T>{" "}</ButtonLink>
          </div>

          {/* Mobile menu toggle */}
          <button
            ref={hamburgerRef}
            aria-expanded={mobileOpen}
            aria-controls="mobile-drawer"
            aria-label={t("Open menu")}
            onClick={() => setMobileOpen(true)}
            className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md text-ink xl:hidden"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <MobileDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        returnFocusRef={hamburgerRef}
      />
    </header>
  );
}
