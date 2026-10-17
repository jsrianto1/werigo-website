"use client";
import { useState } from "react";
import { PickupLocation } from "@/components/pwa/PickupLocation";
import type { AppPickup } from "@/lib/appPickup";
import "leaflet/dist/leaflet.css";
import styles from "./DeliveryFeePicker.module.css";
export function DeliveryFeePicker({ area, pin, onConfirmed }: { area: string; pin: AppPickup | null; onConfirmed: (confirmed: boolean) => void }) {
  const [editing, setEditing] = useState(false);
  const choosing = !pin || editing;
  return <section className={styles.picker} aria-label="Delivery location">
    <div className={styles.header}><strong>{choosing ? "Delivery location" : "Delivery location confirmed"}</strong>{pin && <button type="button" onClick={() => setEditing(value => !value)}>{editing ? "Keep saved location" : "Change location"}</button>}</div>
    {choosing ? <PickupLocation area={area} onChooseArea={() => {}} onConfirmed={onConfirmed} onSaved={() => setEditing(false)}/>: <p className={styles.saved}>Your saved pin will be used for delivery. <a href={pin.mapsUrl} target="_blank" rel="noopener noreferrer">View in Google Maps ↗</a></p>}
  </section>;
}
