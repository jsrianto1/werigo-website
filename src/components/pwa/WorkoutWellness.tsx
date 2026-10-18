"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ArrowUpRight, Compass, Dumbbell, ExternalLink, Flower2, MapPin, Search, Waves } from "lucide-react";
import { appWellness, wellnessCategories, wellnessMapsTerms, type WellnessCategory } from "@/data/appWellness";
import { googleMapsDirections } from "@/lib/appPickup";
import { ExploreGuideNav } from "./ExploreGuideNav";
import { NearbyPlaces } from "./NearbyPlaces";

export function WorkoutWellness() {
  const [category, setCategory] = useState<WellnessCategory>("All");
  const [query, setQuery] = useState("");
  const venues = appWellness.filter(venue => (category === "All" || (venue.categories as readonly string[]).includes(category)) && `${venue.name} ${venue.area} ${venue.neighbourhood} ${venue.categories.join(" ")} ${venue.description}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <section className="wr-explore wg-wellness"><p className="wr-kicker">WHERE WE GO?</p><h1 className="ra-page-title">Workout & wellness.</h1><p className="ra-lead">Find your movement. Make room to reset.</p><ExploreGuideNav/>
    <div className="wg-wellness-intro"><span className="wg-guide-emblem"><Flower2 size={30}/></span><p className="wg-overline">YOUR BALI ROUTINE</p><h2>Lift. Flow.<br/>Take it slow.</h2><p>From a reformer class to a gym session or a recovery afternoon. Find a place that fits your day.</p><ul className="wg-guide-tags"><li>Gym</li><li>Pilates</li><li>Yoga</li><li>Recovery & wellness</li></ul></div>
    <label className="ra-search"><Search size={19}/><input aria-label="Search workout and wellness places" value={query} onChange={event => setQuery(event.target.value)} placeholder="Pilates, yoga, Canggu, Ubud…"/></label>
    <div className="ra-filters" role="group" aria-label="Filter workout and wellness">{wellnessCategories.map(value => <button key={value} type="button" aria-pressed={category === value} onClick={() => setCategory(value)}>{value}</button>)}</div>
    <NearbyPlaces key={category} search={wellnessMapsTerms[category]} label={category === "All" ? "workout & wellness places" : category.toLowerCase() + " places"}/>
    <div className="wr-activity-heading"><h2>{category === "All" ? "Your next good session." : `${category}, your way.`}</h2><p role="status">{venues.length} {venues.length === 1 ? "place" : "places"}</p></div>
    <div className="wr-activity-grid">{venues.map(venue => <article className="wr-activity-card" key={venue.id}><div className="wr-activity-copy"><span className="wr-activity-mini-icon">{venue.categories.some(tag => tag === "Yoga" || tag === "Pilates") ? <Flower2 size={23}/> : venue.categories.some(tag => tag === "Recovery") ? <Waves size={23}/> : <Dumbbell size={23}/>}</span><p className="wr-activity-area"><MapPin size={13}/>{venue.neighbourhood}, {venue.area}</p><h3>{venue.name}</h3><ul className="wg-guide-tags">{venue.categories.map(tag => <li key={tag}>{tag}</li>)}</ul><p className="wr-activity-description">{venue.description}</p><p className="wg-venue-highlights">{venue.highlights.join(" · ")}</p><p className="wr-activity-tip"><Compass size={15}/><span>{venue.tip}</span></p><div className="wr-activity-links"><a href={googleMapsDirections(venue.query)} target="_blank" rel="noopener noreferrer">Get directions<ArrowUpRight size={14}/></a><a href={venue.website} target="_blank" rel="noopener noreferrer">Classes & details<ExternalLink size={14}/></a></div></div></article>)}</div>
    {!venues.length && <div className="ra-empty"><h2>Find a different kind of session.</h2><p>Try another activity or area.</p><button className="ra-button" onClick={() => {setCategory("All");setQuery("");}}>Show all places</button></div>}
    <p className="ra-footnote">Independent suggestions checked on 18 October 2026. These venues are not currently listed as Werigo partners. Book and pay directly with the venue; confirm schedules, access and pass inclusions. Werigo Ride Club benefits do not include classes or wellness treatments.</p>
    <Link className="ra-button" href="/app/rent">Find a ride for your routine<ArrowRight size={18}/></Link>
  </section>;
}
