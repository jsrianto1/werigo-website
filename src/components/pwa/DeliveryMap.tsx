"use client";
import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import { MapPin } from "lucide-react";
export interface MapPoint { latitude: number; longitude: number; }
export function DeliveryMap({ center, onMove }: { center: MapPoint; onMove: (point: MapPoint) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const onMoveRef = useRef(onMove);
  const initial = useRef(center);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { onMoveRef.current = onMove; }, [onMove]);
  useEffect(() => {
    let cancelled = false;
    import("leaflet").then(L => {
      if (cancelled || !container.current) return;
      const instance = L.map(container.current, { scrollWheelZoom: false, minZoom: 9, maxZoom: 19, maxBounds: [[-9, 114.4], [-8, 115.8]], maxBoundsViscosity: 1 }).setView([initial.current.latitude, initial.current.longitude], 15);
      map.current = instance;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors' }).on("tileload", () => { setLoaded(true); setFailed(false); }).on("tileerror", () => setFailed(true)).addTo(instance);
      instance.on("moveend", () => { const point = instance.getCenter(); onMoveRef.current({ latitude: point.lat, longitude: point.lng }); });
      instance.on("click", event => instance.panTo(event.latlng));
    }).catch(() => setFailed(true));
    return () => { cancelled = true; map.current?.remove(); map.current = null; };
  }, []);
  useEffect(() => { map.current?.setView([center.latitude, center.longitude], Math.max(15, map.current.getZoom()), { animate: false }); }, [center.latitude, center.longitude]);
  return <div className="wr-map-wrap"><div ref={container} className="wr-delivery-map" role="region" aria-label="Interactive delivery map. Drag the map, tap a point or use the arrow keys to choose your location."/><span className="wr-map-center" aria-hidden="true"><MapPin size={39} fill="#171717" color="white"/><i/></span><span className="wr-map-instruction">Move map to set your pin</span>{!loaded && !failed && <span role="status" className="wr-map-loading">Loading map…</span>}{failed && <p className="wr-map-unavailable" role="status">Map tiles could not load. Try GPS or add your Google Maps share link below.</p>}</div>;
}
