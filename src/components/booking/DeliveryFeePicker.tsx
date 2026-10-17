"use client";
import { PickupLocation } from "@/components/pwa/PickupLocation";
import "leaflet/dist/leaflet.css";
import styles from "./DeliveryFeePicker.module.css";
export function DeliveryFeePicker({ area, confirmed, onConfirmed }: { area: string; confirmed: boolean; onConfirmed: (confirmed: boolean) => void }) {
  return <details className={styles.picker} open={!confirmed}><summary>{confirmed ? "Delivery location saved · view or change pin" : "Set delivery pin & calculate fee"}</summary><PickupLocation area={area} onChooseArea={() => {}} onConfirmed={onConfirmed}/></details>;
}
