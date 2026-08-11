"use client";

/**
 * Client side of the customer database.
 *
 * Forms call `captureLead` once, without awaiting it, right before
 * they hand the visitor over to WhatsApp. The request is sent with
 * `keepalive` so it survives the page losing focus, and every failure
 * is swallowed: storing a lead must never delay or break a booking.
 *
 * The server re-validates everything and recomputes prices, so what
 * is sent here is only ever what the visitor actually typed.
 */

export type LeadFormType = "booking_request" | "contact_message";

/** Stable per-form id so a double click stores one submission, not two. */
export function newSubmissionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Older browsers: good enough as an idempotency key.
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}-4000-8000-${Math.random().toString(16).slice(2, 14)}`;
}

/** Page, referrer, locale and any utm_* parameters in the URL. */
function attribution(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  return {
    sourcePage: window.location.pathname.slice(0, 300),
    referrer: document.referrer.slice(0, 500),
    locale: navigator.language ?? "",
    utmSource: params.get("utm_source")?.slice(0, 100) ?? "",
    utmMedium: params.get("utm_medium")?.slice(0, 100) ?? "",
    utmCampaign: params.get("utm_campaign")?.slice(0, 100) ?? "",
  };
}

/**
 * Send one form submission to the customer database. Fire and forget:
 * this returns immediately and never throws.
 */
export function captureLead(payload: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  const body = JSON.stringify({
    website: "", // honeypot, always empty from a real form
    ...attribution(),
    ...payload,
  });
  try {
    void fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      /* the booking continues on WhatsApp regardless */
    });
  } catch {
    /* blocked by an extension or offline: never surfaced to the visitor */
  }
}
