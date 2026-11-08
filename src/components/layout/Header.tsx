"use client";
import { T, useLanguage } from "@/components/i18n/LanguageProvider";
import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Download } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { MobileDrawer } from "@/components/layout/MobileDrawer";
import { LanguageSelector } from "@/components/i18n/LanguageSelector";
import { AccountMenu } from "@/components/account/AccountMenu";
import { HeaderNavigation } from "./HeaderNavigation";
import styles from "./Header.module.css";

export function Header() {
  const { t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) { setPrevPathname(pathname); setMobileOpen(false); }
  const inReader = pathname.startsWith("/saga/");
  return <header data-navigation="island" className={`${styles.header} ${inReader ? styles.readerHeader : ""}`}>
    <div className={styles.bar}>
      <Logo />
      <HeaderNavigation key={pathname} pathname={pathname}/>
      <div className={styles.actions}>
        <Link href="/app/login?install=1" aria-label={t("Get the app")} className={styles.appButton}><Download size={16} aria-hidden="true"/><span><T>Get the app</T></span></Link>
        <div className={styles.language}><LanguageSelector /></div>
        <div className={styles.account}><AccountMenu /></div>
        <Link href="/book" className={styles.bookButton}><span><T>Find your ride</T></span><span className={styles.arrowCircle}><ArrowUpRight size={16} aria-hidden="true"/></span></Link>
        <button ref={hamburgerRef} type="button" aria-expanded={mobileOpen} aria-controls="mobile-drawer" aria-label={t("Open menu")} onClick={() => setMobileOpen(true)} className={styles.menuButton}><span aria-hidden="true"><i/><i/></span></button>
      </div>
    </div>
    <MobileDrawer open={mobileOpen} onClose={closeMobile} returnFocusRef={hamburgerRef}/>
  </header>;
}
