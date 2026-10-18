"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarDays, Check, MapPin, Store, Truck } from "lucide-react";
import { getPickupPoint, deliveryPricingNote } from "@/data/locations";
import { estimateRental, formatIdr, isValidPeriod, rentalDays } from "@/lib/pricing";
import { appCheckoutUrl, type AppRentalSearch } from "@/lib/appRental";
import { clearAppPickup, readAppPickup } from "@/lib/appPickup";
import { site as siteConfig } from "@/lib/config";
import { PickupLocation } from "./PickupLocation";
import { AppHome } from "./AppHome";
import { BikeSelection } from "./BikeSelection";
import type { AppBike } from "@/data/appBikes";

type Step = "home" | "handover" | "location" | "dates" | "bikes";
const titles = { home: "Where we go?", handover: "How will you get your bike?", location: "Where should we deliver?", dates: "When’s your Bali ride?", bikes: "Choose your Wedison." };
export function RentalHome({ bikes, initial, today, begin = false, firstName }: { bikes: AppBike[]; initial: AppRentalSearch; today: string; begin?: boolean; firstName?: string }) {
  const router = useRouter();
  const [search, setSearch] = useState(initial);
  const [step, setStep] = useState<Step>(begin ? "bikes" : "home");
  const [method, setMethod] = useState<"pickup" | "delivery">(initial.pickup === "showroom" ? "pickup" : "delivery");
  const [pinConfirmed, setPinConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [leaving, setLeaving] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [step]);
  const selected = bikes.find(bike => bike.id === search.vehicle) ?? bikes[0];
  const period = { startDate: search.startDate, endDate: search.endDate, startTime: search.startTime, endTime: search.endTime };
  const valid = isValidPeriod(period) && search.startDate >= today && [search.startTime, search.endTime].every(time => time >= "08:00" && time <= "20:00");
  const estimate = selected && valid ? estimateRental(selected.modelSlug, period) : null;
  const area = getPickupPoint(search.pickup);
  const stages: Step[] = method === "pickup" ? ["bikes", "handover", "dates"] : ["bikes", "handover", "location", "dates"];
  function update(key: keyof AppRentalSearch, value: string) { setSearch(current => ({ ...current, [key]: value })); setError(""); }
  function go(next: Step) { setError(""); setStep(next); window.scrollTo({ top: 0, behavior: "instant" }); }
  function next() {
    if (step === "bikes") {
      if (!selected) { setError("Choose your motorcycle to continue."); return; }
      go("handover");
    } else if (step === "handover") {
      if (method === "pickup") { update("pickup", "showroom"); try { clearAppPickup(sessionStorage); } catch {} go("dates"); }
      else { if (search.pickup === "showroom") update("pickup", ""); go("location"); }
    } else if (step === "location") {
      let saved = false;
      try { saved = Boolean(readAppPickup(sessionStorage, search.pickup)); } catch {}
      if (!area || search.pickup === "showroom" || !pinConfirmed || !saved) { setError("Search for your address or use GPS, then confirm your delivery location and fee."); return; }
      go("dates");
    } else if (step === "dates") {
      if (!valid) { setError("Choose at least 2 days, starting today or later. Pick-up and return times are 08:00–20:00 WITA."); return; }
      if (!selected) { go("bikes"); return; }
      if (!area) { go("handover"); return; }
      if (method === "delivery") {
        try { if (!readAppPickup(sessionStorage, search.pickup)) { go("location"); setError("Your delivery pin expired. Please confirm it again."); return; } } catch { go("location"); return; }
      }
      setLeaving(true); router.push(appCheckoutUrl({ ...search, vehicle: selected.id }));
    }
  }
  function back() { go(step === "dates" ? method === "pickup" ? "handover" : "location" : step === "location" ? "handover" : step === "handover" ? "bikes" : "home"); }
  if (step === "home") return <AppHome firstName={firstName} onRent={() => go("bikes")} />;
  return <div className={`wr-wizard wr-step-${step}`}>
    <div className="wr-step-top"><button className="wr-back" onClick={back} aria-label="Back one step"><ArrowLeft size={23}/></button><span>RENT · {step === "bikes" ? "Your ride" : step === "handover" ? "Pick-up" : step === "location" ? "Location" : "Dates"}</span><span>Bali</span></div>
    <div className="wr-step-progress" aria-hidden="true">{stages.map((name, index) => <i key={name} className={index <= stages.indexOf(step) ? "is-done" : ""}/>)}</div>
    <h1 ref={heading} tabIndex={-1}>{titles[step]}</h1>
    {step !== "bikes" && selected && <div className="wg-selected-bike"><Image src={selected.image} alt={selected.imageAlt} width={90} height={65}/><span><small>YOUR WEDISON</small><strong>{selected.model}</strong></span><button type="button" onClick={() => go("bikes")}>Change model</button></div>}
    {step === "handover" && <><p className="wr-step-intro">One Wedison. Two ways to start.</p><div role="radiogroup" aria-label="Pick-up or delivery" className="wr-handover-options">{[
      { value: "pickup" as const, icon: Store, title: "Pick up at Werigo", description: "Collect and return at our Denpasar showroom.", price: "No delivery fee" },
      { value: "delivery" as const, icon: Truck, title: "Deliver to me", description: "Choose your hotel, villa or meeting point on the map.", price: "Delivery & collection fee applies" },
    ].map(option => <label key={option.value} className={method === option.value ? "is-selected" : ""}><input type="radio" name="handover" value={option.value} checked={method === option.value} onChange={() => setMethod(option.value)}/><option.icon size={28}/><span><strong>{option.title}</strong><small>{option.description}</small><b>{option.price}</b></span><span className="wr-choice-dot">{method === option.value && <Check size={13}/>}</span></label>)}</div>{method === "pickup" && <div className="wr-showroom"><MapPin size={22}/><div><strong>Werigo showroom</strong><p>{siteConfig.address.display}</p><p>Daily · 08:00–20:00 WITA</p><a href={siteConfig.mapsUrl} target="_blank" rel="noopener noreferrer">Open in Google Maps ↗</a></div></div>}</>}
    {step === "location" && <><p className="wr-step-intro">Search for your stay, use GPS or move the pin to your delivery entrance.</p><PickupLocation area={search.pickup === "showroom" ? "" : search.pickup} autoArea onConfirmed={setPinConfirmed} onSaved={pin => { update("pickup", pin.area); }}/><p className="wr-estimate-note">{deliveryPricingNote}</p></>}
    {step === "dates" && <><p className="wr-step-intro">Minimum 2 days. All times are Bali time (WITA).</p><div className="wr-fields wr-rental-dates"><div className="wr-date-row"><label>Start date<input type="date" min={today} value={search.startDate} onInput={e => update("startDate", e.currentTarget.value)} onChange={e => update("startDate", e.target.value)}/></label><label>Return date<input type="date" min={search.startDate || today} value={search.endDate} onInput={e => update("endDate", e.currentTarget.value)} onChange={e => update("endDate", e.target.value)}/></label></div><div className="wr-date-row"><label>Start time<input type="time" min="08:00" max="20:00" value={search.startTime} onInput={e => update("startTime", e.currentTarget.value)} onChange={e => update("startTime", e.target.value)}/></label><label>Return time<input type="time" min="08:00" max="20:00" value={search.endTime} onInput={e => update("endTime", e.currentTarget.value)} onChange={e => update("endTime", e.target.value)}/></label></div></div><div className="wr-date-summary"><CalendarDays size={23}/><div><strong>{valid ? `${rentalDays(period)} days in Bali` : "Set your rental dates"}</strong><p>{method === "pickup" ? "Pick-up & return at the Werigo showroom" : `Delivery & collection · ${area?.name || "Choose an area"}`}</p></div></div></>}
    {step === "bikes" && <BikeSelection bikes={bikes} selected={selected} onSelect={id => update("vehicle", id)}/>}
    {error && <p role="alert" className="wr-error">{error}</p>}
    <div className="wr-wizard-footer">{step === "dates" && estimate && <div className="wr-price-caption"><span>{selected?.model} · {estimate.days} days · rental only</span><strong>{formatIdr(estimate.totalIdr)}</strong></div>}<button className="wr-primary" onClick={next} disabled={leaving || step === "bikes" && !selected}>{leaving ? "Opening your rental…" : step === "location" ? "Continue with this location" : step === "bikes" ? `Continue with ${selected?.model ?? "your ride"}` : step === "dates" ? "Continue to rental details" : "Continue"}<ArrowRight size={21}/></button></div>
  </div>;
}
