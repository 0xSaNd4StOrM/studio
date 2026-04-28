-- Add payment_method column to bookings, backfill existing rows,
-- and add indexes used for duplicate detection / admin listing.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_method text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bookings_payment_method_check'
      AND conrelid = 'public.bookings'::regclass
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_payment_method_check
      CHECK (payment_method IN ('cash', 'online') OR payment_method IS NULL);
  END IF;
END $$;

-- Backfill: confirmed legacy rows are assumed to be cash; pending/cancelled
-- legacy rows are assumed to be online (Kashier flow).
UPDATE public.bookings
SET payment_method = 'cash'
WHERE status = 'Confirmed'
  AND payment_method IS NULL;

UPDATE public.bookings
SET payment_method = 'online'
WHERE status IN ('Pending', 'Cancelled')
  AND payment_method IS NULL;

-- Indexes used by admin listings and duplicate-pending detection.
CREATE INDEX IF NOT EXISTS idx_bookings_agency_status_created
  ON public.bookings (agency_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_agency_email_status
  ON public.bookings (agency_id, customer_email, status);
