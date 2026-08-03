/**
 * Currency display helpers. IDR is the official pricing and
 * calculation currency everywhere; USD is a muted estimate only.
 * Pure module (no imports) so tests can run it directly under Node.
 */

/** Approved wording for the USD-estimate explanation. */
export const usdEstimateNote =
  "US dollar amounts are estimates from a daily reference rate. IDR is the quoted currency.";

/**
 * "≈ US$3.88" style estimate for an IDR amount. Two decimals under
 * US$100, whole dollars above. Null when no rate is available: the
 * caller renders IDR only.
 */
export function formatUsdApprox(
  amountIdr: number,
  idrPerUsd: number | null | undefined
): string | null {
  if (!idrPerUsd || idrPerUsd <= 0) return null;
  const usd = amountIdr / idrPerUsd;
  const display =
    usd < 100
      ? usd.toFixed(2)
      : Math.round(usd).toLocaleString("en-US");
  return `≈ US$${display}`;
}
