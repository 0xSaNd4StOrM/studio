/**
 * Pure deposit math. No I/O. All amounts are USD (the app's at-rest currency).
 * The server is the only place allowed to compute these — the client never
 * supplies the percent or the split.
 */

export type PaymentChoice = 'deposit' | 'full';

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Clamp to an integer percent in [1, 100]; non-finite -> 1. */
export function clampPercent(p: number): number {
  if (!Number.isFinite(p)) return 1;
  return Math.min(100, Math.max(1, Math.floor(p)));
}

export interface DepositBreakdown {
  /** USD to charge online now. */
  depositUsd: number;
  /** USD still owed, collected on arrival. */
  balanceUsd: number;
  /** The percent actually applied, or null for a full payment. */
  depositPercent: number | null;
}

export function computeDepositBreakdown(input: {
  totalUsd: number;
  choice: PaymentChoice;
  percent: number;
}): DepositBreakdown {
  const total = round2(Math.max(0, input.totalUsd));

  if (input.choice !== 'deposit') {
    return { depositUsd: total, balanceUsd: 0, depositPercent: null };
  }

  const pct = clampPercent(input.percent);
  const depositUsd = round2((total * pct) / 100);
  const balanceUsd = round2(total - depositUsd);
  return { depositUsd, balanceUsd, depositPercent: pct };
}
