"use client";
import Image from "next/image";
import Link from "next/link";
import { useSyncExternalStore, useState } from "react";
import { ArrowUpRight, Bookmark, Search, MapPin, ArrowRight, Bike } from "lucide-react";
import { appGuides } from "@/data/appGuides";
import { buildSupportWhatsAppUrl } from "@/lib/whatsapp";

const key = "werigo.app.saved-guides.v1";
const change = "werigo-saved-guides";
function subscribe(callback: () => void) { window.addEventListener("storage", callback); window.addEventListener(change, callback); return () => { window.removeEventListener("storage", callback); window.removeEventListener(change, callback); }; }
function snapshot() { try { return localStorage.getItem(key) ?? "[]"; } catch { return "[]"; } }
const emptySnapshot = () => "[]";
function readSaved(raw: string): string[] { try { const value: unknown = JSON.parse(raw); return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : []; } catch { return []; } }

export function Explore() {
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const saved = readSaved(useSyncExternalStore(subscribe, snapshot, emptySnapshot));
  function toggle(slug: string) {
    const next = saved.includes(slug) ? saved.filter(value => value !== slug) : [...saved, slug];
    try { localStorage.setItem(key, JSON.stringify(next)); window.dispatchEvent(new Event(change)); setNotice(next.includes(slug) ? "Guide saved on this device." : "Guide removed from saved places."); }
    catch { setNotice("Your browser could not save this guide. You can still open it below."); }
  }
  const shown = appGuides.filter(guide => (category === "All" || category === guide.category || category === "Saved" && saved.includes(guide.slug)) && `${guide.title} ${guide.area} ${guide.summary}`.toLowerCase().includes(search.toLowerCase()));
  return <>
    <section className="ra-welcome"><div><p className="ra-eyebrow">A little further. A little more Bali.</p><h1>Your island.<br/><em>Your kind of ride.</em></h1><p>Find a new corner of Bali, save your next stop, and get there with Werigo.</p></div><Link href="/app/rent" className="ra-quick-rent"><Bike/><span>Find my ride</span><ArrowUpRight/></Link></section>
    <section className="ra-hero"><Image src="/media/areas/uluwatu/hero.webp" alt="The coastline at Uluwatu in Bali" fill sizes="(max-width: 1100px) 100vw, 1100px" preload className="ra-cover"/><div className="ra-hero-shade"/><div className="ra-hero-copy"><span className="ra-photo-label"><MapPin size={14}/> Uluwatu · Area guide</span><h2>Leave a little room<br/>for the coast.</h2><Link href="/app/places/uluwatu" className="ra-light-button">Explore the south <ArrowRight size={18}/></Link></div><span className="ra-hero-note">Less planning.<br/>More discovering.</span></section>
    <div className="ra-section-title"><div><p className="ra-eyebrow">Where next?</p><h2>Find your Bali.</h2></div><span>Four area guides to start</span></div>
    <label className="ra-search"><Search size={20}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search an area or a moment…" aria-label="Search Bali guides"/></label>
    <div className="ra-filters" role="group" aria-label="Filter guides">{["All", "Beach", "Nature", "Culture", "Food & gyms", "Saved"].map(value => <button key={value} aria-pressed={category === value} onClick={() => setCategory(value)}>{value}{value === "Saved" && saved.length > 0 ? ` (${saved.length})` : ""}</button>)}</div>
    <p className="ra-sr-status" role="status">{notice || `${shown.length} guides shown`}</p>
    <div className="ra-guides">{shown.map(guide => <article className="ra-guide" key={guide.slug}><div className="ra-guide-image"><Link href={`/app/places/${guide.slug}`}><Image src={guide.image} alt={`${guide.area}, Bali`} fill sizes="(max-width: 640px) 100vw, (max-width: 1000px) 50vw, 33vw" className="ra-cover"/></Link><button aria-label={`${saved.includes(guide.slug) ? "Unsave" : "Save"} ${guide.area}`} aria-pressed={saved.includes(guide.slug)} onClick={() => toggle(guide.slug)} className="ra-save"><Bookmark size={19} fill={saved.includes(guide.slug) ? "currentColor" : "none"}/></button><span className="ra-guide-category">{guide.category}</span></div><div className="ra-guide-copy"><p><MapPin size={13}/>{guide.area}</p><h3><Link href={`/app/places/${guide.slug}`}>{guide.title}</Link></h3><span>{guide.summary}</span><Link className="ra-text-link" href={`/app/places/${guide.slug}`}>Open guide <ArrowUpRight size={17}/></Link></div></article>)}</div>
    {shown.length === 0 && <section className="ra-empty"><h3>{category === "Food & gyms" ? "Good places deserve a proper introduction." : "Your next discovery is still out there."}</h3><p>{category === "Food & gyms" ? "Restaurant and gym guides will appear after our team visits and reviews each place. Merchant offers are not available yet." : category === "Saved" ? "Tap the bookmark on a guide to save it on this device." : "Try another area or clear your search."}</p>{category === "Food & gyms" ? <a className="ra-text-link" href={buildSupportWhatsAppUrl()}>Suggest a place <ArrowUpRight size={17}/></a> : <button className="ra-button" onClick={() => { setSearch(""); setCategory("All"); }}>See all guides</button>}</section>}
    <section className="ra-club-banner"><div><p className="ra-eyebrow">Werigo Ride Club</p><h2>Good rides.<br/>Something back.</h2><p>Earn Ride Points on completed, paid rentals. Keep your next ride in sight.</p><Link href="/app/rewards" className="ra-button">Meet your rewards <ArrowRight size={17}/></Link></div><Image src="/media/membership/ride-club-premium-v2.webp" width={1536} height={1024} alt="Silver, Gold and Platinum Werigo Ride Club cards" sizes="(max-width: 700px) 100vw, 500px"/></section>
    <p className="ra-footnote">These are area guides, not merchant endorsements. Plan your route and charging before travelling. Saved guides stay on this device.</p>
  </>;
}
