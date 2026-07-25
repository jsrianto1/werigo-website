"use client";

/**
 * Booking draft + records, persisted in browser storage for the
 * prototype. The shape mirrors what a future API would accept, so
 * swapping localStorage for a database later only changes this file.
 */

import type { RentalPeriod } from "@/lib/pricing";

export interface SearchState extends RentalPeriod {
  pickupSlug: string;
  returnSlug: string; // same as pickupSlug unless different return chosen
  differentReturn: boolean;
}

export interface CustomerInfo {
  fullName: string;
  email: string;
  whatsapp: string;
  nationality: string;
  hotelName: string;
  address: string;
  flightNumber: string;
  specialRequest: string;
  termsAccepted: boolean;
}

export interface BookingDraft {
  search: SearchState;
  vehicleSlug: string | null;
  quantity: number;
  extras: { id: string; quantity: number }[];
  promoCode: string;
  customer: CustomerInfo;
}

export interface BookingRecord extends BookingDraft {
  reference: string;
  createdAt: string;
  totalIDR: number;
}

const DRAFT_KEY = "werigo.booking.draft";
const RECORDS_KEY = "werigo.booking.records";

export const emptyCustomer: CustomerInfo = {
  fullName: "",
  email: "",
  whatsapp: "",
  nationality: "",
  hotelName: "",
  address: "",
  flightNumber: "",
  specialRequest: "",
  termsAccepted: false,
};

export function defaultSearch(): SearchState {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  const end = new Date(start);
  end.setDate(end.getDate() + 3);
  return {
    pickupSlug: "",
    returnSlug: "",
    differentReturn: false,
    startDate: toDateInput(start),
    startTime: "09:00",
    endDate: toDateInput(end),
    endTime: "09:00",
  };
}

export function toDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function loadDraft(): BookingDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as BookingDraft) : null;
  } catch {
    return null;
  }
}

export function saveDraft(draft: BookingDraft): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Storage full or blocked — booking continues in memory
  }
}

export function clearDraft(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DRAFT_KEY);
}

export function saveRecord(record: BookingRecord): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(RECORDS_KEY);
    const records: BookingRecord[] = raw ? JSON.parse(raw) : [];
    records.push(record);
    window.localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  } catch {
    // Non-fatal in prototype
  }
}

export function getRecord(reference: string): BookingRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(RECORDS_KEY);
    const records: BookingRecord[] = raw ? JSON.parse(raw) : [];
    return records.find((r) => r.reference === reference) ?? null;
  } catch {
    return null;
  }
}

/** WG-XXXXXX booking reference */
export function generateReference(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let ref = "";
  for (let i = 0; i < 6; i++) {
    ref += chars[Math.floor(Math.random() * chars.length)];
  }
  return `WG-${ref}`;
}
