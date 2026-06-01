-- Deposits / partial payment: add a payment-state axis + money/audit columns.
-- Lifecycle `status` (Confirmed/Pending/Cancelled) is intentionally left alone.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS amount_paid numeric NOT NULL DEFAULT 0,   -- USD settled so far
  ADD COLUMN IF NOT EXISTS balance_due numeric NOT NULL DEFAULT 0,   -- USD still owed
  ADD COLUMN IF NOT EXISTS deposit_percent integer,                  -- audit: % applied
  ADD COLUMN IF NOT EXISTS charged_currency text,                    -- 'EGP'
  ADD COLUMN IF NOT EXISTS charged_amount numeric,                   -- actual EGP charged
  ADD COLUMN IF NOT EXISTS fx_rate_used numeric,                     -- USD->EGP at charge time
  ADD COLUMN IF NOT EXISTS balance_paid_at timestamptz;              -- when balance collected

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_payment_status_chk'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_payment_status_chk
      CHECK (payment_status IN ('unpaid','deposit_paid','paid_in_full'));
  END IF;
END $$;
