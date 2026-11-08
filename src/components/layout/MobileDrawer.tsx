"use client";
import { T, useLanguage } from "@/components/i18n/LanguageProvider";


import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { X, ChevronDown, ArrowUpRight, Zap } from "lucide-react";
import Image from "next/image";
import { Logo } from "@/components/ui/Logo";
import { headerGroups, type HeaderGroupId } from "./header-navigation-data";
import styles from "./Header.module.css";
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
  const [groupOpen, setGroupOpen] = useState<HeaderGroupId | null>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const desktop = window.matchMedia("(min-width:1280px)");
    const resize = () => { if (desktop.matches) onClose(); };
    desktop.addEventListener("change", resize);
    return () => desktop.removeEventListener("change", resize);
  }, [open, onClose]);

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

  return createPortal(
    <div className={styles.drawerOverlay}>
      <button aria-label={t("Close menu")} onClick={onClose} className={styles.drawerBackdrop} tabIndex={-1}/>
      <div ref={panelRef} id="mobile-drawer" role="dialog" aria-modal="true" aria-label={t("Menu")} className={styles.drawer}>
        <div className={styles.drawerTop}>
          <span onClick={onClose}><Logo /></span>
          <button ref={closeRef} type="button" onClick={onClose} aria-label={t("Close menu")} className={styles.closeButton}><X size={20} aria-hidden="true"/></button>
        </div>
        <div className={styles.drawerAccount}><AccountMenu /></div>
        <Link href="/fleet" onClick={onClose} className={styles.mobileFeature}>
          <span><small><T>YOUR ISLAND. YOUR PACE.</T></small><strong><T>Meet your Wedison.</T></strong></span>
          <Image src="/app/edpower-red.webp" alt="Red Wedison EdPower electric motorcycle" width={300} height={250} sizes="160px"/>
        </Link>
        <nav aria-label={t("Primary mobile")} className={styles.drawerNav}>
          {headerGroups.map(group => <div className={styles.mobileGroup} key={group.id}>
            <button type="button" aria-expanded={groupOpen === group.id} aria-controls={`${id}-${group.id}`} onClick={() => setGroupOpen(value => value === group.id ? null : group.id)}><T>{group.label}</T><ChevronDown aria-hidden="true"/></button>
            <ul className={styles.mobileLinks} id={`${id}-${group.id}`} hidden={groupOpen !== group.id}>
              {group.links.map(item => <li key={item.href}><Link href={item.href} onClick={onClose}><span><strong><T>{item.label}</T></strong><small><T>{item.description}</T></small></span><ArrowUpRight aria-hidden="true"/></Link></li>)}
            </ul>
          </div>)}
          <div className={styles.mobileQuickLinks}><Link href="/supercharge" onClick={onClose}><Zap size={15} aria-hidden="true"/>SuperCharge</Link><Link href="/" onClick={onClose}><T>Home</T></Link><Link href="/app/login?install=1" onClick={onClose}><T>Get the app</T></Link></div>
        </nav>
        <div className={styles.drawerBottom}>
          <Link href="/book" className={styles.bookButton} onClick={onClose}><span><T>Find your ride</T></span><span className={styles.arrowCircle}><ArrowUpRight size={17} aria-hidden="true"/></span></Link>
          <LanguageSelector mobile/>
        </div>
      </div>
    </div>, document.body
  );
}
