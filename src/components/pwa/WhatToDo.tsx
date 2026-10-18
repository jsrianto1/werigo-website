"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ArrowUpRight, MapPin, ExternalLink, Search, Waves, Leaf, Compass, BatteryCharging, Coffee } from "lucide-react";
import { appPlaces } from "@/data/appPlaces";
import { appActivities, type AppActivity } from "@/data/appActivities";
import photoCredits from "@/data/appActivityPhotoCredits.json";
import { googleMapsSearch, googleMapsDirections, googleMapsHop } from "@/lib/appPickup";
import { appCafes, cafeHops } from "@/data/appCafes";
import { ExploreGuideNav } from "./ExploreGuideNav";

const categories = ["All", "Café hopping", "Surfing", "Snorkeling", "Parasailing", "Rafting", "Culture", "Beach clubs", "Nature & pools"];
type Place = Omit<AppActivity, "tip" | "image" | "imageAlt" | "photoLabel"> & Partial<Pick<AppActivity, "tip" | "image" | "imageAlt" | "photoLabel">>;
const ideas: Place[] = [...appActivities, ...appPlaces, ...appCafes];

export function WhatToDo({ cafeGuide = false }: { cafeGuide?: boolean }) {
  const [category, setCategory] = useState(cafeGuide ? "Café hopping" : "All");
  const [query, setQuery] = useState("");
  const term = query.trim().toLowerCase();
  const places = ideas.filter(place => (category === "All" || category === place.category)
    && `${place.name} ${place.area} ${place.category} ${place.description}`.toLowerCase().includes(term));

  return <section className="wr-what wr-explore">
    <p className="wr-kicker">WHERE WE GO?</p>
    <h1 className="ra-page-title">{cafeGuide ? "Café hopping." : "What to do?"}</h1>
    <p className="ra-lead">{cafeGuide ? "Good coffee. A new favourite. One stop at a time." : "First waves. River days. A little more Bali."}</p>
    <ExploreGuideNav/>
    {category === "All" && !term && <a href="#bali-activities" className="wr-explore-feature">
      <Image src="/media/areas/canggu/hero.webp" alt="A surfer carrying a board along Canggu beach at sunset" fill sizes="(max-width: 760px) 100vw, 720px" priority />
      <span><small>MAKE A DAY OF IT</small><strong>Your next<br />Bali story.</strong><span>Find your kind of adventure<ArrowRight size={18} /></span></span>
    </a>}
    <div id="bali-activities" className="wr-activity-controls">
      <label className="ra-search"><Search size={19} aria-hidden="true" /><input aria-label={cafeGuide ? "Search cafés in Bali" : "Search places in Bali"} placeholder={cafeGuide ? "Pison, Gigi Susu, Canggu…" : "Surfing, snorkeling, Ubud…"} value={query} onChange={event => setQuery(event.target.value)} /></label>
      {!cafeGuide && <div className="ra-filters" role="group" aria-label="Filter places">{categories.map(value => <button key={value} type="button" aria-pressed={value === category} onClick={() => setCategory(value)}>{value}</button>)}</div>}
    </div>
    {category === "Café hopping" && !term && <section className="wg-hop-section" aria-labelledby="cafe-routes-title"><p className="wg-overline">MAKE A MORNING OF IT</p><h2 id="cafe-routes-title">Pick your café route.</h2><div className="wg-hop-grid">{cafeHops.map(hop => {
      const stops = hop.stops.map(id => appCafes.find(cafe => cafe.id === id)!);
      return <article className="wg-hop-card" key={hop.name}><p className="wr-activity-area"><MapPin size={13}/>{hop.area}</p><h3>{hop.name}</h3><p>{hop.description}</p><ol>{stops.map(stop => <li key={stop.id}>{stop.name}</li>)}</ol><a href={googleMapsHop(stops.map(stop => stop.query))} target="_blank" rel="noopener noreferrer">Open café route<ArrowUpRight size={16}/></a></article>;
    })}</div><p className="ra-footnote">Suggested stops, explored at your own pace. Check opening hours and road conditions in Google Maps. Food and drinks are paid separately.</p></section>}
    <div className="wr-activity-heading"><h2>{category === "All" ? "Find your next good day." : category}</h2><p role="status">{places.length} idea{places.length === 1 ? "" : "s"}</p></div>
    <div className="wr-activity-grid">{places.map(place => <article className={`wr-activity-card${place.image ? "" : " wr-activity-compact"}`} key={place.name}>
      {place.image && <div className="wr-activity-photo"><Image src={place.image} alt={place.imageAlt ?? place.name} fill sizes="(max-width: 760px) 100vw, 550px" style={place.imagePosition ? {objectPosition:place.imagePosition} : undefined} /><span>{place.category}</span></div>}
      <div className="wr-activity-copy">
        {place.photoLabel && <p className="wr-activity-photo-label">{place.photoLabel}</p>}
        {!place.image && <span className="wr-activity-mini-icon">{place.category === "Café hopping" ? <Coffee size={23}/> : place.category === "Nature & pools" ? <Leaf size={23} /> : <Waves size={23} />}</span>}
        <p className="wr-activity-area"><MapPin size={12} />{place.area}</p>
        <h3>{place.name}</h3>
        <p className="wr-activity-description">{place.description}</p>
        {place.tip && <p className="wr-activity-tip"><Compass size={15} /><span>{place.tip}</span></p>}
        <div className="wr-activity-links"><a href={googleMapsDirections(place.query)} target="_blank" rel="noopener noreferrer">{place.image ? "View area" : "Get directions"}<ArrowUpRight size={14} /></a><a href={place.website} target="_blank" rel="noopener noreferrer">{place.image ? "Plan your visit" : "Venue website"}<ExternalLink size={14} /></a></div>
      </div>
    </article>)}</div>
    {!places.length && <div className="ra-empty"><h2>Try another Bali plan.</h2><p>Search a place, an area or a different activity.</p><button type="button" className="ra-button" onClick={() => { setQuery(""); setCategory(cafeGuide ? "Café hopping" : "All"); }}>Show all ideas</button></div>}
    <Link href="/app/charge" className="wr-explore-charge"><BatteryCharging size={26} /><span><strong>A little charge before you go?</strong><small>Find Wedison charging locations</small></span><ArrowRight size={19} /></Link>
    <div className="wr-nearby"><h2>Your everyday Bali.</h2><div><Link href="/app/stays">Where to stay?<ArrowRight size={14}/></Link><Link href="/app/shop">Where to shop?<ArrowRight size={14}/></Link><Link href="/app/wellness">Workout & wellness<ArrowRight size={14}/></Link><a href={googleMapsSearch("Restaurants in Ubud Bali")} target="_blank" rel="noopener noreferrer">Restaurants<ExternalLink size={14}/></a></div></div>
    <p className="ra-footnote">Independent ideas, checked 18 October 2026. Activities are booked separately with operators. Confirm the meeting point, weather, entry requirements and current details before travelling. These are not Werigo partner or charging listings.</p>
    <details className="wr-photo-credits"><summary>About the activity photos</summary><p>Area and activity photos show the location or experience, not a specific operator. Images are cropped for display.</p>{photoCredits.map(credit => <p key={credit.src}><a href={credit.source} target="_blank" rel="noopener noreferrer">{credit.title.replace("File:", "")}</a> by {credit.author} · <a href={credit.licenseUrl} target="_blank" rel="noopener noreferrer">{credit.license}</a> · <a href={credit.src} target="_blank" rel="noopener noreferrer">Photo file</a></p>)}</details>
    <Link className="ra-button" href="/app/rent">Find a ride for your day<ArrowRight size={18} /></Link>
  </section>;
}

