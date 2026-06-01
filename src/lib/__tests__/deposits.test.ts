import { describe, it, expect } from 'vitest';
import { round2, clampPercent, computeDepositBreakdown } from '../deposits';

describe('round2', () => {
  it('rounds to 2 decimals', () => {
    expect(round2(10.005)).toBe(10.01);
    expect(round2(10.004)).toBe(10);
    expect(round2(33.333333)).toBe(33.33);
  });
});

describe('clampPercent', () => {
  it('clamps into 1..100 and floors to integer', () => {
    expect(clampPercent(0)).toBe(1);
    expect(clampPercent(150)).toBe(100);
    expect(clampPercent(20.7)).toBe(20);
    expect(clampPercent(NaN)).toBe(1);
  });
});

describe('computeDepositBreakdown', () => {
  it('splits total into deposit + balance for a deposit choice', () => {
    const r = computeDepositBreakdown({ totalUsd: 1000, choice: 'deposit', percent: 20 });
    expect(r.depositUsd).toBe(200);
    expect(r.balanceUsd).toBe(800);
    expect(r.depositPercent).toBe(20);
  });

  it('charges full and zero balance for a full choice', () => {
    const r = computeDepositBreakdown({ totalUsd: 1000, choice: 'full', percent: 20 });
    expect(r.depositUsd).toBe(1000);
    expect(r.balanceUsd).toBe(0);
    expect(r.depositPercent).toBeNull();
  });

  it('keeps deposit + balance == total after rounding', () => {
    const r = computeDepositBreakdown({ totalUsd: 333.33, choice: 'deposit', percent: 33 });
    expect(round2(r.depositUsd + r.balanceUsd)).toBe(333.33);
  });

  it('treats an out-of-range percent safely', () => {
    const r = computeDepositBreakdown({ totalUsd: 500, choice: 'deposit', percent: 999 });
    expect(r.depositPercent).toBe(100);
    expect(r.depositUsd).toBe(500);
    expect(r.balanceUsd).toBe(0);
  });
});
