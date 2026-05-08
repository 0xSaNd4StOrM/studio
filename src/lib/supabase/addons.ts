'use server';

/**
 * Unified-addons read layer. Returns `UpsellItem`s filtered by `placement`
 * for tour/room/hotel/cart contexts.
 *
 * The legacy `room_addons` table is still tolerated as a fallback: when
 * `getAddonsForRoom` finds nothing in `upsell_items`, we read `room_addons`
 * and shape the rows into `UpsellItem`s so the room detail page keeps
 * showing extras during the rolling deploy. Once the migration is applied
 * everywhere, the fallback short-circuits to an empty list.
 */

import { createClient } from '@/lib/supabase/server';
import { toCamelCase } from '@/lib/utils';
import { getCurrentAgencyId } from '@/lib/supabase/agencies';
import { getPublicTargetLocale } from '@/lib/translation/get-locale';
import { translateObjects } from '@/lib/translation/translate-object';
import type { AddonPlacement, UpsellItem } from '@/types';

const UPSELL_TRANSLATABLE_FIELDS = ['name', 'description', 'variants[].name'] as const;
const PG_UNDEFINED_TABLE = '42P01';
const PG_UNDEFINED_COLUMN = '42703';

function ensureDefaults(raw: Record<string, unknown>): UpsellItem {
  const item = toCamelCase(raw) as Partial<UpsellItem> & {
    placement?: Partial<AddonPlacement> | null;
  };
  const placement: AddonPlacement = {
    match: item.placement?.match ?? 'any',
    tourIds: Array.isArray(item.placement?.tourIds) ? (item.placement?.tourIds as string[]) : [],
    destinations: Array.isArray(item.placement?.destinations)
      ? (item.placement?.destinations as string[])
      : [],
    roomTypeIds: Array.isArray(item.placement?.roomTypeIds)
      ? (item.placement?.roomTypeIds as string[])
      : [],
    hotelIds: Array.isArray(item.placement?.hotelIds)
      ? (item.placement?.hotelIds as string[])
      : [],
    showInCart: item.placement?.showInCart !== false,
  };
  return {
    id: item.id ?? '',
    name: item.name ?? '',
    description: item.description,
    price: Number(item.price ?? 0),
    variants: (item.variants ?? []).map((v) => ({ ...v, id: v.id ?? v.name })),
    targeting: item.targeting ?? null,
    type: item.type ?? 'service',
    relatedTourId: item.relatedTourId ?? null,
    imageUrl: item.imageUrl,
    isActive: item.isActive ?? false,
    createdAt: item.createdAt ?? '',
    pricingMode: (item.pricingMode as UpsellItem['pricingMode']) ?? 'flat',
    quantityMode: (item.quantityMode as UpsellItem['quantityMode']) ?? 'none',
    minPax: item.minPax ?? null,
    maxPax: item.maxPax ?? null,
    minHours: item.minHours ?? null,
    maxHours: item.maxHours ?? null,
    defaultHours: item.defaultHours ?? null,
    currency: item.currency ?? 'USD',
    sortOrder: item.sortOrder ?? 0,
    placement,
  };
}

async function maybeTranslate(items: UpsellItem[]): Promise<UpsellItem[]> {
  if (items.length === 0) return items;
  const target = await getPublicTargetLocale();
  if (target === 'en') return items;
  return translateObjects(items, UPSELL_TRANSLATABLE_FIELDS, target);
}

async function fetchAgencyAddons(): Promise<UpsellItem[]> {
  const supabase = await createClient();
  const agencyId = await getCurrentAgencyId();

  const { data, error } = await supabase
    .from('upsell_items')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    const code = (error as { code?: string }).code;
    if (code === PG_UNDEFINED_COLUMN || code === PG_UNDEFINED_TABLE) {
      // New columns not yet migrated; degrade to a permissive list ordered
      // by created_at so the rest of the app keeps working.
      const fallback = await supabase
        .from('upsell_items')
        .select('*')
        .eq('agency_id', agencyId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (fallback.error) {
        // eslint-disable-next-line no-console
        console.error('[addons] fallback fetch failed', fallback.error);
        return [];
      }
      return (fallback.data ?? []).map((row) => ensureDefaults(row as Record<string, unknown>));
    }
    // eslint-disable-next-line no-console
    console.error('[addons] fetch failed', error);
    return [];
  }

  return (data ?? []).map((row) => ensureDefaults(row as Record<string, unknown>));
}

