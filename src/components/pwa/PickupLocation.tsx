"use client";
import { useEffect, useRef, useState } from "react";
import { LocateFixed, MapPin, ExternalLink, Check } from "lucide-react";
import { requestGps, isBaliLocation, googleMapsSearch, readAppPickup, saveAppPickup, clearAppPickup, validMapsUrl, type AppPickup } from "@/lib/appPickup";
import { deliveryFeeIdr } from "@/lib/deliveryPricing";
import { formatIdr } from "@/lib/pricing";
import { DeliveryMap, type MapPoint } from "./DeliveryMap";
const areaCenters: Record<string, MapPoint> = {
  canggu: { latitude: -8.6478, longitude: 115.1385 }, seminyak: { latitude: -8.684, longitude: 115.161 }, kuta: { latitude: -8.722, longitude: 115.172 }, ubud: { latitude: -8.5069, longitude: 115.2625 }, uluwatu: { latitude: -8.815, longitude: 115.105 }, jimbaran: { latitude: -8.771, longitude: 115.171 }, sanur: { latitude: -8.69, longitude: 115.26 }, denpasar: { latitude: -8.6359252, longitude: 115.2213422 }, "airport-domestic": { latitude: -8.7468, longitude: 115.167 }, "airport-international": { latitude: -8.7484, longitude: 115.1633 },
};
export function PickupLocation({ area, onChooseArea, onConfirmed, onSaved }: { area: string; onChooseArea: () => void; onConfirmed?: (confirmed: boolean) => void; onSaved?: () => void }) {
  const onConfirmedRef = useRef(onConfirmed);
  useEffect(() => { onConfirmedRef.current = onConfirmed; }, [onConfirmed]);
  const initial = areaCenters[area] ?? areaCenters.denpasar;
  const [center, setCenter] = useState(initial);
  const [point, setPoint] = useState(initial);
  const [pin, setPin] = useState<AppPickup | null>(null);
  const [link, setLink] = useState("");
  const [manual, setManual] = useState(false);
  const [busy, setBusy] = useState(false);
  const confirmation = useRef({ generation: 0 });
  const [error, setError] = useState("");
  useEffect(() => {
    const pending = confirmation.current;
    try {
      const saved = readAppPickup(sessionStorage, area);
      // Restore an external, tab-scoped choice; no location request on mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPin(saved); onConfirmedRef.current?.(Boolean(saved));
      if (saved?.point) { setPoint(saved.point); setCenter(saved.point); }
    } catch { /* Manual entry remains available. */ }
    return () => { pending.generation++; };
  }, [area]);
  function moved(value: MapPoint) {
    confirmation.current.generation++;
    setPoint(value); setPin(null); onConfirmed?.(false);
    try { clearAppPickup(sessionStorage); } catch {}
  }
  async function locate() {
    if (!area) { onChooseArea(); setError("Choose your delivery area first."); return; }
    const attempt = ++confirmation.current.generation;
    setBusy(true); setError("");
    try {
      const value = await requestGps(navigator.geolocation);
      if (attempt !== confirmation.current.generation) return;
      if (!isBaliLocation(value)) throw new Error("Your GPS appears to be outside Bali. Choose your Bali location on the map instead.");
      moved(value); setCenter(value);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not get your location. Please try again."); }
    finally { setBusy(false); }
  }
  async function confirm(value: AppPickup) {
    if (!area) { onChooseArea(); setError("Choose your delivery area first."); return; }
    const attempt = ++confirmation.current.generation;
    setBusy(true); setError("");
    try {
      let route: AppPickup["route"];
      if (value.point) {
        const res = await fetch("/api/delivery/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ area, ...value.point }) });
        const result = await res.json();
        if (!res.ok || !result.ok) throw new Error(result.message || "Road route unavailable. Please try another entrance.");
        route = { distanceMeters: result.distanceMeters, token: result.token, expiresAt: result.expiresAt };
      }
      if (attempt !== confirmation.current.generation) return;
      const fresh = { ...value, route, savedAt: Date.now() }; saveAppPickup(sessionStorage, fresh); setPin(fresh); onConfirmed?.(true); onSaved?.(); setError(""); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to confirm this location. Please try again."); }
    finally { setBusy(false); }
  }
  function saveLink() {
    const mapsUrl = validMapsUrl(link);
    if (!mapsUrl) { setError("Paste an HTTPS Google Maps share link (up to 350 characters)."); return; }
    void confirm({ version: 1, area, mapsUrl, savedAt: Date.now() });
  }
  return <section className="wr-location" aria-label="Delivery location pin">
    {area && <DeliveryMap center={center} onMove={moved}/>}
    <div className="wr-location-actions"><button type="button" onClick={() => void locate()} disabled={busy}><LocateFixed size={18}/>{busy ? "Please wait…" : "Use my GPS location"}</button><button type="button" onClick={() => setManual(value => !value)}>Add Maps link</button></div>
    {error && <p className="wr-error" role="alert">{error}</p>}
    {manual && <div className="wr-pin-manual"><label>Google Maps share link<input type="url" value={link} onChange={event => setLink(event.target.value)} placeholder="https://maps.app.goo.gl/…" maxLength={350}/></label><button type="button" className="wr-done" onClick={saveLink}>Save Maps link <Check size={16}/></button></div>}
    {area && <div className="wr-map-confirm"><MapPin size={23}/><div><strong>{pin ? "Delivery location confirmed" : "Check the entrance"}</strong><p>{pin && !pin.point ? "Your Google Maps share link is saved." : `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`}</p><a href={pin?.mapsUrl ?? googleMapsSearch(`${point.latitude.toFixed(6)},${point.longitude.toFixed(6)}`)} target="_blank" rel="noopener noreferrer">Open in Google Maps <ExternalLink size={13}/></a></div>{pin && <Check size={21}/>}</div>}
    {area && <p className="wr-location-note">Road routing: <a href="https://routing.openstreetmap.de/about.html" target="_blank" rel="noopener noreferrer">FOSSGIS / OSRM</a>, © OpenStreetMap contributors. <a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noopener noreferrer">Report a map issue</a>.</p>}
    {area && !pin && <button type="button" className="wr-confirm-pin" disabled={busy} onClick={() => void confirm({ version: 1, area, point, mapsUrl: googleMapsSearch(`${point.latitude.toFixed(6)},${point.longitude.toFixed(6)}`), savedAt: Date.now() })}>{busy ? "Calculating road distance…" : "Confirm location & calculate fee"} <Check size={18}/></button>}
    {pin?.route && <div className="wr-route-price" role="status"><span>{(pin.route.distanceMeters / 1000).toFixed(1)} km by road from Werigo</span><strong>{formatIdr(deliveryFeeIdr(pin.route.distanceMeters))}</strong><p>Delivery & collection included. Free for monthly rentals.{!pin.route.token && " Estimate only here; our team confirms the quote before payment."}</p></div>}
    <p className="wr-location-note">Confirming a map pin sends it to our OpenStreetMap routing provider to calculate road distance. <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy details</a>. Maps links without a pin need a manual quote. Use GPS only when you’re at the delivery address. Check that your chosen pin is in the selected area. Your confirmed location stays in this tab for 30 minutes.</p>
  </section>;
}
