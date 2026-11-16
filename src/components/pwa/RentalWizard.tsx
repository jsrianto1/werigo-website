"use client";
import Image from "next/image";
import {useFleetAvailability} from "@/lib/useFleetAvailability";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarDays, Check, MapPin, Store, Truck } from "lucide-react";
import { getPickupPoint, deliveryPricingNote } from "@/data/locations";
import { estimateRental, formatIdr, isValidPeriod, rentalDays } from "@/lib/pricing";
import { appCheckoutUrl, rentalPlanError, type AppRentalSearch } from "@/lib/appRental";
import { clearAppPickup, readAppPickup } from "@/lib/appPickup";
import { site as siteConfig } from "@/lib/config";
import { PickupLocation } from "./PickupLocation";
import { AppHome } from "./AppHome";
import { BikeSelection } from "./BikeSelection";
import type { AppBike } from "@/data/appBikes";

type Step = "home" | "bikes" | "plan";
const titles = { home: "Where we go?", bikes: "Choose your Wedison.", plan: "Plan your Bali ride." };
export function RentalHome({ bikes, initial, today, begin = false, editPlan = false, firstName }: { bikes: AppBike[]; initial: AppRentalSearch; today: string; begin?: boolean; editPlan?: boolean; firstName?: string }) {
  const router = useRouter();
  const [search, setSearch] = useState(initial);
  const [step, setStep] = useState<Step>(begin ? editPlan ? "plan" : "bikes" : "home");
  const [method, setMethod] = useState<"pickup" | "delivery">(initial.pickup === "showroom" ? "pickup" : "delivery");
  const [pinConfirmed, setPinConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [leaving, setLeaving] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const footer = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const bar = footer.current;
    const wizard = bar?.closest<HTMLElement>(".wr-wizard");
    if (!bar || !wizard) return;
    const measure = () => wizard.style.setProperty("--wr-footer-height", `${Math.ceil(bar.getBoundingClientRect().height)}px`);
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(bar);
    window.addEventListener("resize", measure);
    return () => { observer?.disconnect(); window.removeEventListener("resize", measure); wizard.style.removeProperty("--wr-footer-height"); };
  }, [step]);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [step]);
  const selected = bikes.find(bike => bike.id === search.vehicle) ?? bikes[0];
  const period = { startDate: search.startDate, endDate: search.endDate, startTime: search.startTime, endTime: search.endTime };
  const valid = isValidPeriod(period) && search.startDate >= today && [search.startTime, search.endTime].every(time => time >= "08:00" && time <= "20:00");
  const availability=useFleetAvailability(valid?`${search.startDate}T${search.startTime}:00+08:00`:"",valid?`${search.endDate}T${search.endTime}:00+08:00`:"");
  const remaining=selected&&availability?.enabled?availability.stock[selected.modelSlug]:undefined;
  const estimate = selected && valid ? estimateRental(selected.modelSlug, period) : null;
  const area = getPickupPoint(search.pickup);
  const stages = ["Ride", "Dates & delivery", "Rider & helmets", "Review & pay"];
  function update(key: keyof AppRentalSearch, value: string) { setSearch(current => ({ ...current, [key]: value })); setError(""); }
  function go(next: Step) { setError(""); setStep(next); window.scrollTo({ top: 0, behavior: "instant" }); }
  function changeMethod(value: "pickup" | "delivery") {
    setMethod(value); setPinConfirmed(false); setError("");
    if (value === "pickup") update("pickup", "showroom");
    else if (search.pickup === "showroom") update("pickup", "");
  }
  function next() {
    if (!selected) { setError("Choose your motorcycle to continue."); return; }
    if (step === "bikes") { go("plan"); return; }
    let savedPin = false;
    try { savedPin = Boolean(readAppPickup(sessionStorage, search.pickup)); } catch {}
    const issue = rentalPlanError({
      validDates: valid, hasArea: Boolean(area), delivery: method === "delivery",
      confirmedPin: pinConfirmed, savedPin,
      availability: availability?.error || availability?.enabled && remaining === undefined ? "error" : availability ? "ready" : "loading", remaining,
    });
    if (issue) { setError(issue); return; }
    if (method === "pickup") { try { clearAppPickup(sessionStorage); } catch {} }
    setLeaving(true); router.push(appCheckoutUrl({ ...search, vehicle: selected.id }));
  }
  function back() { go(step === "plan" ? "bikes" : "home"); }
  if (step === "home") return <AppHome firstName={firstName} onRent={() => go("bikes")} />;
  return <div className={`wr-wizard wr-step-${step}`}>
    <div className="wr-step-top"><button className="wr-back" onClick={back} aria-label="Back one step"><ArrowLeft size={23}/></button><span>RENT · {step === "bikes" ? "Your ride" : "Dates & delivery"}</span><span>{step === "bikes" ? "1 / 4" : "2 / 4"}</span></div>
    <div className="wr-step-progress" aria-label={`Step ${step === "bikes" ? 1 : 2} of 4`}>{stages.map((name, index) => <i key={name} title={name} className={index <= (step === "bikes" ? 0 : 1) ? "is-done" : ""}/>)}</div>
    <h1 ref={heading} tabIndex={-1}>{titles[step]}</h1>
    {step !== "bikes" && selected && <div className="wg-selected-bike"><Image src={selected.image} alt={selected.imageAlt} width={90} height={65}/><span><small>YOUR WEDISON</small><strong>{selected.model}</strong></span><button type="button" onClick={() => go("bikes")}>Change model</button></div>}
    {step === "plan" && <><p className="wr-step-intro">Choose your dates and how to get your bike. Minimum 2 days · Bali time (WITA).</p><div className="wr-fields wr-rental-dates"><div className="wr-date-row"><label>Start date<input type="date" min={today} value={search.startDate} onInput={e => update("startDate", e.currentTarget.value)} onChange={e => update("startDate", e.target.value)}/></label><label>Return date<input type="date" min={search.startDate || today} value={search.endDate} onInput={e => update("endDate", e.currentTarget.value)} onChange={e => update("endDate", e.target.value)}/></label></div><div className="wr-date-row"><label>Start time<input type="time" min="08:00" max="20:00" value={search.startTime} onInput={e => update("startTime", e.currentTarget.value)} onChange={e => update("startTime", e.target.value)}/></label><label>Return time<input type="time" min="08:00" max="20:00" value={search.endTime} onInput={e => update("endTime", e.currentTarget.value)} onChange={e => update("endTime", e.target.value)}/></label></div></div><div className="wr-date-summary"><CalendarDays size={23}/><div><strong>{valid ? `${rentalDays(period)} days in Bali` : "Set your rental dates"}</strong><p>Daily rate updates automatically for your rental length.</p></div></div></>}
    {step === "plan" && <section className="wr-plan-handover" aria-labelledby="handover-heading"><h2 id="handover-heading">Pick-up or delivery?</h2><div role="radiogroup" aria-label="Pick-up or delivery" className="wr-handover-options">{[
      { value: "pickup" as const, icon: Store, title: "Pick up at Werigo", description: "Collect and return at our Denpasar showroom.", price: "No delivery fee" },
      { value: "delivery" as const, icon: Truck, title: "Deliver to me", description: "Choose your hotel, villa or meeting point on the map.", price: "Delivery & collection fee applies" },
    ].map(option => <label key={option.value} className={method === option.value ? "is-selected" : ""}><input type="radio" name="handover" value={option.value} checked={method === option.value} onChange={() => changeMethod(option.value)}/><option.icon size={28}/><span><strong>{option.title}</strong><small>{option.description}</small><b>{option.price}</b></span><span className="wr-choice-dot">{method === option.value && <Check size={13}/>}</span></label>)}</div>{method === "pickup" && <div className="wr-showroom"><MapPin size={22}/><div><strong>Werigo showroom</strong><p>{siteConfig.address.display}</p><p>Daily · 08:00–20:00 WITA</p><a href={siteConfig.mapsUrl} target="_blank" rel="noopener noreferrer">Open in Google Maps ↗</a></div></div>}</section>}
    {step === "plan" && method === "delivery" && <section className="wr-plan-location" aria-label="Delivery address"><p className="wr-step-intro">Search for your stay, use GPS or move the pin to your delivery entrance.</p><PickupLocation area={search.pickup === "showroom" ? "" : search.pickup} autoArea onConfirmed={setPinConfirmed} onSaved={pin => { update("pickup", pin.area); }}/><details className="wr-rental-disclosure"><summary>Delivery pricing</summary><p>{deliveryPricingNote}</p></details></section>}

    {step === "bikes" && <BikeSelection bikes={bikes} selected={selected} onSelect={id => update("vehicle", id)}/>}
    {step === "plan" && availability?.enabled &&<p className="wr-estimate-note" aria-live="polite">{availability.error?"Availability temporarily unavailable. Please try again.":(remaining??0)===0?"Not available for these dates. Please change dates or motorcycle.":"Available for your dates. Reserved when checkout is confirmed."}</p>}
    {error && <p role="alert" className="wr-error">{error}</p>}
    <div ref={footer} className="wr-wizard-footer">{step === "plan" && estimate && <div className="wr-price-caption"><span>{selected?.model} · {estimate.days} days · rental only</span><strong>{formatIdr(estimate.totalIdr)}</strong></div>}<button className="wr-primary" onClick={next} disabled={leaving || step === "bikes" && !selected}>{leaving ? "Opening your rental…" : step === "bikes" ? "Dates & delivery" : "Rider & helmets"}<ArrowRight size={21}/></button></div>
  </div>;
}
