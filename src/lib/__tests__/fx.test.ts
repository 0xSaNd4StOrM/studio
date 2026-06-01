import { describe, it, expect } from 'vitest';
import { usdToEgp, FALLBACK_USD_TO_EGP } from '../fx';

describe('usdToEgp', () => {
  it('multiplies and rounds to 2 decimals', () => {
    expect(usdToEgp(100, 47.5)).toBe(4750);
    expect(usdToEgp(33.33, 47.5)).toBe(1583.17); // IEEE-754: 33.33*47.5 = 1583.1749...9545 (below halfway) -> 1583.17
  });

  it('uses the fallback rate when given a non-finite rate', () => {
    expect(usdToEgp(10, NaN)).toBe(usdToEgp(10, FALLBACK_USD_TO_EGP));
  });

  it('never returns a negative charge', () => {
    expect(usdToEgp(-5, 47.5)).toBe(0);
  });
});
