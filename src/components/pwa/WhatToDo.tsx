"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ArrowUpRight, MapPin, ExternalLink, Search, Waves, Leaf, Compass, BatteryCharging } from "lucide-react";
import { appPlaces } from "@/data/appPlaces";
import { appActivities, type AppActivity } from "@/data/appActivities";
import photoCredits from "@/data/appActivityPhotoCredits.json";
import { googleMapsSearch, googleMapsDirections } from "@/lib/appPickup";

const categories = ["All", "Surfing", "Snorkeling", "Parasailing", "Rafting", "Culture", "Beach clubs", "Nature & pools"];
type Place = Omit<AppActivity, "tip" | "image" | "imageAlt" | "photoLabel"> & Partial<Pick<AppActivity, "tip" | "image" | "imageAlt" | "photoLabel">>;
const ideas: Place[] = [...appActivities, ...appPlaces];

export function WhatToDo() {
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const term = query.trim().toLowerCase();
  const places = ideas.filter(place => (category === "All" || category === place.category)
    && `${place.name} ${place.area} ${place.category} ${place.description}`.toLowerCase().includes(term));

  return <section className="wr-what wr-explore">
    <p className="wr-kicker">WHERE WE GO?</p>
    <h1 className="ra-page-title">What to do?</h1>
    <p className="ra-lead">First waves. River days. A little more Bali.</p>
    {category === "All" && !term && <a href="#bali-activities" className="wr-explore-feature">
      <Image src="/media/areas/canggu/hero.webp" alt="A surfer carrying a board along Canggu beach at sunset" fill sizes="(max-width: 760px) 100vw, 720px" priority />
      <span><small>MAKE A DAY OF IT</small><strong>Your next<br />Bali story.</strong><span>Find your kind of adventure<ArrowRight size={18} /></span></span>
    </a>}
    <div id="bali-activities" className="wr-activity-controls">
      <label className="ra-search"><Search size={19} aria-hidden="true" /><input aria-label="Search places in Bali" placeholder="Surfing, snorkeling, Ubud…" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <div className="ra-filters" role="group" aria-label="Filter places">{categories.map(value => <button key={value} type="button" aria-pressed={value === category} onClick={() => setCategory(value)}>{value}</button>)}</div>
    </div>
    <div className="wr-activity-heading"><h2>{category === "All" ? "Find your next good day." : category}</h2><p role="status">{places.length} idea{places.length === 1 ? "" : "s"}</p></div>
    <div className="wr-activity-grid">{places.map(place => <article className={`wr-activity-card${place.image ? "" : " wr-activity-compact"}`} key={place.name}>
      {place.image && <div className="wr-activity-photo"><Image src={place.image} alt={place.imageAlt ?? place.name} fill sizes="(max-width: 760px) 100vw, 550px" style={place.imagePosition ? {objectPosition:place.imagePosition} : undefined} /><span>{place.category}</span></div>}
      <div className="wr-activity-copy">
        {place.photoLabel && <p className="wr-activity-photo-label">{place.photoLabel}</p>}
        {!place.image && <span className="wr-activity-mini-icon">{place.category === "Nature & pools" ? <Leaf size={23} /> : <Waves size={23} />}</span>}
        <p className="wr-activity-area"><MapPin size={12} />{place.area}</p>
        <h3>{place.name}</h3>
        <p className="wr-activity-description">{place.description}</p>
        {place.tip && <p className="wr-activity-tip"><Compass size={15} /><span>{place.tip}</span></p>}
        <div className="wr-activity-links"><a href={googleMapsDirections(place.query)} target="_blank" rel="noopener noreferrer">{place.image ? "View area" : "Get directions"}<ArrowUpRight size={14} /></a><a href={place.website} target="_blank" rel="noopener noreferrer">{place.image ? "Plan your visit" : "Venue website"}<ExternalLink size={14} /></a></div>
      </div>
    </article>)}</div>
    {!places.length && <div className="ra-empty"><h2>Try another Bali plan.</h2><p>Search a place, an area or a different activity.</p><button type="button" className="ra-button" onClick={() => { setQuery(""); setCategory("All"); }}>Show all ideas</button></div>}
    <Link href="/app/charge" className="wr-explore-charge"><BatteryCharging size={26} /><span><strong>A little charge before you go?</strong><small>Find Wedison charging locations</small></span><ArrowRight size={19} /></Link>
    <div className="wr-nearby"><h2>Your everyday Bali.</h2><div>{["Cafés in Canggu Bali", "Gyms in Canggu Bali", "Restaurants in Ubud Bali"].map((search, index) => <a key={search} href={googleMapsSearch(search)} target="_blank" rel="noopener noreferrer">{["Cafés", "Gyms", "Restaurants"][index]}<ExternalLink size={14} /></a>)}</div><p>Explore nearby options in Google Maps.</p></div>
    <p className="ra-footnote">Independent ideas, checked 18 October 2026. Activities are booked separately with operators. Confirm the meeting point, weather, entry requirements and current details before travelling. These are not Werigo partner or charging listings.</p>
    <details className="wr-photo-credits"><summary>About the activity photos</summary><p>Area and activity photos show the location or experience, not a specific operator. Images are cropped for display.</p>{photoCredits.map(credit => <p key={credit.src}><a href={credit.source} target="_blank" rel="noopener noreferrer">{credit.title.replace("File:", "")}</a> by {credit.author} · <a href={credit.licenseUrl} target="_blank" rel="noopener noreferrer">{credit.license}</a> · <a href={credit.src} target="_blank" rel="noopener noreferrer">Photo file</a></p>)}</details>
    <Link className="ra-button" href="/app/rent">Find a ride for your day<ArrowRight size={18} /></Link>
  </section>;
}

