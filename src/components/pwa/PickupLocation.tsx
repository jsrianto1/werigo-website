"use client";
import { useEffect, useRef, useState } from "react";
import { LocateFixed, MapPin, ExternalLink, Check, Search } from "lucide-react";
import { requestGps, isBaliLocation, googleMapsSearch, readAppPickup, saveAppPickup, clearAppPickup, validMapsUrl, type AppPickup } from "@/lib/appPickup";
import { deliveryAreaCenters, inferDeliveryArea, type DeliveryPlace } from "@/lib/deliveryPlaces";
import { deliveryFeeIdr } from "@/lib/deliveryPricing";
import { formatIdr } from "@/lib/pricing";
import { DeliveryMap, type MapPoint } from "./DeliveryMap";

export function PickupLocation({ area, autoArea = false, onConfirmed, onSaved }: { area: string; autoArea?: boolean; onConfirmed?: (confirmed: boolean) => void; onSaved?: (pin: AppPickup) => void }) {
  const onConfirmedRef = useRef(onConfirmed);
  useEffect(() => { onConfirmedRef.current = onConfirmed; }, [onConfirmed]);
  const [center, setCenter] = useState(deliveryAreaCenters[area] ?? deliveryAreaCenters.denpasar);
  const [point, setPoint] = useState<MapPoint | null>(null);
  const [label, setLabel] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DeliveryPlace[]>([]);
  const [searched, setSearched] = useState(false);
  const [pin, setPin] = useState<AppPickup | null>(null);
  const [link, setLink] = useState("");
  const [manual, setManual] = useState(false);
  const [busy, setBusy] = useState<"" | "gps" | "search" | "quote">("");
  const confirmation = useRef({ generation: 0 });
  const [error, setError] = useState("");
  useEffect(() => {
    const pending = confirmation.current;
    try {
      const saved = readAppPickup(sessionStorage, area);
      // Restore only an existing tab-scoped choice. Never request GPS on mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPin(saved); onConfirmedRef.current?.(Boolean(saved));
      if (saved?.point) { setPoint(saved.point); setCenter(saved.point); }
      if (saved?.label) { setLabel(saved.label); setQuery(saved.label.slice(0, 160)); }
    } catch { /* Search and map entry remain available. */ }
    return () => { pending.generation++; };
  }, [area]);
  useEffect(() => {
    if (!pin) return;
    const expires = pin.route?.expiresAt ?? pin.savedAt + 30 * 60000;
    const timer = setTimeout(() => {
      confirmation.current.generation++;
      setPin(null); setBusy(""); onConfirmedRef.current?.(false);
      setError("Your delivery quote expired. Confirm the location again to refresh the fee.");
      try { clearAppPickup(sessionStorage); } catch {}
    }, Math.max(0, expires - Date.now()));
    return () => clearTimeout(timer);
  }, [pin]);
  function invalidate() {
    confirmation.current.generation++;
    setPin(null); setBusy(""); setError(""); onConfirmed?.(false);
    try { clearAppPickup(sessionStorage); } catch {}
  }
  function moved(value: MapPoint) { invalidate(); setPoint(value); setLabel("Selected map location"); }
  function choose(value: MapPoint, name: string) {
    invalidate(); setPoint(value); setCenter(value); setLabel(name); setQuery(name.slice(0, 160)); setResults([]); setSearched(false);
  }
  async function search() {
    const term = query.trim();
    if (term.length < 3) { setError("Enter a hotel, villa or street name, then tap Search."); return; }
    const attempt = ++confirmation.current.generation;
    setBusy("search"); setError(""); setResults([]); setSearched(false);
    try {
      const response = await fetch("/api/delivery/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: term }) });
      const data = await response.json();
      if (attempt !== confirmation.current.generation) return;
      if (!response.ok || !data.ok) throw new Error(data.message || "Address search is unavailable. Try GPS or the map.");
      setResults(data.places); setSearched(true);
    } catch (reason) { if (attempt === confirmation.current.generation) setError(reason instanceof Error ? reason.message : "Search unavailable. Try GPS or the map."); }
    finally { if (attempt === confirmation.current.generation) setBusy(""); }
  }
  async function locate() {
    const attempt = ++confirmation.current.generation;
    setBusy("gps"); setError("");
    try {
      const value = await requestGps(navigator.geolocation);
      if (attempt !== confirmation.current.generation) return;
      if (!isBaliLocation(value)) throw new Error("Your GPS appears to be outside Bali. Search for your Bali stay or choose it on the map.");
      choose(value, "Current GPS location");
    } catch (reason) { if (attempt === confirmation.current.generation) setError(reason instanceof Error ? reason.message : "Could not get your location. Please try again."); }
    finally { if (attempt === confirmation.current.generation) setBusy(""); }
  }
  async function confirm(value: { point?: MapPoint; mapsUrl: string; label: string }) {
    const attempt = ++confirmation.current.generation;
    setBusy("quote"); setError("");
    try {
      const resolvedArea = value.point && (autoArea || !area) ? inferDeliveryArea(value.point) : area || "denpasar";
      let route: AppPickup["route"];
      if (value.point) {
        const res = await fetch("/api/delivery/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ area: resolvedArea, ...value.point }) });
        const result = await res.json();
        if (!res.ok || !result.ok) throw new Error(result.message || "Road route unavailable. Please try another entrance.");
        route = { distanceMeters: result.distanceMeters, token: result.token, expiresAt: result.expiresAt };
      }
      if (attempt !== confirmation.current.generation) return;
      const fresh: AppPickup = { version: 1, area: resolvedArea, ...value, route, savedAt: Date.now() };
      saveAppPickup(sessionStorage, fresh); setPin(fresh); onConfirmed?.(true); onSaved?.(fresh); setError("");
    } catch (reason) { if (attempt === confirmation.current.generation) setError(reason instanceof Error ? reason.message : "Unable to confirm this location. Please try again."); }
    finally { if (attempt === confirmation.current.generation) setBusy(""); }
  }
  function saveLink() {
    const mapsUrl = validMapsUrl(link);
    if (!mapsUrl) { setError("Paste an HTTPS Google Maps share link (up to 350 characters)."); return; }
    void confirm({ mapsUrl, label: "Shared Google Maps location" });
  }
  return <section className="wr-location" aria-label="Delivery location pin">
    <label className="wr-address-label" htmlFor="delivery-address-search">Hotel, villa or street address</label>
    <div className="wr-address-search"><input id="delivery-address-search" type="search" value={query} maxLength={160} placeholder="e.g. La Brisa, Canggu" autoComplete="off" onChange={event => { invalidate(); setQuery(event.target.value); setPoint(null); setLabel(""); setResults([]); setSearched(false); }} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); void search(); } }}/><button type="button" disabled={Boolean(busy)} onClick={() => void search()} aria-label="Search delivery address"><Search size={18}/><span>{busy === "search" ? "Searching…" : "Search"}</span></button></div>
    {results.length > 0 && <ul className="wr-address-results" aria-label="Matching delivery addresses">{results.map(result => <li key={`${result.latitude},${result.longitude},${result.label}`}><button type="button" onClick={() => choose(result, result.label)}><MapPin size={18}/><span>{result.label}</span></button></li>)}</ul>}
    {searched && results.length === 0 && <p className="wr-location-note" role="status">No matching places found. Try a nearby landmark, use GPS or move the map pin.</p>}
    <div className="wr-location-actions"><button type="button" onClick={() => void locate()} disabled={Boolean(busy)}><LocateFixed size={18}/>{busy === "gps" ? "Finding your location…" : "Use my GPS location"}</button><button type="button" onClick={() => setManual(value => !value)}>Add Maps link</button></div>
    <DeliveryMap center={center} onMove={moved}/>
    {error && <p className="wr-error" role="alert">{error}</p>}
    {manual && <div className="wr-pin-manual"><label>Google Maps share link<input type="url" value={link} onChange={event => { invalidate(); setPoint(null); setLabel(""); setLink(event.target.value); }} placeholder="https://maps.app.goo.gl/…" maxLength={350}/></label><button type="button" className="wr-done" disabled={Boolean(busy)} onClick={saveLink}>Save link for a delivery quote <Check size={16}/></button><p className="wr-location-note">A shared link without coordinates needs a quote from our team. Use the map or GPS for an automatic fee.</p></div>}
    {(point || pin) && <div className="wr-map-confirm"><MapPin size={23}/><div><strong>{pin ? "Delivery location confirmed" : "Check your delivery entrance"}</strong><p>{pin?.label || label || "Saved map location"}</p><a href={pin?.mapsUrl ?? googleMapsSearch(`${point!.latitude.toFixed(6)},${point!.longitude.toFixed(6)}`)} target="_blank" rel="noopener noreferrer">Open in Google Maps <ExternalLink size={13}/></a></div>{pin && <Check size={21}/>}</div>}
    {!pin && <button type="button" className="wr-confirm-pin" disabled={Boolean(busy) || !point} onClick={() => { if (point) void confirm({ point, label: label || "Selected map location", mapsUrl: googleMapsSearch(`${point.latitude.toFixed(6)},${point.longitude.toFixed(6)}`) }); }}>{busy === "quote" ? "Calculating delivery fee…" : "Confirm delivery location & fee"}<Check size={18}/></button>}
    {pin?.route && <div className="wr-route-price" role="status"><span>{(pin.route.distanceMeters / 1000).toFixed(1)} km by road from Werigo</span><strong>{formatIdr(deliveryFeeIdr(pin.route.distanceMeters))}</strong><p>Delivery & collection included. Free for monthly rentals.{!pin.route.token && " Estimate only here; our team confirms the quote before payment."}</p></div>}
    <p className="wr-location-note">Search sends your entered address to Photon / komoot. Confirming a pin sends its coordinates to FOSSGIS to calculate the road distance. Use GPS only at your delivery address. Your confirmed pin stays in this tab for 30 minutes. <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy details</a>.</p>
    <p className="wr-location-note">Search: <a href="https://photon.komoot.io/" target="_blank" rel="noopener noreferrer">Photon / komoot</a>. Routing: <a href="https://routing.openstreetmap.de/about.html" target="_blank" rel="noopener noreferrer">FOSSGIS / OSRM</a>. © OpenStreetMap contributors.</p>
  </section>;
}
