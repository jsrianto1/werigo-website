"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Globe, ChevronDown } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { site } from "@/lib/config";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/fleet", label: "Our Fleet" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/delivery-areas", label: "Delivery Areas" },
  { href: "/about", label: "About Werigo" },
  { href: "/help-center", label: "Help Center" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const pathname = usePathname();

  // Close menus on route change (state-adjust-during-render pattern)
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
    setLangOpen(false);
  }

  // Lock body scroll while mobile nav is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-page/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo />

        {/* Desktop nav */}
        <nav aria-label="Primary" className="hidden xl:block">
          <ul className="flex items-center gap-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? "text-primary"
                      : "text-ink-soft hover:text-ink"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          {/* Language selector */}
          <div className="relative hidden md:block">
            <button
              aria-expanded={langOpen}
              aria-haspopup="listbox"
              aria-label="Change language"
              onClick={() => setLangOpen((v) => !v)}
              className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
            >
              <Globe className="h-4 w-4" aria-hidden="true" />
              EN
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            {langOpen ? (
              <ul
                role="listbox"
                aria-label="Language"
                className="absolute right-0 top-full mt-1 w-48 rounded-[10px] border border-line bg-card py-1 shadow-lg"
              >
                {site.locales.map((locale) => (
                  <li key={locale.code} role="option" aria-selected={locale.active}>
                    <button
                      disabled={!locale.active}
                      onClick={() => setLangOpen(false)}
                      className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm ${
                        locale.active
                          ? "cursor-pointer font-medium text-ink hover:bg-primary-faint"
                          : "cursor-default text-ink-faint"
                      }`}
                    >
                      {locale.label}
                      {!locale.active ? (
                        <span className="text-[10px] uppercase tracking-wide">
                          Soon
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <ButtonLink href="/book" variant="accent" size="md" className="hidden sm:inline-flex">
            Rent a Bike
          </ButtonLink>

          {/* Mobile menu toggle */}
          <button
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((v) => !v)}
            className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md text-ink xl:hidden"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile nav panel */}
      {mobileOpen ? (
        <nav
          id="mobile-nav"
          aria-label="Primary mobile"
          className="fixed inset-x-0 top-16 bottom-0 z-50 overflow-y-auto border-t border-line bg-page xl:hidden"
        >
          <ul className="px-4 py-4">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={`block rounded-md px-3 py-3.5 text-base font-medium ${
                    isActive(item.href)
                      ? "bg-primary-faint text-primary"
                      : "text-ink hover:bg-sunken"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="border-t border-line px-4 py-4">
            <ButtonLink href="/book" variant="accent" size="lg" className="w-full">
              Rent a Bike
            </ButtonLink>
            <div className="mt-4 flex items-center gap-2 px-1 text-sm text-ink-soft">
              <Globe className="h-4 w-4" aria-hidden="true" />
              <span className="font-medium text-ink">English</span>
              <span aria-hidden="true">·</span>
              <span className="text-ink-faint">Bahasa Indonesia — soon</span>
            </div>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
