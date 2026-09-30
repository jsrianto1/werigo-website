type MarketingEvent = "view_vehicle" | "begin_checkout" | "whatsapp_click" | "booking_handoff";
type EventData = Record<string, string | number | string[]>;

declare global {
  interface Window {
    fbq?: (command: string, event: string, parameters?: EventData) => void;
    dataLayer?: Record<string, unknown>[];
  }
}

/** Never pass contact details, booking form values or WhatsApp URLs here. */
export function trackMarketingEvent(event: MarketingEvent, data: EventData = {}) {
  if (typeof window === "undefined") return;
  // Optional analytics must never interrupt navigation or a booking handoff.
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: `werigo_${event}`, page_path: window.location.pathname, ...data });
  } catch { /* A blocked tag must not affect booking. */ }
  try {
    const standard = { view_vehicle: "ViewContent", begin_checkout: "InitiateCheckout", whatsapp_click: "Contact" } as const;
    if (event === "booking_handoff") {
      // Opening WhatsApp does not prove a message was sent or a sale was made.
      window.fbq?.("trackCustom", "BookingHandoff", data);
    } else {
      window.fbq?.("track", standard[event], data);
    }
  } catch { /* A blocked pixel must not affect booking. */ }
}
