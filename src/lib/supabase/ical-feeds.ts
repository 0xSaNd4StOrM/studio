'use server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/agency-users';
import { getCurrentAgencyId } from '@/lib/supabase/agencies';
import { toCamelCase } from '@/lib/utils';
import { parseIcs, type IcalEvent } from '@/lib/ical';
import type { SupabaseClient } from '@supabase/supabase-js';

const PG_UNDEFINED_TABLE = '42P01';

function isUndefinedTable(err: unknown): boolean {
  return Boolean(err) && (err as { code?: string }).code === PG_UNDEFINED_TABLE;
}

export type IcalFeed = {
  id: string;
  agencyId: string;
  roomTypeId: string;
  url: string;
  label: string | null;
  exportToken: string;
  isActive: boolean;
  lastSyncedAt: string | null;
  lastStatus: string | null;
  lastEventCount: number | null;
  createdAt: string;
  updatedAt: string;
};

export type IcalFeedWithRoom = IcalFeed & { roomTypeName: string | null };

export type IcalSyncResult = {
  feedId: string;
  roomTypeId: string;
  ok: boolean;
  imported: number;
  skipped: number;
  message: string;
};

/** Admin: list this agency's import feeds, joined with room type names. */
export async function listIcalFeeds(): Promise<IcalFeedWithRoom[]> {
  const supabase = await createAdminClient();
  const agencyId = await getCurrentAgencyId();

  const { data, error } = await supabase
    .from('room_ical_feeds')
    .select('*')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: true });

  if (error) {
    if (isUndefinedTable(error)) return [];
    throw error;
  }

  const feeds = (data ?? []).map((row) => toCamelCase(row) as IcalFeed);
  const roomTypeIds = Array.from(new Set(feeds.map((f) => f.roomTypeId)));
  const namesById = new Map<string, string>();
  if (roomTypeIds.length > 0) {
    const { data: rooms } = await supabase
      .from('room_types')
      .select('id, name')
      .in('id', roomTypeIds);
    for (const r of rooms ?? []) namesById.set((r as { id: string }).id, (r as { name: string }).name);
  }

  return feeds.map((f) => ({ ...f, roomTypeName: namesById.get(f.roomTypeId) ?? null }));
}

/**
 * Admin: the export token for a room type (stable across that room's feeds).
 * Creates a placeholder export-only token row if none exists yet, so the hotel
 * can publish its outbound calendar even before adding any import feeds.
 */
export async function getOrCreateExportToken(roomTypeId: string): Promise<string> {
  const supabase = await createAdminClient();
  const agencyId = await getCurrentAgencyId();

  // Verify room ownership.
  const { data: rt } = await supabase
    .from('room_types')
    .select('id, hotel_id')
    .eq('id', roomTypeId)
    .maybeSingle();
  if (!rt) throw new Error('Room type not found.');
  const { data: hotel } = await supabase
    .from('hotels')
    .select('id')
    .eq('id', (rt as { hotel_id: string }).hotel_id)
    .eq('agency_id', agencyId)
    .maybeSingle();
  if (!hotel) throw new Error('Room type is not part of the current agency.');

  const { data: existing } = await supabase
    .from('room_ical_feeds')
    .select('export_token')
    .eq('room_type_id', roomTypeId)
    .limit(1)
    .maybeSingle();
  if (existing) return (existing as { export_token: string }).export_token;

  // No row yet — create an export-only marker row (url empty, inactive import).
  const { data: created, error } = await supabase
    .from('room_ical_feeds')
    .insert({
      agency_id: agencyId,
      room_type_id: roomTypeId,
      url: '',
      label: 'Export feed',
      is_active: false,
    })
    .select('export_token')
    .single();
  if (error) throw error;
  return (created as { export_token: string }).export_token;
}

export async function addIcalFeed(input: {
  roomTypeId: string;
  url: string;
  label?: string;
}): Promise<void> {
  const supabase = await createAdminClient();
  const agencyId = await getCurrentAgencyId();

  const url = input.url.trim();
  if (!/^https?:\/\//i.test(url)) {
    throw new Error('Enter a valid http(s) iCal URL.');
  }

  const { data: rt } = await supabase
    .from('room_types')
    .select('id, hotel_id')
    .eq('id', input.roomTypeId)
    .maybeSingle();
  if (!rt) throw new Error('Room type not found.');
  const { data: hotel } = await supabase
    .from('hotels')
    .select('id')
    .eq('id', (rt as { hotel_id: string }).hotel_id)
    .eq('agency_id', agencyId)
    .maybeSingle();
  if (!hotel) throw new Error('Room type is not part of the current agency.');

  // Reuse an existing export token for this room type so all its feeds share one.
  const { data: existing } = await supabase
    .from('room_ical_feeds')
    .select('export_token')
    .eq('room_type_id', input.roomTypeId)
    .limit(1)
    .maybeSingle();

  const row: Record<string, unknown> = {
    agency_id: agencyId,
    room_type_id: input.roomTypeId,
    url,
    label: input.label?.trim() || null,
    is_active: true,
  };
  if (existing) row.export_token = (existing as { export_token: string }).export_token;

  const { error } = await supabase.from('room_ical_feeds').insert(row);
  if (error) throw error;
}

