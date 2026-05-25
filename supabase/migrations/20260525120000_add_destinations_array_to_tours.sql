-- Multi-destination tours.
--
-- A tour can span multiple cities/regions (e.g. "Cairo + Luxor", "Sharm + Dahab").
-- Today `tours.destination` is a single TEXT column, which forced agencies to
-- create duplicate tours or pick one destination arbitrarily. We add a
-- `destinations TEXT[]` column to hold the full set, and keep the original
-- `destination` column as the "primary" destination (= first element of the
-- array) for backwards compatibility with existing code paths that read the
-- singular value.
--
-- DUAL-FIELD STRATEGY (read both, write both)
--   - `destinations` (new) — source of truth, an ordered array. First entry
--     is the primary. Always non-empty after this migration; backfilled from
--     the existing `destination` for every row that has one.
--   - `destination`  (legacy) — kept in sync with `destinations[1]` by the
--     application layer. Listing pages and the cart still display this
--     until the read sites are migrated to format the full array.
--
-- The application is responsible for keeping the two in sync — there is no
-- DB trigger so a partial deploy can't accidentally orphan one of the columns.
-- A trigger can be added in a follow-up once every read site uses the array.
--
-- Filter queries change shape:
--   before:  .eq('destination', 'Cairo')
--   after:   .contains('destinations', ['Cairo'])     -- (cs operator)
-- The GIN index below makes the contains/overlap operators fast.
--
-- Safe to run more than once: every statement is idempotent (IF NOT EXISTS,
-- WHERE-guarded backfill).

-- 1. Add the column. Default empty array so NOT NULL is honoured immediately
--    for new inserts; backfill below populates existing rows.
ALTER TABLE public.tours
  ADD COLUMN IF NOT EXISTS destinations TEXT[] NOT NULL DEFAULT '{}'::TEXT[];

-- 2. Backfill: seed `destinations` from the existing single `destination`
--    column for every row that has one and isn't already populated. This
--    leaves rows where someone has already written `destinations` alone.
UPDATE public.tours
SET destinations = ARRAY[destination]
WHERE destination IS NOT NULL
  AND destination <> ''
  AND (destinations IS NULL OR array_length(destinations, 1) IS NULL);

-- 3. GIN index for fast array membership / overlap filtering. Postgres uses
--    this for `destinations @> ARRAY['Cairo']` (contains) and
--    `destinations && ARRAY['Cairo','Luxor']` (overlap) — both shapes the
--    tour-listing filter will use after the code update.
CREATE INDEX IF NOT EXISTS idx_tours_destinations_gin
  ON public.tours USING GIN (destinations);

-- 4. Helpful comment on the column so future developers see the dual-field
--    contract from `\d+ tours` without diving into application code.
COMMENT ON COLUMN public.tours.destinations IS
  'Ordered list of destinations this tour covers. First element mirrors the legacy `destination` column. App layer keeps both in sync; filter queries should use this column with array operators (@>, &&) for index-backed performance.';

-- ── Rollback (commented intentionally) ─────────────────────────────────────
-- Run manually if you need to undo. Drops the new column + index but
-- leaves the legacy `destination` column intact.
--
--   DROP INDEX IF EXISTS public.idx_tours_destinations_gin;
--   ALTER TABLE public.tours DROP COLUMN IF EXISTS destinations;
