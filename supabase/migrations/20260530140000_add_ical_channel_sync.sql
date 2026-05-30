-- UNAPPLIED — Channel sync (iCal) support (Phase 4).
--
-- 1. `room_ical_feeds`: external iCal URLs (Booking.com / Airbnb / etc.) that the
--    import cron pulls to block local inventory, plus an export token per room
--    type so the hotel can publish its own availability outward.
-- 2. `hotel_bookings.source`: marks how a row originated — 'direct' for the
--    hotel's own storefront bookings (default) or 'external:<channel>' for rows
--    created by the iCal importer. Lets us cleanly re-sync (delete + reinsert)
--    external rows and exclude them from revenue stats.
--
-- Forward-compatible: the app reads/writes `source` opportunistically and falls
-- back (Postgres 42703 / 42P01) when this migration is not yet applied.

ALTER TABLE public.hotel_bookings
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'direct';

-- Fast lookup of external rows per room type for re-sync.
CREATE INDEX IF NOT EXISTS hotel_bookings_source_idx
  ON public.hotel_bookings (room_type_id, source);

COMMENT ON COLUMN public.hotel_bookings.source IS
  'Origin of the booking: direct | external:<channel> (e.g. external:booking.com). Set by the iCal importer.';

CREATE TABLE IF NOT EXISTS public.room_ical_feeds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  room_type_id uuid NOT NULL REFERENCES public.room_types(id) ON DELETE CASCADE,
  -- direction: 'import' = we pull this URL; 'export' marker rows are not used
  -- (export is tokenized per room type, see export_token below).
  url text NOT NULL,
  label text,
  -- A stable per-room token used to build the OUTBOUND export feed URL
  -- (/api/ical/export/<export_token>). Shared across a room type's rows.
  export_token uuid NOT NULL DEFAULT gen_random_uuid(),
  is_active boolean NOT NULL DEFAULT true,
  last_synced_at timestamptz,
  last_status text,
  last_event_count integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS room_ical_feeds_agency_idx
  ON public.room_ical_feeds (agency_id);
CREATE INDEX IF NOT EXISTS room_ical_feeds_room_type_idx
  ON public.room_ical_feeds (room_type_id);

-- RLS: locked down. Application access is via service-role server helpers that
-- bypass RLS (same posture as cart_holds / abandoned_carts). No direct
-- anon/authenticated access.
ALTER TABLE public.room_ical_feeds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny anon room_ical_feeds" ON public.room_ical_feeds;
CREATE POLICY "Deny anon room_ical_feeds"
  ON public.room_ical_feeds FOR ALL TO anon
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Deny authenticated room_ical_feeds" ON public.room_ical_feeds;
CREATE POLICY "Deny authenticated room_ical_feeds"
  ON public.room_ical_feeds FOR ALL TO authenticated
  USING (false) WITH CHECK (false);

COMMENT ON TABLE public.room_ical_feeds IS
  'External iCal import URLs + per-room export token for channel sync. Service-role only.';
