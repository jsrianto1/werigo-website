"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, Check, Copy, Sparkles } from "lucide-react";
import styles from "./ChristmasOffer.module.css";

interface Offer { code: string; percent: number; description: string | null; ends_at: string }

/** Visibility follows the live admin dates/active state, on web and PWA. */
export function ChristmasOffer({ onRent }: { onRent?: () => void }) {
  const pathname = usePathname();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [copied, setCopied] = useState("");
  const [copyError, setCopyError] = useState(false);
  const [checkedAt, setCheckedAt] = useState(0);
  const shownHere = Boolean(onRent) || ["/", "/book", "/fleet", "/monthly-rental"].includes(pathname);
  useEffect(() => {
    if (!shownHere) return;
    const controller = new AbortController();
    const refresh = () => fetch("/api/promotions/christmas", { cache: "no-store", signal: controller.signal })
      .then(res => res.json()).then(data => { if (data.ok) { setOffers(data.offers ?? []); setCheckedAt(Date.now()); } }).catch(() => {});
    void refresh();
    const timer = setInterval(() => { setCheckedAt(Date.now()); void refresh(); }, 60_000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [shownHere]);
  const live = offers.filter(offer => new Date(offer.ends_at).getTime() > checkedAt);
  if (!shownHere || !live.length) return null;

  async function copy(code: string) {
    try { await navigator.clipboard.writeText(code); setCopied(code); setCopyError(false); }
    catch { setCopyError(true); }
  }

  return <section className={`${styles.offer} ${onRent ? styles.app : ""}`} aria-label="Christmas rental offers">
    <div className={styles.heading}>
      <div><p className={styles.eyebrow}><Sparkles size={14} aria-hidden="true"/> CHRISTMAS, THE WERIGO WAY</p>
        <h2>A little Christmas. A lot more Bali.</h2></div>
      {onRent ? <button type="button" className={styles.ride} onClick={onRent}>Choose your ride <ArrowUpRight size={17}/></button>
        : <Link className={styles.ride} href="/app/rent?start=1">Choose your ride <ArrowUpRight size={17}/></Link>}
    </div>
    <div className={styles.codes}>{live.map(offer => <div className={styles.card} key={offer.code}>
      <div><strong>{offer.percent}% off</strong><span>{offer.code === "NEWCHRISTMAS" ? "Your first booking" : "Returning customers"}</span></div>
      <button type="button" className={styles.code} onClick={() => void copy(offer.code)} aria-label={`Copy code ${offer.code}`}>
        <span>{offer.code}</span>{copied === offer.code ? <Check size={15} aria-hidden="true"/> : <Copy size={15} aria-hidden="true"/>}
      </button>
    </div>)}</div>
    <p className={styles.terms}>Book 20 Nov–31 Dec 2026 · Bali time. Rental only; delivery excluded. One discount per booking. Returning offer requires a previous confirmed or paid booking. Enter your code at checkout.</p>
    <span className={styles.feedback} role="status">{copyError ? "Select and copy the code above." : copied ? `${copied} copied` : ""}</span>
  </section>;
}
