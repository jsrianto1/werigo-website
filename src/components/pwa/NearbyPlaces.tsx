"use client";
import { useState } from "react";
import { ArrowUpRight, LocateFixed, MapPin } from "lucide-react";
import { googleMapsSearch, isBaliLocation, requestGps } from "@/lib/appPickup";

export function NearbyPlaces({ search, label }: { search: string; label: string }) {
  const [loading, setLoading] = useState(false);
  const [locationUrl, setLocationUrl] = useState("");
  const [error, setError] = useState("");
  async function locate() {
    setLoading(true); setError(""); setLocationUrl("");
    try {
      const point = await requestGps(navigator.geolocation);
      if (!isBaliLocation(point)) throw new Error("You appear to be outside Bali. Use the Bali search below to plan your visit.");
      setLocationUrl(googleMapsSearch(`${search} near ${point.latitude},${point.longitude}`));
    } catch (err) {
      setError(err instanceof Error ? err.message.replace("Paste a Google Maps link instead.", "Use the Maps search below instead.").replace("or paste your Google Maps link.", "or use the Maps search below.").replace("or paste a Google Maps link below.", "or use the Maps search below.").replace("or paste a Google Maps link.", "or use the Maps search below.") : "Location is unavailable. Use the Maps search below instead.");
    } finally { setLoading(false); }
  }
  return <section className="wg-nearby-panel" aria-label={`Find ${label} nearby`}><div><MapPin size={23}/><h2>A little closer to you.</h2></div><p>Find {label} around your current location in Google Maps.</p>
    <div className="wg-nearby-actions"><button className="ra-button" disabled={loading} onClick={() => void locate()}><LocateFixed size={17}/>{loading ? "Finding your location…" : "Use my location"}</button><a href={googleMapsSearch(`${search} in Bali`)} target="_blank" rel="noopener noreferrer">Browse Bali on Maps<ArrowUpRight size={16}/></a></div>
    {locationUrl && <p role="status"><a className="wg-nearby-result" href={locationUrl} target="_blank" rel="noopener noreferrer">Open nearby {label}<ArrowUpRight size={16}/></a></p>}
    {error && <p className="wg-location-error" role="alert">{error}</p>}
    <small>Location is requested only when you tap. Used for this Maps search, without saving it to your account. Results, opening hours and distance are shown by Google Maps.</small>
  </section>;
}
