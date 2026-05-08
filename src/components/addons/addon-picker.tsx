'use client';

import Image from 'next/image';
import { Minus, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/hooks/use-currency';
import { priceAddon } from '@/lib/addons/pricing';
import type { UpsellItem } from '@/types';

/** Per-addon selection state managed by the parent and persisted into the cart. */
export type AddonSelection = {
  enabled: boolean;
  variantId?: string;
  pax?: number;
  hours?: number;
  /** Multiplier for `flat` pricing. Always defaults to 1. */
  quantity?: number;
};

export type AddonSelectionMap = Record<string, AddonSelection>;

export type AddonPickerProps = {
  addons: UpsellItem[];
  selected: AddonSelectionMap;
  onChange: (next: AddonSelectionMap) => void;
  /** Default pax for `per_person` / `per_person_per_hour` items (e.g. tour
   * party size). Falls back to 1 if not provided. */
  defaultPax?: number;
  /** When true the picker hides its outer label, used inside the cart. */
  hideTitle?: boolean;
  className?: string;
};

function clamp(value: number, min: number | null | undefined, max: number | null | undefined) {
  let next = value;
  if (typeof min === 'number') next = Math.max(min, next);
  if (typeof max === 'number') next = Math.min(max, next);
  return next;
}

export function AddonPicker({
  addons,
  selected,
  onChange,
  defaultPax = 1,
  hideTitle = false,
  className,
}: AddonPickerProps) {
  const { format: formatMoney } = useCurrency();

  if (addons.length === 0) return null;

  const update = (id: string, patch: Partial<AddonSelection>) => {
    onChange({ ...selected, [id]: { ...(selected[id] ?? { enabled: false }), ...patch } });
  };

  return (
    <div className={cn('space-y-3', className)}>
      {!hideTitle && (
        <Label className="flex items-center gap-1.5 text-sm font-semibold">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> Optional extras
        </Label>
      )}
      <ul className="space-y-3">
        {addons.map((addon) => {
          const sel = selected[addon.id] ?? { enabled: false };
          const variantId = sel.variantId;
          const pax = sel.pax ?? Math.max(addon.minPax ?? 1, defaultPax);
          const hours = sel.hours ?? Number(addon.defaultHours ?? addon.minHours ?? 1);
          const quantity = sel.quantity ?? 1;
          const priced = priceAddon(addon, {
            variantId,
            pax,
            hours,
            quantity,
          });
          const showsPax =
            addon.quantityMode === 'pax' || addon.quantityMode === 'pax_and_hours';
          const showsHours =
            addon.quantityMode === 'hours' || addon.quantityMode === 'pax_and_hours';
          const showsQuantity = addon.quantityMode === 'none' && addon.pricingMode === 'flat';
          const variants = (addon.variants ?? []).filter((v) => Boolean(v.id));

          return (
            <li
              key={addon.id}
              className={cn(
                'rounded-2xl border bg-background p-4 transition-shadow',
                sel.enabled && 'shadow-sm ring-1 ring-primary/30'
              )}
            >
              <div className="flex items-start gap-3">
                {addon.imageUrl ? (
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border">
                    <Image
                      src={addon.imageUrl}
                      alt={addon.name}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border bg-muted">
                    <Sparkles className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-semibold leading-snug">{addon.name}</p>
                      {addon.description ? (
                        <p className="mt-0.5 line-clamp-2 break-words text-xs text-muted-foreground">
                          {addon.description}
                        </p>
                      ) : null}
                    </div>
                    <Switch
                      checked={sel.enabled}
                      onCheckedChange={(value) => update(addon.id, { enabled: value === true })}
                      aria-label={`${sel.enabled ? 'Remove' : 'Add'} ${addon.name}`}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatMoney(Number(addon.price))} · {pricingLabel(addon)}
                  </p>
                </div>
              </div>

              {sel.enabled && (
                <div className="mt-3 space-y-3 border-t pt-3">
                  {variants.length > 0 && (
                    <div>
                      <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Option
                      </Label>
                      <Select
                        value={variantId ?? '__base__'}
                        onValueChange={(value) =>
                          update(addon.id, {
                            variantId: value === '__base__' ? undefined : value,
                          })
                        }
                      >
                        <SelectTrigger className="h-10 w-full">
                          <SelectValue placeholder="Select an option" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__base__">
                            Base · {formatMoney(Number(addon.price))}
                          </SelectItem>
                          {variants.map((variant) => (
                            <SelectItem key={variant.id} value={variant.id!}>
                              {variant.name} · {formatMoney(Number(variant.price))}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {showsPax && (
                      <Stepper
                        label="People"
                        value={pax}
                        min={addon.minPax ?? 1}
                        max={addon.maxPax ?? 99}
                        step={1}
                        onChange={(next) =>
                          update(addon.id, {
                            pax: clamp(next, addon.minPax ?? 1, addon.maxPax ?? null),
                          })
                        }
                      />
                    )}
                    {showsHours && (
                      <Stepper
                        label="Hours"
                        value={hours}
                        min={addon.minHours ?? 0.5}
                        max={addon.maxHours ?? 24}
                        step={0.5}
                        onChange={(next) =>
                          update(addon.id, {
                            hours: clamp(next, addon.minHours ?? 0.5, addon.maxHours ?? null),
                          })
                        }
                      />
                    )}
                    {showsQuantity && (
                      <Stepper
                        label="Quantity"
                        value={quantity}
                        min={1}
                        max={99}
                        step={1}
                        onChange={(next) => update(addon.id, { quantity: Math.max(1, next) })}
                      />
                    )}
                  </div>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold text-primary">
                      {formatMoney(priced.totalPrice)}
                    </span>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function pricingLabel(addon: UpsellItem): string {
  switch (addon.pricingMode) {
    case 'per_person':
      return 'per person';
    case 'per_hour':
      return 'per hour';
    case 'per_person_per_hour':
      return 'per person · per hour';
    case 'flat':
    default:
      return 'flat';
  }
}

function Stepper({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (next: number) => void;
}) {
  return (
    <div>
      <Label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))}
          disabled={value <= min}
          aria-label={`Decrease ${label.toLowerCase()}`}
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <span className="w-10 text-center text-sm tabular-nums">{value}</span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={() => onChange(Math.min(max, +(value + step).toFixed(2)))}
          disabled={value >= max}
          aria-label={`Increase ${label.toLowerCase()}`}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

/** Build a CartAddon[] from the picker selection map. */
export function selectionToCartAddons(
  addons: UpsellItem[],
  selected: AddonSelectionMap
): import('@/types').CartAddon[] {
  const out: import('@/types').CartAddon[] = [];
  for (const addon of addons) {
    const sel = selected[addon.id];
    if (!sel?.enabled) continue;
    const priced = priceAddon(addon, {
      variantId: sel.variantId,
      pax: sel.pax,
      hours: sel.hours,
      quantity: sel.quantity,
    });
    out.push({
      upsellItemId: addon.id,
      variantId: priced.variantId,
      name: addon.name,
      variantName: priced.variantName,
      unitPrice: priced.unitPrice,
      pricingMode: priced.pricingMode,
      pax: priced.pax,
      hours: priced.hours,
      quantity: priced.quantity,
      totalPrice: priced.totalPrice,
      currency: priced.currency,
    });
  }
  return out;
}

/** Build a RoomCartAddon[] (legacy id field included) from the picker. */
export function selectionToRoomCartAddons(
  addons: UpsellItem[],
  selected: AddonSelectionMap
): import('@/types').RoomCartAddon[] {
  return selectionToCartAddons(addons, selected).map((a) => ({
    id: a.upsellItemId,
    upsellItemId: a.upsellItemId,
    variantId: a.variantId,
    name: a.name,
    variantName: a.variantName,
    unitPrice: a.unitPrice,
    pricingMode: a.pricingMode,
    pax: a.pax,
    hours: a.hours,
    quantity: a.quantity,
    totalPrice: a.totalPrice,
    currency: a.currency,
  }));
}
