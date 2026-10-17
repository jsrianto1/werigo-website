"use client";
import { useEffect, useState } from "react";
import { LocateFixed, MapPin, ExternalLink, Check } from "lucide-react";
import { requestGps, isBaliLocation, googleMapsSearch, readAppPickup, saveAppPickup, clearAppPickup, validMapsUrl, type AppPickup } from "@/lib/appPickup";
import { DeliveryMap, type MapPoint } from "./DeliveryMap";
const areaCenters: Record<string, MapPoint> = {
  canggu: { latitude: -8.6478, longitude: 115.1385 }, seminyak: { latitude: -8.684, longitude: 115.161 }, kuta: { latitude: -8.722, longitude: 115.172 }, ubud: { latitude: -8.5069, longitude: 115.2625 }, uluwatu: { latitude: -8.815, longitude: 115.105 }, jimbaran: { latitude: -8.771, longitude: 115.171 }, sanur: { latitude: -8.69, longitude: 115.26 }, denpasar: { latitude: -8.6359252, longitude: 115.2213422 }, "airport-domestic": { latitude: -8.7468, longitude: 115.167 }, "airport-international": { latitude: -8.7484, longitude: 115.1633 },
};
export function PickupLocation({ area, onChooseArea, onConfirmed }: { area: string; onChooseArea: () => void; onConfirmed?: (confirmed: boolean) => void }) {
  const initial = areaCenters[area] ?? areaCenters.denpasar;
  const [center, setCenter] = useState(initial);
  const [point, setPoint] = useState(initial);
  const [pin, setPin] = useState<AppPickup | null>(null);
  const [link, setLink] = useState("");
  const [manual, setManual] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    try {
      const saved = readAppPickup(sessionStorage, area);
      // Restore an external, tab-scoped choice; no location request on mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPin(saved); onConfirmed?.(Boolean(saved));
      if (saved?.point) { setPoint(saved.point); setCenter(saved.point); }
    } catch { /* Manual entry remains available. */ }
  }, [area, onConfirmed]);
  function moved(value: MapPoint) {
    setPoint(value); setPin(null); onConfirmed?.(false);
    try { clearAppPickup(sessionStorage); } catch {}
  }
  async function locate() {
    if (!area) { onChooseArea(); setError("Choose your delivery area first."); return; }
    setBusy(true); setError("");
    try {
      const value = await requestGps(navigator.geolocation);
      if (!isBaliLocation(value)) throw new Error("Your GPS appears to be outside Bali. Choose your Bali location on the map instead.");
      moved(value); setCenter(value);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not get your location. Please try again."); }
    finally { setBusy(false); }
  }
  function confirm(value: AppPickup) {
    if (!area) { onChooseArea(); setError("Choose your delivery area first."); return; }
    try { const fresh = { ...value, savedAt: Date.now() }; saveAppPickup(sessionStorage, fresh); setPin(fresh); onConfirmed?.(true); setError(""); }
    catch { setError("Your browser cannot keep this delivery location. Allow tab storage and try again."); }
  }
  function saveLink() {
    const mapsUrl = validMapsUrl(link);
    if (!mapsUrl) { setError("Paste an HTTPS Google Maps share link (up to 350 characters)."); return; }
    confirm({ version: 1, area, mapsUrl, savedAt: Date.now() });
  }
  return <section className="wr-location" aria-label="Delivery location pin">
    {area && <DeliveryMap center={center} onMove={moved}/>}
    <div className="wr-location-actions"><button type="button" onClick={() => void locate()} disabled={busy}><LocateFixed size={18}/>{busy ? "Finding your location…" : "Use my GPS location"}</button><button type="button" onClick={() => setManual(value => !value)}>Add Maps link</button></div>
    {error && <p className="wr-error" role="alert">{error}</p>}
    {manual && <div className="wr-pin-manual"><label>Google Maps share link<input type="url" value={link} onChange={event => setLink(event.target.value)} placeholder="https://maps.app.goo.gl/…" maxLength={350}/></label><button type="button" className="wr-done" onClick={saveLink}>Save Maps link <Check size={16}/></button></div>}
    {area && <div className="wr-map-confirm"><MapPin size={23}/><div><strong>{pin ? "Delivery location confirmed" : "Check the entrance"}</strong><p>{pin && !pin.point ? "Your Google Maps share link is saved." : `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`}</p><a href={pin?.mapsUrl ?? googleMapsSearch(`${point.latitude.toFixed(6)},${point.longitude.toFixed(6)}`)} target="_blank" rel="noopener noreferrer">Open in Google Maps <ExternalLink size={13}/></a></div>{pin && <Check size={21}/>}</div>}
    {area && !pin && <button type="button" className="wr-confirm-pin" onClick={() => confirm({ version: 1, area, point, mapsUrl: googleMapsSearch(`${point.latitude.toFixed(6)},${point.longitude.toFixed(6)}`), savedAt: Date.now() })}>Confirm this location <Check size={18}/></button>}
    <p className="wr-location-note">Use GPS only when you’re at the delivery address. Check that your chosen pin is in the selected area. Your confirmed location stays in this tab for 30 minutes.</p>
  </section>;
}
