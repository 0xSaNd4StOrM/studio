'use client';

import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCurrency } from '@/hooks/use-currency';
import { getAddonsForTour, getAddonsForRoom } from '@/lib/supabase/addons';
import {
  AddonPicker,
  selectionToCartAddons,
  selectionToRoomCartAddons,
  type AddonSelectionMap,
} from '@/components/addons/addon-picker';
import type { CartAddon, RoomCartAddon, UpsellItem } from '@/types';

type TourCtx = {
  kind: 'tour';
  tourId: string;
  destination?: string | null;
  defaultPax: number;
  attached: CartAddon[];
  onChange: (next: CartAddon[]) => void;
};

type RoomCtx = {
  kind: 'room';
  roomTypeId: string;
  hotelId: string;
  defaultPax: number;
  attached: RoomCartAddon[];
  onChange: (next: RoomCartAddon[]) => void;
};

export type CartLineAddonsEditorProps = TourCtx | RoomCtx;

function selectionFromAttached(
  addons: UpsellItem[],
  attached: Array<{ upsellItemId?: string; id?: string; variantId?: string; pax?: number; hours?: number; quantity: number }>
): AddonSelectionMap {
  const map: AddonSelectionMap = {};
  for (const a of attached) {
    const id = a.upsellItemId ?? a.id;
    if (!id) continue;
    if (!addons.some((x) => x.id === id)) continue;
    map[id] = {
      enabled: true,
      variantId: a.variantId,
      pax: a.pax,
      hours: a.hours,
      quantity: a.quantity,
    };
  }
  return map;
}

export function CartLineAddonsEditor(props: CartLineAddonsEditorProps) {
  const { format: formatMoney } = useCurrency();
  const [open, setOpen] = useState(false);
  const [addons, setAddons] = useState<UpsellItem[]>([]);
  const [selection, setSelection] = useState<AddonSelectionMap>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || addons.length > 0) return;
    let cancelled = false;
    setLoading(true);
    const fetcher =
      props.kind === 'tour'
        ? getAddonsForTour({ id: props.tourId, destination: props.destination ?? null })
        : getAddonsForRoom(props.roomTypeId, props.hotelId);
    void fetcher
      .then((items) => {
        if (cancelled) return;
        setAddons(items);
        setSelection(selectionFromAttached(items, props.attached));
      })
      .catch(() => {
        if (cancelled) return;
        setAddons([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, props, addons.length]);

  const attachedSummary = useMemo(() => {
    if (props.kind === 'tour') return props.attached;
    return props.attached;
  }, [props]);

  const handleSave = () => {
    if (props.kind === 'tour') {
      props.onChange(selectionToCartAddons(addons, selection));
    } else {
      props.onChange(selectionToRoomCartAddons(addons, selection));
    }
    setOpen(false);
  };

  const handleClear = () => {
    if (props.kind === 'tour') props.onChange([]);
    else props.onChange([]);
    setSelection({});
  };

  return (
    <div className="space-y-2">
      {attachedSummary.length > 0 ? (
        <div className="rounded-2xl border bg-background/50 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Add-ons
            </span>
            <div className="ml-auto flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setOpen((v) => !v)}
              >
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                {open ? 'Close' : 'Edit'}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={handleClear}>
                <X className="mr-1.5 h-3.5 w-3.5" />
                Clear
              </Button>
            </div>
          </div>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {attachedSummary.map((a, i) => {
              const total =
                'totalPrice' in a && typeof a.totalPrice === 'number'
                  ? a.totalPrice
                  : a.unitPrice * a.quantity;
              const parts: string[] = [];
              if (a.variantName) parts.push(a.variantName);
              if (a.pax) parts.push(`${a.pax} pax`);
              if (a.hours) parts.push(`${a.hours}h`);
              if (parts.length === 0 && a.quantity > 1) parts.push(`× ${a.quantity}`);
              return (
                <li key={i} className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 break-words">
                    <Badge variant="outline" className="mr-1.5">
                      {a.name}
                    </Badge>
                    {parts.length > 0 ? <span>{parts.join(' · ')}</span> : null}
                  </span>
                  <span className="shrink-0 font-medium text-foreground">
                    {formatMoney(total)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setOpen((v) => !v)}
          className="w-full"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add extras
        </Button>
      )}

      {open && (
        <div className="rounded-2xl border bg-muted/20 p-3">
          {loading ? (
            <p className="text-xs text-muted-foreground">Loading add-ons…</p>
          ) : addons.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No optional extras configured for this item yet.
            </p>
          ) : (
            <>
              <AddonPicker
                addons={addons}
                selected={selection}
                onChange={setSelection}
                defaultPax={props.defaultPax}
                hideTitle
              />
              <div className="mt-3 flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" size="sm" onClick={handleSave}>
                  Save
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