function placementMatches(item: UpsellItem, ctx: Partial<AddonPlacement>): boolean {
  const p = item.placement;
  const checks: boolean[] = [];

  if (ctx.tourIds && ctx.tourIds.length > 0) {
    if (p.tourIds.length > 0) {
      checks.push(p.tourIds.some((id) => ctx.tourIds!.includes(id)));
    }
  }
  if (ctx.destinations && ctx.destinations.length > 0) {
    if (p.destinations.length > 0) {
      checks.push(p.destinations.some((d) => ctx.destinations!.includes(d)));
    }
  }
  if (ctx.roomTypeIds && ctx.roomTypeIds.length > 0) {
    if (p.roomTypeIds.length > 0) {
      checks.push(p.roomTypeIds.some((id) => ctx.roomTypeIds!.includes(id)));
    }
  }
  if (ctx.hotelIds && ctx.hotelIds.length > 0) {
    if (p.hotelIds.length > 0) {
      checks.push(p.hotelIds.some((id) => ctx.hotelIds!.includes(id)));
    }
  }

  if (checks.length === 0) {
    // No targeting on item AND no overlap on context → not a match for this
    // specific placement query. The cart fallback explicitly opts back in.
    const hasAnyTargeting =
      p.tourIds.length + p.destinations.length + p.roomTypeIds.length + p.hotelIds.length > 0;
    return !hasAnyTargeting;
  }

  return p.match === 'all' ? checks.every(Boolean) : checks.some(Boolean);
}

/** Addons that should appear on a tour detail page. */
export async function getAddonsForTour(tour: {
  id: string;
  destination?: string | null;
}): Promise<UpsellItem[]> {
  const all = await fetchAgencyAddons();
  const ctx: Partial<AddonPlacement> = {
    tourIds: [tour.id],
    destinations: tour.destination ? [tour.destination] : [],
  };
  const filtered = all.filter((a) => placementMatches(a, ctx));
  return maybeTranslate(filtered);
}

/** Addons that should appear on a room detail page. */
export async function getAddonsForRoom(
  roomTypeId: string,
  hotelId?: string | null
): Promise<UpsellItem[]> {
  const all = await fetchAgencyAddons();
  const ctx: Partial<AddonPlacement> = {
    roomTypeIds: [roomTypeId],
    hotelIds: hotelId ? [hotelId] : [],
  };
  const filtered = all.filter((a) => placementMatches(a, ctx));

  if (filtered.length === 0) {
    // Legacy fallback so the room page keeps showing extras when the
    // migration hasn't been applied yet.
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('room_addons')
      .select('*')
      .eq('room_type_id', roomTypeId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (!error && data && data.length > 0) {
      const adapted: UpsellItem[] = data.map((row) => {
        const r = toCamelCase(row) as Record<string, unknown> & {
          id?: string;
          name?: string;
          description?: string;
          price?: number;
          currency?: string;
          isActive?: boolean;
          sortOrder?: number;
          createdAt?: string;
        };
        return ensureDefaults({
          ...r,
          type: 'service',
          pricingMode: 'flat',
          quantityMode: 'none',
          placement: {
            match: 'any',
            tourIds: [],
            destinations: [],
            roomTypeIds: [roomTypeId],
            hotelIds: [],
            showInCart: false,
          },
        });
      });
      return maybeTranslate(adapted);
    }
  }

  return maybeTranslate(filtered);
}

/** Addons attached to any room belonging to a hotel. */
export async function getAddonsForHotel(hotelId: string): Promise<UpsellItem[]> {
  const all = await fetchAgencyAddons();
  const ctx: Partial<AddonPlacement> = { hotelIds: [hotelId] };
  return maybeTranslate(all.filter((a) => placementMatches(a, ctx)));
}

/**
 * Cart-only suggestion list. Returns active addons whose `placement.showInCart`
 * is true and whose targeting overlaps with the cart context. Items already
 * pinned to a specific tour/room can still be included if `showInCart=true`.
 */
export async function getCartFallbackAddons(opts: {
  tourIds: string[];
  destinations: string[];
  roomTypeIds: string[];
  hotelIds: string[];
}): Promise<UpsellItem[]> {
  const all = await fetchAgencyAddons();
  const visible = all.filter((a) => a.placement.showInCart !== false);
  const filtered = visible.filter((a) => {
    const p = a.placement;
    const hasAnyTargeting =
      p.tourIds.length + p.destinations.length + p.roomTypeIds.length + p.hotelIds.length > 0;
    if (!hasAnyTargeting) return true;
    return placementMatches(a, opts);
  });
  return maybeTranslate(filtered);
}
