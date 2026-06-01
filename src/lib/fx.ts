/**
 * USD -> EGP foreign-exchange helper, shared by every server-side charge path
 * (checkout deposit, pay-via-link). Display-time conversion lives in the
 * client `use-currency` hook; this module is the authority for REAL charges.
 */

import { round2 } from './deposits';

export const FALLBACK_USD_TO_EGP = 47.5;

const CURRENCY_API =
  'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json';

/** Live USD->EGP rate from the public CDN, falling back to a constant. */
export async function fetchUsdToEgp(): Promise<number> {
  try {
    const res = await fetch(CURRENCY_API, { next: { revalidate: 3600 } });
    if (!res.ok) return FALLBACK_USD_TO_EGP;
    const data = (await res.json()) as { usd?: Record<string, number> };
    const rate = data.usd?.egp;
    return typeof rate === 'number' && rate > 0 ? rate : FALLBACK_USD_TO_EGP;
  } catch {
    return FALLBACK_USD_TO_EGP;
  }
}

/** Convert a USD amount to an EGP charge, rounded to 2dp. Pure. */
export function usdToEgp(usd: number, rate: number): number {
  const safeRate = Number.isFinite(rate) && rate > 0 ? rate : FALLBACK_USD_TO_EGP;
  const safeUsd = Number.isFinite(usd) && usd > 0 ? usd : 0;
  return round2(safeUsd * safeRate);
}
