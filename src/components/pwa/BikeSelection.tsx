import Image from "next/image";
import { Check, BatteryCharging } from "lucide-react";
import type { AppBike } from "@/data/appBikes";
import { specDisclaimer } from "@/data/vehicles";
import { formatIdr, ratesIdrPerDay } from "@/lib/pricing";

export function BikeSelection({ bikes, selected, onSelect }: { bikes: AppBike[]; selected?: AppBike; onSelect: (id: string) => void }) {
  return <>
    <p className="wr-step-intro">Start with the ride that fits your Bali plans. Then choose pick-up or delivery and your dates.</p>
    <div className="wg-bike-picker" role="radiogroup" aria-label="Choose a Wedison motorcycle">{bikes.map(bike => {
      const checked = selected?.id === bike.id;
      return <label key={bike.id} className={`wg-bike-card${checked ? " is-selected" : ""}`}>
        <input type="radio" name="rental-bike" value={bike.id} checked={checked} onChange={() => onSelect(bike.id)} aria-label={bike.displayName} aria-describedby={`bike-character-${bike.id}`}/>
        <span className="wg-bike-photo"><Image src={bike.image} alt={bike.imageAlt} fill sizes="(max-width: 760px) 45vw, 330px"/><span className="wg-bike-check" aria-hidden="true">{checked && <Check size={14}/>}</span></span>
        <span className="wg-bike-card-copy"><strong>{bike.model}</strong><span id={`bike-character-${bike.id}`} className="wg-bike-character">{bike.character}</span><span className="wg-bike-key-point">{bike.highlights[0].title}{bike.modelSlug === "edpower" && " claimed range"}</span><span className="wg-bike-charging"><BatteryCharging size={14}/>{bike.supercharge ? "SuperCharge compatible" : "220V home charging"}</span><span className="wg-bike-daily">{formatIdr(ratesIdrPerDay[bike.modelSlug].daily)}<small>/day</small></span></span>
      </label>;
    })}</div>
    <p className="wg-bike-rate-note">Daily rates shown are for 2–6-day rentals, per motorcycle. Longer-stay rates are calculated after you choose dates.</p>
    {selected && <section className="wg-bike-story" aria-labelledby="selected-bike-title">
      <div className="wg-bike-story-heading"><p className="wg-overline">MEET YOUR WEDISON</p><h2 id="selected-bike-title">Why choose {selected.model}?</h2><p>{selected.introduction}</p></div>
      <div className="wg-bike-story-photo"><Image src={selected.image} alt={selected.imageAlt} fill sizes="(max-width: 760px) 90vw, 660px"/></div>
      <p className="wg-bike-best-for"><span>BEST FOR</span>{selected.bestFor}</p>
      <dl className="wg-bike-highlights">{selected.highlights.map(highlight => <div key={highlight.title}><dt>{highlight.title}</dt><dd>{highlight.detail}</dd></div>)}</dl>
      {selected.minimumAge && <p className="wg-bike-age">{selected.model} is available to riders aged {selected.minimumAge} and over.</p>}
      <p className="wg-bike-spec-note">{specDisclaimer}</p>
    </section>}
    <p className="wg-bike-rate-note">Photos show the motorcycle model. Colour is subject to fleet availability and cannot be selected at this stage. Model availability is confirmed when you book.</p>
  </>;
}
