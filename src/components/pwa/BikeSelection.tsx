import Image from "next/image";
import { Check, BatteryCharging, ChevronDown } from "lucide-react";
import type { AppBike } from "@/data/appBikes";
import { specDisclaimer } from "@/data/vehicles";
import { formatIdr, ratesIdrPerDay, retailMonthlyIdr } from "@/lib/pricing";

export function BikeSelection({ bikes, selected, onSelect }: { bikes: AppBike[]; selected?: AppBike; onSelect: (id: string) => void }) {
  return <>
    <p className="wr-step-intro">Start with the ride that fits your Bali plans. Then choose pick-up or delivery and your dates.</p>
    <div className="wg-bike-picker" role="radiogroup" aria-label="Choose a Wedison motorcycle">{bikes.map(bike => {
      const checked = selected?.id === bike.id;
      const rates = ratesIdrPerDay[bike.modelSlug];
      const monthlyPackage = bike.modelSlug === "edpower";
      const primaryRates = [
        { label: "Daily · 2–6 days", price: rates.daily },
        { label: "Monthly · 1 month+", price: monthlyPackage ? retailMonthlyIdr.edpower : rates.monthly, monthly: monthlyPackage },
      ];
      const longerStayRates = [
        { label: "7–13 days", price: rates.weekly },
        { label: "14–20 days", price: rates.twoWeeks },
        { label: "21 days–<1 month", price: rates.threeWeeks },
      ];
      return <div key={bike.id} className={`wg-bike-card${checked ? " is-selected" : ""}`}>
        <label className="wg-bike-choice">
        <input type="radio" name="rental-bike" value={bike.id} checked={checked} onChange={() => onSelect(bike.id)} aria-label={bike.displayName} aria-describedby={`bike-character-${bike.id}`}/>
        <span className="wg-bike-photo"><Image src={bike.image} alt={bike.imageAlt} fill sizes="(max-width: 760px) 45vw, 330px"/><span className="wg-bike-check" aria-hidden="true">{checked && <Check size={14}/>}</span></span>
        <span className="wg-bike-card-copy"><strong>{bike.model}</strong><span id={`bike-character-${bike.id}`} className="wg-bike-character">{bike.character}</span><span className="wg-bike-key-point">{bike.highlights[0].title}{bike.modelSlug === "edpower" && " claimed range"}</span><span className="wg-bike-charging"><BatteryCharging size={14}/>{bike.supercharge ? "SuperCharge compatible" : "220V home charging"}</span>
          <span className="wg-bike-rates" aria-label={`${bike.model} rental rates`}>{primaryRates.map(row => <span key={row.label} className={`wg-bike-rate-row${row.monthly ? " is-monthly-package" : ""}`}><span>{row.label}</span><span><b>{formatIdr(row.price)}</b><small>/{row.monthly ? "month" : "day"}</small></span></span>)}</span>
        </span>
        </label>
        <details className="wg-bike-all-rates">
          <summary aria-label={`See all rates for ${bike.model}`}>See all rates<ChevronDown size={15} aria-hidden="true"/></summary>
          <div className="wg-bike-expanded-rates" aria-label={`${bike.model} longer-stay rates`}>{longerStayRates.map(row => <div className="wg-bike-rate-row" key={row.label}><span>{row.label}</span><span><b>{formatIdr(row.price)}</b><small>/day</small></span></div>)}
            <p>{monthlyPackage ? "Rp2,800,000 per calendar month. Extra days: Rp93,333/day." : "Monthly rates are per actual rental day."}</p>
          </div>
        </details>
      </div>;
    })}</div>
    <p className="wg-bike-rate-note">IDR per motorcycle. Your dates set the rate and total. Open “See all rates” to compare longer stays.</p>
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
