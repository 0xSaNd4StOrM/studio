-- Unified addons migration.
--
-- Folds the legacy `room_addons` table into `upsell_items` and gives every
-- upsell a flexible pricing/quantity model plus first-class placement on
-- tours, destinations, rooms, and hotels.
--
-- Idempotent: safe to apply on a fresh DB or one already partially migrated.
-- Apply manually with:
--   psql "$SUPABASE_DB_URL" -f supabase/migrations/20260508090000_unified_addons.sql

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Extend `upsell_items` with pricing, quantity, placement metadata.
-- ---------------------------------------------------------------------------

ALTER TABLE public.upsell_items
  ADD COLUMN IF NOT EXISTS pricing_mode text NOT NULL DEFAULT 'flat',
  ADD COLUMN IF NOT EXISTS quantity_mode text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS min_pax int,
  ADD COLUMN IF NOT EXISTS max_pax int,
  ADD COLUMN IF NOT EXISTS min_hours numeric(5, 2),
  ADD COLUMN IF NOT EXISTS max_hours numeric(5, 2),
  ADD COLUMN IF NOT EXISTS default_hours numeric(5, 2),
  ADD COLUMN IF NOT EXISTS placement jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0;

-- Add constraints idempotently. Drop-then-add so re-runs use the latest set.
ALTER TABLE public.upsell_items
  DROP CONSTRAINT IF EXISTS upsell_items_pricing_mode_check;
ALTER TABLE public.upsell_items
  ADD CONSTRAINT upsell_items_pricing_mode_check
    CHECK (pricing_mode IN ('flat', 'per_person', 'per_hour', 'per_person_per_hour'));

ALTER TABLE public.upsell_items
  DROP CONSTRAINT IF EXISTS upsell_items_quantity_mode_check;
ALTER TABLE public.upsell_items
  ADD CONSTRAINT upsell_items_quantity_mode_check
    CHECK (quantity_mode IN ('none', 'pax', 'hours', 'pax_and_hours'));

-- Indexes for placement-based reads and per-agency lists.
CREATE INDEX IF NOT EXISTS idx_upsell_items_placement_gin
  ON public.upsell_items USING gin (placement);

CREATE INDEX IF NOT EXISTS idx_upsell_items_agency_active_sort
  ON public.upsell_items (agency_id, is_active, sort_order);

-- ---------------------------------------------------------------------------
-- 2. Backfill `placement` from the legacy `targeting` jsonb so old rows keep
--    showing where they used to (cart-only suggestions for matching tours /
--    destinations).
-- ---------------------------------------------------------------------------

UPDATE public.upsell_items
SET placement = jsonb_build_object(
  'match', COALESCE(targeting->>'match', 'any'),
  'tourIds', COALESCE(targeting->'tourIds', '[]'::jsonb),
  'destinations', COALESCE(targeting->'destinations', '[]'::jsonb),
  'roomTypeIds', '[]'::jsonb,
  'hotelIds', '[]'::jsonb,
  'showInCart', true
)
WHERE placement = '{}'::jsonb
  AND targeting IS NOT NULL;

-- For rows that had no targeting at all, give them a default visible
-- placement so the cart suggestion panel keeps surfacing them.
UPDATE public.upsell_items
SET placement = jsonb_build_object(
  'match', 'any',
  'tourIds', '[]'::jsonb,
  'destinations', '[]'::jsonb,
  'roomTypeIds', '[]'::jsonb,
  'hotelIds', '[]'::jsonb,
  'showInCart', true
)
WHERE placement = '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- 3. Backfill the legacy `room_addons` rows into `upsell_items` so room
--    detail pages keep showing the same extras after deployment. Skipped
--    when the optional `room_addons` table does not exist.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  _agency_id uuid;
  _row record;
  _exists boolean;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'room_addons'
  ) THEN
    RAISE NOTICE 'room_addons table not present; skipping addon backfill.';
    RETURN;
  END IF;

  FOR _row IN
    SELECT
      ra.id,
      ra.room_type_id,
      ra.name,
      ra.description,
      ra.price,
      ra.currency,
      ra.is_active,
      ra.sort_order,
      h.agency_id
    FROM public.room_addons ra
    JOIN public.room_types rt ON rt.id = ra.room_type_id
    JOIN public.hotels h ON h.id = rt.hotel_id
  LOOP
    _agency_id := _row.agency_id;

    -- Skip rows already migrated (matched on name + room_type_id placement).
    SELECT EXISTS (
      SELECT 1
      FROM public.upsell_items u
      WHERE u.agency_id = _agency_id
        AND u.name = _row.name
        AND u.placement -> 'roomTypeIds' ? _row.room_type_id::text
    ) INTO _exists;

    IF _exists THEN
      CONTINUE;
    END IF;

    INSERT INTO public.upsell_items (
      agency_id,
      name,
      description,
      price,
      currency,
      is_active,
      sort_order,
      type,
      pricing_mode,
      quantity_mode,
      placement,
      variants,
      targeting
    ) VALUES (
      _agency_id,
      _row.name,
      _row.description,
      _row.price,
      COALESCE(_row.currency, 'USD'),
      _row.is_active,
      _row.sort_order,
      'service',
      'flat',
      'none',
      jsonb_build_object(
        'match', 'any',
        'tourIds', '[]'::jsonb,
        'destinations', '[]'::jsonb,
        'roomTypeIds', jsonb_build_array(_row.room_type_id::text),
        'hotelIds', '[]'::jsonb,
        'showInCart', false
      ),
      '[]'::jsonb,
      NULL
    );
  END LOOP;
END
$$;

-- Mark the legacy table as deprecated. Kept around so codepaths that still
-- read from it during a rolling deploy keep working; safe to drop later.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'room_addons'
  ) THEN
    EXECUTE $cmt$ COMMENT ON TABLE public.room_addons IS
      'Deprecated 2026-05-08: data migrated into public.upsell_items via 20260508090000_unified_addons.sql. Reads tolerated as a fallback; new writes should target upsell_items.' $cmt$;
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 4. Persist addon detail on tour/upsell booking lines so admin reports can
--    render pax/hours/variant snapshots later.
-- ---------------------------------------------------------------------------

ALTER TABLE public.booking_items
  ADD COLUMN IF NOT EXISTS addons jsonb,
  ADD COLUMN IF NOT EXISTS hours numeric(5, 2);

-- ---------------------------------------------------------------------------
-- 5. Reaffirm RLS (covered by existing `upsell_items` policies; no-op here
--    but kept to make the migration self-documenting).
-- ---------------------------------------------------------------------------

ALTER TABLE public.upsell_items ENABLE ROW LEVEL SECURITY;

COMMIT;
