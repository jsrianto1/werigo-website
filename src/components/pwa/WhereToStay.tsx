"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ArrowUpRight, BedDouble, ExternalLink, MapPin, Search } from "lucide-react";
import { appStays, ascottDirectoryUrl } from "@/data/appStays";
import { googleMapsDirections } from "@/lib/appPickup";
import { PlacePhoto } from "./PlacePhoto";
import { PlacePhotoCredits } from "./PlacePhotoCredits";
import { ExploreGuideNav } from "./ExploreGuideNav";

const areas = ["All", ...new Set(appStays.map(stay => stay.area))];
export function WhereToStay() {
  const [area, setArea] = useState("All");
  const [query, setQuery] = useState("");
  const stays = appStays.filter(stay => (area === "All" || stay.area === area) && `${stay.name} ${stay.area} ${stay.neighbourhood} ${stay.highlights.join(" ")}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <section className="wr-explore wg-stays"><p className="wr-kicker">WHERE WE GO?</p><h1 className="ra-page-title">Where to stay?</h1><p className="ra-lead">Find your island base. We’ll help with the ride.</p><ExploreGuideNav/>
    <div className="wg-partner-intro"><span className="wg-guide-emblem"><BedDouble size={28}/></span><div><p className="wg-overline">OUR PARTNER · ASCOTT</p><h2>Stay a little.<br/>Explore a lot.</h2><p>From Berawa beach days to slower Sanur mornings. Explore Bali stays across the Ascott family.</p><a href={ascottDirectoryUrl} target="_blank" rel="noopener noreferrer">Explore Ascott in Bali<ArrowUpRight size={16}/></a></div></div>
    <label className="ra-search"><Search size={19}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Hotel, area or kitchenette…" aria-label="Search Bali stays"/></label>
    <div className="ra-filters" role="group" aria-label="Filter stays by area">{areas.map(value => <button key={value} type="button" aria-pressed={area === value} onClick={() => setArea(value)}>{value}</button>)}</div>
    <div className="wr-activity-heading"><h2>{area === "All" ? "Find your kind of stay." : `Stay in ${area}.`}</h2><p role="status">{stays.length} {stays.length === 1 ? "stay" : "stays"}</p></div>
    <div className="wr-activity-grid">{stays.map(stay => <article className="wr-activity-card wg-stay-card" key={stay.id}>
      <PlacePhoto id={stay.id} label={`${stay.brand} · ${stay.area}`}/>
      <div className="wr-activity-copy"><p className="wr-activity-area"><MapPin size={13}/>{stay.neighbourhood}, {stay.area}</p><h3>{stay.name}</h3><p className="wg-stay-headline">{stay.headline}</p><p className="wr-activity-description">{stay.description}</p><ul className="wg-guide-tags">{stay.highlights.map(highlight => <li key={highlight}>{highlight}</li>)}</ul><p className="wg-guide-address">{stay.address}</p><div className="wr-activity-links"><a href={stay.website} target="_blank" rel="noopener noreferrer">View hotel & rates<ArrowUpRight size={14}/></a><a href={googleMapsDirections(`${stay.name} ${stay.address}`)} target="_blank" rel="noopener noreferrer">Get directions<ExternalLink size={14}/></a></div></div>
    </article>)}</div>
    {!stays.length && <div className="ra-empty"><h2>Try another island base.</h2><p>Search a hotel name or choose another area.</p><button className="ra-button" onClick={() => {setArea("All");setQuery("");}}>Show all stays</button></div>}
    <p className="ra-footnote">Checked against Ascott’s official pages on 18 October 2026. Book rooms directly with the hotel for current rates and availability. Confirm motorcycle delivery access with Werigo and the property. Ascott Star Rewards is separate from Werigo Ride Club.</p>
    <PlacePhotoCredits ids={stays.map(stay => stay.id)}/>
    <Link className="ra-button" href="/app/rent">Find a ride for your stay<ArrowRight size={18}/></Link>
  </section>;
}
