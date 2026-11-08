"use client";
import { useId, useRef, useState } from "react";
import { ArrowUpRight, Check, LoaderCircle, Send } from "lucide-react";
import { T, useLanguage } from "@/components/i18n/LanguageProvider";
import { buildSupportWhatsAppUrl } from "@/lib/whatsapp";
import styles from "./Support.module.css";

export type EnquiryKind = "question" | "partnership";
export function SupportForm({ compact = false, kind, onKindChange }: { compact?: boolean; kind?: EnquiryKind; onKindChange?: (kind: EnquiryKind) => void }) {
  const { t, locale } = useLanguage();
  const id = useId();
  const [ownKind,setOwnKind] = useState<EnquiryKind>("question");
  const selected = kind ?? ownKind;
  const [fields,setFields] = useState({name:"",email:"",phone:"",company:"",message:""});
  const [pending,setPending] = useState(false);
  const [sent,setSent] = useState(false);
  const [error,setError] = useState("");
  const submission = useRef<string | null>(null);
  const website = useRef<HTMLInputElement>(null);
  function edit(field: keyof typeof fields, value: string) { setFields(previous=>({...previous,[field]:value})); setError(""); submission.current=null; }
  function changeKind(value: EnquiryKind) { if(onKindChange) onKindChange(value); else setOwnKind(value); submission.current=null; setError(""); }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if(pending) return;
    setPending(true); setError(""); submission.current ??= crypto.randomUUID();
    const abort = new AbortController(); const timeout = setTimeout(()=>abort.abort(),45_000);
    try {
      const response = await fetch("/api/support",{method:"POST",headers:{"Content-Type":"application/json"},signal:abort.signal,body:JSON.stringify({kind:selected,...fields,company:selected==="partnership"?fields.company:"",submissionId:submission.current,website:website.current?.value||"",locale,source:location.pathname})});
      const result = await response.json();
      if (!response.ok || !result.ok) {
        if(result.error==="submission_conflict") submission.current=null;
        const messages: Record<string,string> = {
          email_unavailable:"Email is unavailable right now. Please contact our team on WhatsApp.",
          rate_limited:"Please wait a few minutes before sending another message.",
          validation:"Check your name, email and message, then try again.",
          origin:"Please reload this page and try again.",
          submission_conflict:"Please try sending your message again.",
        };
        setError(messages[result.error]||"We couldn’t send your message. Please try again or use WhatsApp.");
      } else setSent(true);
    } catch { setError("We couldn’t confirm delivery. Please try again or use WhatsApp."); }
    finally { clearTimeout(timeout); setPending(false); }
  }
  if(sent) return <div className={`${styles.success} ${!compact?styles.formCard:""}`} role="status">
    <span><Check size={24} aria-hidden="true"/></span><h3><T>Message sent.</T></h3>
    <p><T>Your message has been sent to the Werigo and Wedison Bali teams. They’ll reply to the email you provided.</T></p>
    <button type="button" onClick={()=>{setSent(false);setFields({name:"",email:"",phone:"",company:"",message:""});submission.current=null;}}><T>Write another message</T><ArrowUpRight size={16} aria-hidden="true"/></button>
  </div>;
  return <form className={`${styles.form} ${!compact?styles.formCard:""}`} onSubmit={event=>void submit(event)} aria-label={t("Send a message to Werigo")}>
    {!compact&&<><span className={styles.eyebrow}>WERIGO & WEDISON BALI</span><h2><T>A question? A partnership?</T></h2><p className={styles.formIntro}><T>Tell us a little more. Our team will get back to you.</T></p></>}
    <fieldset disabled={pending}>
      <label><span><T>What can we help with?</T></span><select value={selected} onChange={event=>changeKind(event.target.value as EnquiryKind)}><option value="question">{t("A question")}</option><option value="partnership">{t("A partnership")}</option></select></label>
      <div className={styles.fieldPair}>
        <label htmlFor={`${id}-name`}><span><T>Name</T></span><input id={`${id}-name`} autoComplete="name" value={fields.name} onChange={event=>edit("name",event.target.value)} required minLength={2} maxLength={80}/></label>
        <label htmlFor={`${id}-email`}><span><T>Email</T></span><input id={`${id}-email`} type="email" autoComplete="email" value={fields.email} onChange={event=>edit("email",event.target.value)} required maxLength={254}/></label>
      </div>
      <label htmlFor={`${id}-phone`}><span><T>WhatsApp number (optional)</T></span><input id={`${id}-phone`} type="tel" autoComplete="tel" value={fields.phone} onChange={event=>edit("phone",event.target.value)} maxLength={40}/></label>
      {selected==="partnership"&&<label htmlFor={`${id}-company`}><span><T>Business / organisation (optional)</T></span><input id={`${id}-company`} autoComplete="organization" value={fields.company} onChange={event=>edit("company",event.target.value)} maxLength={120}/></label>}
      <label htmlFor={`${id}-message`}><span><T>Your message</T></span><textarea id={`${id}-message`} rows={4} value={fields.message} onChange={event=>edit("message",event.target.value)} required minLength={10} maxLength={2000} placeholder={t(selected==="partnership"?"Tell us about your business and collaboration idea.":"Ask about a rental, delivery, charging or anything else.")}/></label>
      <label className={styles.honeypot} aria-hidden="true">Website<input ref={website} name="website" tabIndex={-1} autoComplete="off" defaultValue=""/></label>
      <button className={styles.sendButton} type="submit" disabled={pending}>{pending?<LoaderCircle size={17} aria-hidden="true" className={styles.spinner}/>:<Send size={17} aria-hidden="true"/>}<T>{pending?"Sending…":"Send message"}</T></button>
    </fieldset>
    {error&&<div className={styles.error} role="alert"><p>{t(error)}</p><a href={buildSupportWhatsAppUrl()} target="_blank" rel="noopener noreferrer"><T>Contact us on WhatsApp</T><ArrowUpRight size={14} aria-hidden="true"/></a></div>}
    <p className={styles.privacy}><T>Your details are sent to the Werigo and Wedison Bali teams so they can reply to your request.</T> <a href="/privacy"><T>Privacy Policy</T></a></p>
  </form>;
}
