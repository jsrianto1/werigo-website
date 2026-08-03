import "server-only";

/**
 * Daily USD to IDR reference rate from the free Frankfurter API
 * (ECB reference data, no API key). Fetched server-side only and
 * cached by Next's data cache for 6 hours, so product cards never
 * call the external service themselves. On any failure the site
 * silently shows IDR only: pricing and booking never depend on this.
 */
export interface UsdIdrRate {
  /** IDR per 1 USD. */
  rate: number;
  /** Reference date reported by the source, YYYY-MM-DD. */
  date: string;
}

const ENDPOINT = "https://api.frankfurter.dev/v2/rate/USD/IDR";

export async function getUsdIdrRate(): Promise<UsdIdrRate | null> {
  try {
    const res = await fetch(ENDPOINT, {
      next: { revalidate: 21600 }, // 6 hours
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { rate?: number; date?: string };
    if (typeof data.rate !== "number" || data.rate <= 0) return null;
    return { rate: data.rate, date: data.date ?? "" };
  } catch {
    return null;
  }
}
