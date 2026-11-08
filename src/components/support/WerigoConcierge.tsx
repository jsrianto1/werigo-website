"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, ChevronDown, MessageCircle, Search, X } from "lucide-react";
import { T, useLanguage } from "@/components/i18n/LanguageProvider";
import { buildSupportWhatsAppUrl } from "@/lib/whatsapp";
import { supportFaqs } from "@/data/supportFaqs";
import { SupportForm, type EnquiryKind } from "./SupportForm";
import styles from "./Support.module.css";

const AVATAR = "/brand/werigo-concierge-polo.png";
export function WerigoConcierge() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const [open,setOpen] = useState(false);
  const [view,setView] = useState<"faq"|"message">("faq");
  const [kind,setKind] = useState<EnquiryKind>("question");
  const [search,setSearch] = useState("");
  const launcher = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  function changeView(next: "faq"|"message") { setView(next); scroll.current?.scrollTo({top:0}); }
  useEffect(()=>{
    if(!open) return;
    const oldOverflow=document.body.style.overflow; const returnTo=launcher.current; document.body.style.overflow="hidden"; close.current?.focus();
    function keys(event: KeyboardEvent) {
      if(event.key==="Escape") { event.preventDefault(); setOpen(false); return; }
      if(event.key!=="Tab") return;
      const list=[...(panel.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])')||[])].filter(element=>element.tabIndex!==-1&&element.getBoundingClientRect().width>0);
      const first=list[0],last=list[list.length-1];
      if(event.shiftKey&&document.activeElement===first) { event.preventDefault();last?.focus(); }
      else if(!event.shiftKey&&document.activeElement===last) { event.preventDefault();first?.focus(); }
    }
    document.addEventListener("keydown",keys);
    return ()=>{document.body.style.overflow=oldOverflow; document.removeEventListener("keydown",keys);returnTo?.focus();};
  },[open]);
  const matches = supportFaqs.filter(item=>`${t(item.question)} ${t(item.answer)}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  return <div className={styles.widget} data-checkout={pathname.startsWith("/book/checkout")}>
    <button type="button" ref={launcher} className={styles.launcher} onClick={()=>setOpen(value=>!value)} aria-expanded={open} aria-controls="werigo-concierge" aria-label={t("Open Werigo support")} hidden={open}>
      <span className={styles.avatarBase} aria-hidden="true"/><Image src={AVATAR} alt="" width={300} height={400} sizes="90px"/><span className={styles.chatBadge}><MessageCircle size={16} aria-hidden="true"/></span>
    </button>
    <button className={styles.backdrop} hidden={!open} onClick={()=>setOpen(false)} aria-label={t("Close Werigo support")} tabIndex={-1}/>
    <section ref={panel} id="werigo-concierge" role="dialog" aria-modal={open||undefined} aria-label={t("Werigo support")} className={styles.panel} hidden={!open}>
      <div className={styles.panelTop}><span className={styles.eyebrow}>WERIGO CONCIERGE</span><button type="button" ref={close} onClick={()=>setOpen(false)} aria-label={t("Close Werigo support")}><X size={18} aria-hidden="true"/></button></div>
      <div className={styles.greeting}><div><h2><T>A little help for your Bali.</T></h2><p><T>Quick answers, questions and new partnerships.</T></p></div><Image src={AVATAR} alt={t("Werigo concierge avatar")} width={300} height={400} sizes="150px"/></div>
      <div className={styles.tabs} role="group" aria-label={t("Choose a support option")}><button type="button" aria-pressed={view==="faq"} onClick={()=>changeView("faq")}><T>Quick answers</T></button><button type="button" aria-pressed={view==="message"} onClick={()=>changeView("message")}><T>Ask the team</T></button></div>
      <div className={styles.panelBody} ref={scroll}>
        <div hidden={view!=="faq"} className={styles.faqView}>
          <label className={styles.search}><Search size={15} aria-hidden="true"/><input type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder={t("Search quick answers")} aria-label={t("Search quick answers")}/></label>
          <div className={styles.faqs}>{matches.map(item=><details key={item.question}><summary><span>{t(item.question)}</span><ChevronDown size={15} aria-hidden="true"/></summary><p>{t(item.answer)}</p><Link href={item.href} onClick={()=>setOpen(false)}>{t(item.link)}<ArrowUpRight size={13} aria-hidden="true"/></Link></details>)}</div>
          {!matches.length&&<p className={styles.empty}><T>No matching answer yet. Ask our team below.</T></p>}
          <button className={styles.partnership} onClick={()=>{setKind("partnership");changeView("message");}}><span><strong><T>Let’s work together.</T></strong><small><T>Villas, cafés, travel and more.</T></small></span><ArrowUpRight size={19} aria-hidden="true"/></button>
        </div>
        <div hidden={view!=="message"}><SupportForm compact kind={kind} onKindChange={setKind}/></div>
      </div>
      <div className={styles.agent}><a href={buildSupportWhatsAppUrl()} target="_blank" rel="noopener noreferrer"><MessageCircle size={18} aria-hidden="true"/><span><T>Connect to a WhatsApp agent</T></span><ArrowUpRight size={17} aria-hidden="true"/></a><p><T>WhatsApp opens in a new window.</T> <T>Daily, 08:00–20:00 WITA.</T></p></div>
    </section>
  </div>;
}
