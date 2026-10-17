/** App-only navigation; the shared engine remains the source of truth for prices. */
export interface AppRentalSearch {
  pickup: string; startDate: string; startTime: string; endDate: string; endTime: string; vehicle: string; ref: string;
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
