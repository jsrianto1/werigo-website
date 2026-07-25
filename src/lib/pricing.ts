/**
 * Rental period logic. Werigo publishes no rental prices until
 * approved rates exist — rates are provided on request and confirmed
 * in the WhatsApp quote, so this module intentionally contains no
 * price calculations.
 */

/** Minimum rental length in hours */
export const MIN_RENTAL_HOURS = 24;

export interface RentalPeriod {
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endDate: string;
  endTime: string;
}

/** Whole rental days, rounded up. A 25-hour rental is 2 days. */
export function rentalDays(period: RentalPeriod): number {
  const ms = periodMs(period);
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export function periodMs(period: RentalPeriod): number {
  const start = new Date(`${period.startDate}T${period.startTime}:00`);
  const end = new Date(`${period.endDate}T${period.endTime}:00`);
  return end.getTime() - start.getTime();
}

export function isValidPeriod(period: RentalPeriod): boolean {
  return periodMs(period) >= MIN_RENTAL_HOURS * 60 * 60 * 1000;
}
