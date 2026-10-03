"use client";
import { T, useLanguage } from "@/components/i18n/LanguageProvider";


import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { X, ChevronDown, MapPin } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { serviceAreas } from "@/data/locations";
import { LanguageSelector } from "@/components/i18n/LanguageSelector";
import { AccountMenu } from "@/components/account/AccountMenu";

/**
 * Accessible mobile navigation drawer.
 *
 * Rendered through a portal to <body>: the sticky header uses
 * backdrop-filter, which turns it into the containing block for
 * fixed-position descendants — a drawer rendered inside the header
 * collapses to the header's own height (the original "menu doesn't
 * open" bug). The portal keeps the drawer positioned against the
 * real viewport.
 */
export function MobileDrawer({
  open,
  onClose,
  returnFocusRef,
}: {
  open: boolean;
  onClose: () => void;
  returnFocusRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const { t } = useLanguage();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [areasOpen, setAreasOpen] = useState(false);

  // Body scroll lock only while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Focus management: focus close button on open, trap Tab, Escape closes,
  // restore focus to the hamburger on close.
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const returnTo = returnFocusRef.current;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      returnTo?.focus();
    };
  }, [open, onClose, returnFocusRef]);

  if (!open || typeof document === "undefined") return null;

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/fleet", label: "Our Fleet" },
    { href: "/monthly-scooter-rental-bali", label: "Monthly Rentals" },
    { href: "/supercharge", label: "SuperCharge" },
    { href: "/how-it-works", label: "How It Works" },
  ];
  const navItemsAfterAreas = [
    { href: "/saga", label: "WERIGO SAGA (webtoon)" },
    { href: "/about", label: "About Werigo" },
    { href: "/partners", label: "Partners" },
    { href: "/help-center", label: "Help Center" },
    { href: "/contact", label: "Contact" },
  ];

  const linkClass =
    "block rounded-md px-3 py-3 text-base font-medium text-ink hover:bg-sunken";

  return createPortal(
    <div className="fixed inset-0 z-[100] xl:hidden">
      {/* Overlay — tapping outside closes */}
      <button
        aria-label={t("Close menu")}
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/50"
        tabIndex={-1}
      />
      {/* Panel */}
      <div
        ref={panelRef}
        id="mobile-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className="drawer-panel absolute bottom-0 right-0 top-0 flex w-[86%] max-w-sm flex-col overflow-y-auto bg-page shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <span className="text-sm font-semibold uppercase tracking-wider text-ink-soft"><T>{"Menu"}</T>{" "}</span>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label={t("Close menu")}
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-md text-ink hover:bg-sunken"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="border-b border-line px-3 py-2">
          <AccountMenu className="w-full justify-start" />
        </div>

        <nav aria-label="Primary mobile" className="flex-1 px-3 py-3">
          <ul>
            {navItems.map((item) => (
              <li key={item.href}>
                <Link href={item.href} onClick={onClose} className={linkClass}>
                  <T>{item.label}</T>
                </Link>
              </li>
            ))}

            {/* Delivery Areas — nested accordion */}
            <li>
              <button
                aria-expanded={areasOpen}
                aria-controls="drawer-areas"
                onClick={() => setAreasOpen((v) => !v)}
                className="flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-3 text-base font-medium text-ink hover:bg-sunken"
              ><T>{"Delivery Areas"}</T>{" "}<ChevronDown
                  aria-hidden="true"
                  className={`h-4 w-4 text-ink-faint transition-transform duration-200 ${
                    areasOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              <div id="drawer-areas" hidden={!areasOpen}>
                <ul className="mb-1 ml-2 border-l border-line pl-2">
                  <li>
                    <Link
                      href="/delivery-areas"
                      onClick={onClose}
                      className="block rounded-md px-3 py-2.5 text-sm font-medium text-primary hover:bg-sunken"
                    ><T>{"All delivery areas"}</T>{" "}</Link>
                  </li>
                  {serviceAreas.map((area) => (
                    <li key={area.slug}>
                      <Link
                        href={`/delivery-areas/${area.slug}`}
                        onClick={onClose}
                        className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm text-ink-soft hover:bg-sunken hover:text-ink"
                      >
                        <MapPin className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                        <T>{area.name}</T>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </li>

            {navItemsAfterAreas.map((item) => (
              <li key={item.href}>
                <Link href={item.href} onClick={onClose} className={linkClass}>
                  <T>{item.label}</T>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-line px-4 py-4">
          <ButtonLink
            href="/book"
            variant="accent"
            size="lg"
            className="w-full"
            onClick={onClose}
          ><T>{"Check availability"}</T>{" "}</ButtonLink>
          <div className="mt-4"><LanguageSelector mobile /></div>
        </div>
      </div>
    </div>,
    document.body
  );
}
