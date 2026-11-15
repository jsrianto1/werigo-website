/** App-only navigation; the shared engine remains the source of truth for prices. */
export interface AppRentalSearch {
  pickup: string; startDate: string; startTime: string; endDate: string; endTime: string; vehicle: string; ref: string;
}
/** The shorter plan screen must keep every original booking gate. */
export function rentalPlanError(plan: {
  validDates: boolean;
  hasArea: boolean;
  delivery: boolean;
  confirmedPin: boolean;
  savedPin: boolean;
  availability: "loading" | "error" | "ready";
  remaining?: number;
}): string | null {
  if (!plan.validDates) return "Choose at least 2 days, starting today or later. Pick-up and return times are 08:00–20:00 WITA.";
  if (!plan.hasArea || plan.delivery && (!plan.confirmedPin || !plan.savedPin)) return "Search for your address or use GPS, then confirm your delivery location and fee.";
  if (plan.availability === "loading") return "Checking availability for your dates. Please try again in a moment.";
  if (plan.availability === "error") return "Availability could not be confirmed. Please retry or contact Werigo.";
  if (plan.remaining === 0) return "This motorcycle is fully booked for these dates. Choose another model or dates.";
  return null;
}
export function defaultAppDates(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Makassar", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (name: string) => parts.find(value => value.type === name)!.value;
  const today = new Date(`${part("year")}-${part("month")}-${part("day")}T00:00:00Z`);
  const day = (offset: number) => new Date(today.getTime() + offset * 86400000).toISOString().slice(0, 10);
  return { today: day(0), startDate: day(1), endDate: day(4), startTime: "09:00", endTime: "09:00" };
}
export function appCheckoutUrl(search: AppRentalSearch) {
  const query = new URLSearchParams({ pickup: search.pickup, return: search.pickup, startDate: search.startDate, startTime: search.startTime, endDate: search.endDate, endTime: search.endTime, vehicle: search.vehicle, ...(search.ref ? { ref: search.ref } : {}) });
  return `/app/rent/checkout?${query}`;
}
