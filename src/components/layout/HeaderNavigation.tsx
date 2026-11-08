"use client";
import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ChevronDown, Zap } from "lucide-react";
import { T, useLanguage } from "@/components/i18n/LanguageProvider";
import { headerGroups, type HeaderGroupId } from "./header-navigation-data";
import styles from "./Header.module.css";

/** Disclosure navigation: normal links, keyboard access and no hover dependency. */
export function HeaderNavigation({ pathname }: { pathname: string }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState<HeaderGroupId | null>(null);
  const [shown, setShown] = useState<HeaderGroupId>("ride");
  const root = useRef<HTMLElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const triggers = useRef<Record<string, HTMLButtonElement | null>>({});
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useId();
  const group = headerGroups.find(item => item.id === shown)!;
  function cancelClose() { if (closeTimer.current) clearTimeout(closeTimer.current); }
  function show(next: HeaderGroupId) { cancelClose(); setShown(next); setOpen(next); }
  useEffect(() => {
    function outside(event: PointerEvent) { if (!root.current?.contains(event.target as Node)) setOpen(null); }
    document.addEventListener("pointerdown", outside);
    return () => { document.removeEventListener("pointerdown", outside); if (closeTimer.current) clearTimeout(closeTimer.current); };
  }, []);
  return <nav ref={root} aria-label={t("Primary")} className={styles.navigation}
    onPointerEnter={cancelClose}
    onPointerLeave={event => { if (event.pointerType === "mouse") closeTimer.current = setTimeout(() => setOpen(null), 160); }}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(null); }}
    onKeyDown={event => { if (event.key === "Escape" && open) { event.preventDefault(); const previous = open; setOpen(null); triggers.current[previous]?.focus(); } }}>
    <ul className={styles.tabs}>
      {headerGroups.map(item => <li key={item.id}><button
        ref={element => { triggers.current[item.id] = element; }}
        id={`${id}-${item.id}`} type="button" aria-expanded={open === item.id} aria-controls={`${id}-panel`}
        data-current={item.links.some(link => pathname.startsWith(link.href)) || undefined}
        onClick={event => {
          // A mouse click must not immediately undo the preceding hover-open.
          if (event.detail > 0 && window.matchMedia("(hover:hover)").matches) show(item.id);
          else open === item.id ? setOpen(null) : show(item.id);
        }}
        onPointerEnter={event => { if (event.pointerType === "mouse" && window.matchMedia("(hover:hover)").matches) show(item.id); }}
        onKeyDown={event => { if (event.key === "ArrowDown") { event.preventDefault(); show(item.id); requestAnimationFrame(() => panel.current?.querySelector<HTMLAnchorElement>("a")?.focus()); } }}
        className={styles.tab}><T>{item.label}</T><ChevronDown size={13} aria-hidden="true"/></button></li>)}
      <li><Link href="/supercharge" className={styles.chargeLink} onPointerEnter={() => setOpen(null)} aria-current={pathname === "/supercharge" ? "page" : undefined}><Zap size={14} aria-hidden="true"/><T>SuperCharge</T></Link></li>
    </ul>
    <div ref={panel} id={`${id}-panel`} role="region" aria-labelledby={`${id}-${shown}`} aria-hidden={!open} inert={!open} data-open={Boolean(open)} className={styles.dropdown}>
      <div className={styles.dropdownGrid}>
        <Link href={group.href} onClick={() => setOpen(null)} className={`${styles.feature} ${shown === "ride" ? styles.bikeFeature : ""}`}>
          <span className={styles.eyebrow}><T>{group.eyebrow}</T></span><strong><T>{group.title}</T></strong><p><T>{group.description}</T></p>
          <div className={styles.featureImage}><Image src={group.image} alt={t(group.imageAlt)} width={600} height={450} sizes="260px"/></div>
          <span className={styles.featureAction}><T>{group.action}</T><ArrowUpRight size={17} aria-hidden="true"/></span>
        </Link>
        <div className={styles.dropdownBody}>
          <span className={styles.listHeading}><T>{group.label}</T></span>
          <ul className={`${styles.dropdownLinks} ${shown === "explore" ? styles.exploreLinks : ""}`}>
            {group.links.map(item => <li key={item.href}><Link href={item.href} onClick={() => setOpen(null)} aria-current={pathname === item.href ? "page" : undefined}>
              <span><strong><T>{item.label}</T></strong><small><T>{item.description}</T></small></span><ArrowUpRight size={16} aria-hidden="true"/>
            </Link></li>)}
          </ul>
          <Link href="/contact" className={styles.menuFootnote} onClick={() => setOpen(null)}><span className={styles.statusDot} aria-hidden="true"/><T>Talk to the Werigo team</T><ArrowUpRight size={14} aria-hidden="true"/></Link>
        </div>
      </div>
    </div>
  </nav>;
}
