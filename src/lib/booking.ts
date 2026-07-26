"use client";

/**
 * Client-side booking helpers.
 *
 * localStorage is used ONLY for temporary form drafts — the booking
 * database is Supabase, written exclusively through POST /api/bookings.
 * sessionStorage briefly hands the server's confirmation payload
 * (booking code + WhatsApp URL) to the confirmation screen.
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


const DRAFT_KEY = "werigo.booking.draft";
const CONFIRMATION_KEY = "werigo.booking.confirmation";

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




/* ---------- Confirmation handoff (sessionStorage, transient) ---------- */

export interface ConfirmationPayload {
  bookingCode: string;
  whatsappUrl: string;
  booking: {
    bookingCode: string;
    fullName: string;
    vehicleModel: string;
    quantity: number;
    pickupArea: string;
    pickupAddress: string | null;
    returnArea: string;
    returnAddress: string | null;
    startAt: string;
    endAt: string;
    customerNotes: string | null;
  };
}

export function cacheConfirmation(payload: ConfirmationPayload): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(CONFIRMATION_KEY, JSON.stringify(payload));
  } catch {
    // Confirmation still shows the code from the URL
  }
}

export function readConfirmation(code: string): ConfirmationPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(CONFIRMATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConfirmationPayload;
    return parsed.bookingCode === code ? parsed : null;
  } catch {
    return null;
  }
}