export async function deleteIcalFeed(feedId: string): Promise<void> {
  const supabase = await createAdminClient();
  const agencyId = await getCurrentAgencyId();
  const { error } = await supabase
    .from('room_ical_feeds')
    .delete()
    .eq('id', feedId)
    .eq('agency_id', agencyId);
  if (error) throw error;
}

// ───────────────────────────────────────────────────────────────────────────
// Importer (service-role; used by cron + manual "Sync now")
// ───────────────────────────────────────────────────────────────────────────

function eachDate(startIso: string, endExclusiveIso: string): string[] {
  const out: string[] = [];
  const cur = new Date(`${startIso}T00:00:00Z`);
  const end = new Date(`${endExclusiveIso}T00:00:00Z`);
  while (cur.getTime() < end.getTime()) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

/** Release inventory, swallowing any error (best-effort rollback/cleanup). */
async function releaseQuietly(
  supabase: SupabaseClient,
  roomTypeId: string,
  checkIn: string,
  checkOut: string,
  units: number
): Promise<void> {
  try {
    await supabase.rpc('release_room_inventory', {
      p_room_type_id: roomTypeId,
      p_check_in: checkIn,
      p_check_out: checkOut,
      p_units: units,
    });
  } catch {
    // best-effort — inventory release failures are non-fatal here
  }
}

/**
 * Import a single feed: fetch the URL, parse VEVENTs, and reconcile external
 * blocks for that room type. Strategy ("decrement units"):
 *   1. Release + delete all prior `external` hotel_bookings for this room type
 *      (clean re-sync each run).
 *   2. For each parsed event, reserve_room_inventory (race-safe) then insert a
 *      hotel_booking row marked source 'external:<host>'.
 * Failures on individual events are skipped (e.g. fully-booked dates).
 */
export async function syncIcalFeed(
  supabase: SupabaseClient,
  feed: IcalFeed,
  nowIso: string
): Promise<IcalSyncResult> {
  const base: IcalSyncResult = {
    feedId: feed.id,
    roomTypeId: feed.roomTypeId,
    ok: false,
    imported: 0,
    skipped: 0,
    message: '',
  };

  if (!feed.url || !/^https?:\/\//i.test(feed.url)) {
    return { ...base, ok: true, message: 'No import URL (export-only feed).' };
  }

  let events: IcalEvent[] = [];
  try {
    const res = await fetch(feed.url, {
      headers: { Accept: 'text/calendar, text/plain, */*' },
      cache: 'no-store',
    });
    if (!res.ok) {
      await recordSync(supabase, feed.id, nowIso, `HTTP ${res.status}`, 0);
      return { ...base, message: `Fetch failed: HTTP ${res.status}` };
    }
    const text = await res.text();
    events = parseIcs(text);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'fetch error';
    await recordSync(supabase, feed.id, nowIso, `Error: ${msg}`, 0);
    return { ...base, message: msg };
  }

  const channel = (() => {
    try {
      return new URL(feed.url).hostname.replace(/^www\./, '');
    } catch {
      return 'external';
    }
  })();
  const sourceTag = `external:${channel}`;

  // 1. Clean prior external rows for this room type from THIS channel: release
  //    their inventory, then delete them.
  const { data: prior } = await supabase
    .from('hotel_bookings')
    .select('id, room_type_id, check_in, check_out, units, status, source')
    .eq('room_type_id', feed.roomTypeId)
    .eq('source', sourceTag);

  for (const row of prior ?? []) {
    const r = row as {
      id: string;
      check_in: string;
      check_out: string;
      units: number | null;
      status: string | null;
    };
    if (r.status !== 'cancelled') {
      await releaseQuietly(
        supabase,
        feed.roomTypeId,
        r.check_in,
        r.check_out,
        Math.max(1, Number(r.units ?? 1))
      );
    }
    await supabase.from('hotel_bookings').delete().eq('id', r.id);
  }

  // 2. Reserve + insert fresh external rows.
  let imported = 0;
  let skipped = 0;
  for (const ev of events) {
    if (!ev.start || !ev.end || ev.end <= ev.start) {
      skipped += 1;
      continue;
    }
    // Guard against absurd ranges (parser safety).
    if (eachDate(ev.start, ev.end).length > 370) {
      skipped += 1;
      continue;
    }

    const { error: reserveError } = await supabase.rpc('reserve_room_inventory', {
      p_room_type_id: feed.roomTypeId,
      p_check_in: ev.start,
      p_check_out: ev.end,
      p_units: 1,
    });
    if (reserveError) {
      // Dates already full locally — nothing to block, skip.
      skipped += 1;
      continue;
    }

    const payload: Record<string, unknown> = {
      agency_id: feed.agencyId,
      hotel_id: null,
      room_type_id: feed.roomTypeId,
      check_in: ev.start,
      check_out: ev.end,
      units: 1,
      guests_adults: 1,
      guests_children: 0,
      guest_name: ev.summary?.slice(0, 120) || `Blocked (${channel})`,
      guest_email: null,
      guest_phone: null,
      status: 'confirmed',
      subtotal: 0,
      tax: 0,
      fees: 0,
      total: 0,
      source: sourceTag,
    };

    // hotel_id is required (NOT NULL) on the base table; backfill it from the room.
    const { data: rt } = await supabase
      .from('room_types')
      .select('hotel_id')
      .eq('id', feed.roomTypeId)
      .maybeSingle();
    payload.hotel_id = (rt as { hotel_id?: string } | null)?.hotel_id ?? null;

    const { error: insertError } = await supabase.from('hotel_bookings').insert(payload);
    if (insertError) {
      const code = (insertError as { code?: string }).code;
      if (code === '42703') {
        // `source` column not migrated yet — insert without it.
        delete payload.source;
        const { error: retryErr } = await supabase.from('hotel_bookings').insert(payload);
        if (retryErr) {
          // Roll back the reservation we just made.
          await releaseQuietly(supabase, feed.roomTypeId, ev.start, ev.end, 1);
          skipped += 1;
          continue;
        }
      } else {
        await releaseQuietly(supabase, feed.roomTypeId, ev.start, ev.end, 1);
        skipped += 1;
        continue;
      }
    }
    imported += 1;
  }

  await recordSync(supabase, feed.id, nowIso, `OK: ${imported} blocked, ${skipped} skipped`, imported);

  return {
    ...base,
    ok: true,
    imported,
    skipped,
    message: `${imported} dates blocked from ${channel}` + (skipped ? `, ${skipped} skipped` : ''),
  };
}

async function recordSync(
  supabase: SupabaseClient,
  feedId: string,
  nowIso: string,
  status: string,
  eventCount: number
): Promise<void> {
  await supabase
    .from('room_ical_feeds')
    .update({
      last_synced_at: nowIso,
      last_status: status,
      last_event_count: eventCount,
      updated_at: nowIso,
    })
    .eq('id', feedId)
    .then(undefined, () => undefined);
}

/** Service-role: load all active import feeds across all agencies (for cron). */
export async function listActiveImportFeeds(): Promise<IcalFeed[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('room_ical_feeds')
    .select('*')
    .eq('is_active', true)
    .neq('url', '');
  if (error) {
    if (isUndefinedTable(error)) return [];
    throw error;
  }
  return (data ?? []).map((row) => toCamelCase(row) as IcalFeed);
}

/** Service-role: load this agency's active import feeds (for manual "Sync now"). */
export async function listActiveImportFeedsForAgency(agencyId: string): Promise<IcalFeed[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('room_ical_feeds')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('is_active', true)
    .neq('url', '');
  if (error) {
    if (isUndefinedTable(error)) return [];
    throw error;
  }
  return (data ?? []).map((row) => toCamelCase(row) as IcalFeed);
}

/** Service-role: resolve a room type + its active bookings for the export feed. */
export async function getExportData(exportToken: string): Promise<{
  roomTypeName: string;
  agencyName: string;
  events: IcalEvent[];
} | null> {
  const supabase = createServiceRoleClient();

  const { data: feed, error } = await supabase
    .from('room_ical_feeds')
    .select('room_type_id, agency_id')
    .eq('export_token', exportToken)
    .limit(1)
    .maybeSingle();
  if (error || !feed) return null;

  const roomTypeId = (feed as { room_type_id: string }).room_type_id;
  const agencyId = (feed as { agency_id: string }).agency_id;

  const [{ data: rt }, { data: agency }, { data: bookings }] = await Promise.all([
    supabase.from('room_types').select('name').eq('id', roomTypeId).maybeSingle(),
    supabase.from('agencies').select('name').eq('id', agencyId).maybeSingle(),
    supabase
      .from('hotel_bookings')
      .select('id, check_in, check_out, status, source')
      .eq('room_type_id', roomTypeId)
      .neq('status', 'cancelled'),
  ]);

  // Only export DIRECT bookings outward — never re-broadcast external blocks
  // back to the channels they came from (avoids feedback loops).
  const events: IcalEvent[] = (bookings ?? [])
    .filter((b) => {
      const src = (b as { source?: string }).source;
      return !src || !src.startsWith('external:');
    })
    .map((b) => {
      const row = b as { id: string; check_in: string; check_out: string };
      return {
        uid: `kaun-${row.id}@tourista`,
        start: row.check_in,
        end: row.check_out,
        summary: 'Booked',
      };
    });

  return {
    roomTypeName: (rt as { name?: string } | null)?.name ?? 'Room',
    agencyName: (agency as { name?: string } | null)?.name ?? 'Hotel',
    events,
  };
}
