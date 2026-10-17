"use client";

import { useState } from "react";
import { ArrowUpRight, BatteryCharging, MapPin, Navigation, Search } from "lucide-react";
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
    <h1 className="ra-page-title">Recharge.<br />Keep exploring.</h1>
    <p className="ra-lead">Find a charging stop for your Bali day.</p>
    <a className="wr-network-map" href={charging.networkMap} target="_blank" rel="noopener noreferrer">
      <span className="wr-network-icon"><BatteryCharging size={28} /></span>
      <span><strong>{charging.stations.length} listed locations</strong><small>Denpasar · Badung · Gianyar</small></span>
      <ArrowUpRight size={21} />
      <span className="wr-network-map-label">Open network map</span>
    </a>
    <p className="wr-charge-compatibility">For <b>Athena, Victory &amp; EdPower</b>. Bees uses home charging.</p>
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
