"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowUpRight, BatteryCharging, ChevronDown, MapPin, Navigation, Search } from "lucide-react";
import charging from "@/data/appChargingStations.json";
import { buildSupportWhatsAppUrl } from "@/lib/whatsapp";

const areas = ["All", "Denpasar", "Badung", "Gianyar"];

export function ChargingDirectory() {
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("All");
  const term = query.trim().toLocaleLowerCase();
  const stations = charging.stations.filter(station =>
    (area === "All" || station.area === area.toUpperCase())
    && `${station.name} ${station.address}`.toLocaleLowerCase().includes(term));

  return <section className="wr-charging">
    <p className="wr-kicker">WEDISON SUPERCHARGE</p>
    <h1 className="ra-page-title">Charge &amp; go.</h1>
    <p className="ra-lead">Find a charging stop for your Bali day.</p>
    <section className="wg-charger-intro" aria-labelledby="meet-supercharge">
      <div><p className="wg-overline">MEET THE CHARGER</p><h2 id="meet-supercharge">This is Wedison SuperCharge.</h2><p>Wedison&apos;s fast-charging network for compatible electric motorcycles. Look for the Wedison name on the station.</p><p>Use the Wedison app to find a stop, check current pricing and manage your charging session.</p></div>
      <figure><Image src="/media/supercharge/supercharge-unit.webp" alt="Wedison SuperCharge unit, showing the screen and charging connectors" width={1200} height={1600} sizes="(max-width:760px) 120px, 190px" priority/><figcaption>Official Wedison SuperCharge unit</figcaption></figure>
    </section>
    <a className="wr-network-map" href={charging.networkMap} target="_blank" rel="noopener noreferrer">
      <span className="wr-network-icon"><BatteryCharging size={28} /></span>
      <span><strong>{charging.stations.length} listed locations</strong><small>Denpasar · Badung · Gianyar</small></span>
      <ArrowUpRight size={21} />
      <span className="wr-network-map-label">Open network map</span>
    </a>
    <p className="wr-charge-compatibility">For <b>Athena, Victory &amp; EdPower</b>. Bees uses home charging.</p>
    <details className="wg-charging-how">
      <summary>How charging works<ChevronDown size={18} aria-hidden="true"/></summary>
      <ol><li><strong>Find a supported stop.</strong><p>Check the location, access hours and availability in the Wedison app before you go.</p></li><li><strong>Connect &amp; start.</strong><p>Park and switch off your motorcycle. Follow the station and Wedison app instructions to connect the correct charger and start your session.</p></li><li><strong>Monitor &amp; finish.</strong><p>Follow progress in the Wedison app. End the session using the app or station instructions, then disconnect and return the connector.</p></li></ol>
      <p>Need a hand? <a href={buildSupportWhatsAppUrl("Hi Werigo! Please help me use a compatible Wedison SuperCharge station.")}>Ask Werigo before starting.</a> <a href="https://wedison.co/en/super-charge/" target="_blank" rel="noopener noreferrer">Official charging guide<ArrowUpRight size={13} aria-hidden="true"/></a></p>
    </details>
    <label className="ra-search"><Search size={19} aria-hidden="true" /><input aria-label="Search charging locations" value={query} onChange={event => setQuery(event.target.value)} placeholder="Location, area or address" /></label>
    <div className="ra-filters" role="group" aria-label="Charging area">{areas.map(value => <button key={value} type="button" aria-pressed={area === value} onClick={() => setArea(value)}>{value}</button>)}</div>
    <div className="wr-charging-list-heading"><h2>Charging spots</h2><p role="status">{stations.length} location{stations.length === 1 ? "" : "s"}</p></div>
    <p className="wr-charge-status">Listed locations, not live availability. Check charger status, access hours and pricing in the Wedison app before you go.</p>
    <div className="wr-charging-list">{stations.map(station => <article className="wr-charging-station" key={station.name}>
      <span className="wr-station-icon"><MapPin size={21} /></span>
      <div className="wr-station-copy"><p className="wr-station-area">{station.area}{station.category === "PT Pos Indonesia" ? " · POST OFFICE" : ""}</p><h3>{station.name}</h3><address>{station.address}</address>
        <a href={station.mapsUrl} target="_blank" rel="noopener noreferrer"><Navigation size={15} />Open in Google Maps<ArrowUpRight size={15} /></a>
      </div>
    </article>)}</div>
    {!stations.length && <div className="ra-empty"><h2>No stops found.</h2><p>Try another location or show all charging spots.</p><button type="button" className="ra-button" onClick={() => { setQuery(""); setArea("All"); }}>Show all locations</button></div>}
    <section className="wr-wedison-charge-app"><BatteryCharging size={28} /><h2>Charge with Wedison.</h2><p>Use the official Wedison SuperCharge app for charging information and supported sessions.</p><div><a href="https://apps.apple.com/id/app/wedison-supercharge/id6744643866" target="_blank" rel="noopener noreferrer">iPhone app<ArrowUpRight size={16} /></a><a href="https://play.google.com/store/apps/details?id=co.wedison.rider" target="_blank" rel="noopener noreferrer">Android app<ArrowUpRight size={16} /></a></div></section>
    <p className="wr-charging-source">Source: <a href={charging.source} target="_blank" rel="noopener noreferrer">Wedison Bali charging directory</a> · {charging.sourceDate}. Checked 18 October 2026. <a href={buildSupportWhatsAppUrl("Hi Werigo! Please help me confirm a compatible charging location, access hours and current pricing.")}>Ask Werigo for help.</a></p>
  </section>;
}
