/**
 * Pure pricing helpers for unified addons. No server-only imports — safe to
 * call from client components and from the booking pipeline.
 */
import type { AddonPricingMode, AddonQuantityMode, CartAddon, UpsellItem } from '@/types';

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export type PriceAddonInput = {
  variantId?: string;
  pax?: number;
  hours?: number;
  /** Generic multiplier honored only when pricingMode === 'flat' or as a
   * fallback when no pax/hours apply. */
  quantity?: number;
};

export type PricedAddon = {
  unitPrice: number;
  totalPrice: number;
  currency: string;
  pricingMode: AddonPricingMode;
  variantId?: string;
  variantName?: string;
  /** Echoed back for downstream code so the cart line can serialize without
   * re-deriving these from the input map. */
  pax?: number;
  hours?: number;
  quantity: number;
};

/**
 * Compute the unit & total price for an addon under the supplied selection.
 *
 * Pricing math:
 * - `flat`               total = unitPrice × quantity
 * - `per_person`         total = unitPrice × pax
 * - `per_hour`           total = unitPrice × hours
 * - `per_person_per_hour` total = unitPrice × pax × hours
 *
 * Quantity controls (`pax`, `hours`) default to 1 when missing so the
 * function is safe to call before the user touches the picker.
 */
export function priceAddon(item: UpsellItem, opts: PriceAddonInput = {}): PricedAddon {
  const variant = opts.variantId
    ? (item.variants ?? []).find((v) => v.id === opts.variantId)
    : undefined;
  const unitPrice = Number(variant?.price ?? item.price ?? 0);
  const pricingMode = item.pricingMode ?? 'flat';
  const currency = item.currency ?? 'USD';

  const pax =
    pricingMode === 'per_person' || pricingMode === 'per_person_per_hour'
      ? Math.max(1, Math.trunc(Number(opts.pax ?? 1)))
      : opts.pax;
  const hours =
    pricingMode === 'per_hour' || pricingMode === 'per_person_per_hour'
      ? Math.max(0.5, Number(opts.hours ?? item.defaultHours ?? 1))
      : opts.hours;
  const quantity = Math.max(1, Math.trunc(Number(opts.quantity ?? 1)));

  let total = 0;
  switch (pricingMode) {
    case 'per_person':
      total = unitPrice * (pax ?? 1);
      break;
    case 'per_hour':
      total = unitPrice * (hours ?? 1);
      break;
    case 'per_person_per_hour':
      total = unitPrice * (pax ?? 1) * (hours ?? 1);
      break;
    case 'flat':
    default:
      total = unitPrice * quantity;
      break;
  }

  return {
    unitPrice: roundCurrency(unitPrice),
    totalPrice: roundCurrency(total),
    currency,
    pricingMode,
    variantId: opts.variantId,
    variantName: variant?.name,
    pax,
    hours,
    quantity,
  };
}

/** Build a `CartAddon` snapshot for a specific selection. */
export function buildCartAddon(item: UpsellItem, opts: PriceAddonInput = {}): CartAddon {
  const priced = priceAddon(item, opts);
  return {
    upsellItemId: item.id,
    variantId: priced.variantId,
    name: item.name,
    variantName: priced.variantName,
    unitPrice: priced.unitPrice,
    pricingMode: priced.pricingMode,
    pax: priced.pax,
    hours: priced.hours,
    quantity: priced.quantity,
    totalPrice: priced.totalPrice,
    currency: priced.currency,
  };
}

/** Initial selection state for the picker, matching the addon's defaults. */
export function defaultAddonSelection(
  item: UpsellItem,
  defaultPax: number = 1
): PriceAddonInput {
  const qm: AddonQuantityMode = item.quantityMode ?? 'none';
  const out: PriceAddonInput = { quantity: 1 };
  if (qm === 'pax' || qm === 'pax_and_hours') {
    out.pax = Math.max(item.minPax ?? 1, Math.min(item.maxPax ?? defaultPax, defaultPax));
  }
  if (qm === 'hours' || qm === 'pax_and_hours') {
    out.hours = Number(
      item.defaultHours ?? item.minHours ?? 1
    );
  }
  return out;
}
