-- AI Chat v2: booking lookup foundation.
-- Adds opaque share tokens to bookings + new agency_ai_config toggles
-- for the customer-support flow.

-- ─── 1. Share tokens on bookings ────────────────────────────────────────────
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS share_token TEXT,
  ADD COLUMN IF NOT EXISTS share_expires_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_share_token_unique
  ON public.bookings(share_token) WHERE share_token IS NOT NULL;

COMMENT ON COLUMN public.bookings.share_token IS
  'Opaque random token used by /booking/<token> share pages. NULL until generated. The token IS the secret — surface it only via the AI chat or post-checkout email.';

-- Backfill: every existing booking gets a token + 90-day expiry. Bookings
-- with no booking_date fall back to created_at for the expiry anchor.
-- Uses pgcrypto's gen_random_bytes (Supabase has pgcrypto enabled).
UPDATE public.bookings
SET
  share_token = encode(gen_random_bytes(24), 'hex'),
  share_expires_at = COALESCE(
    booking_date::timestamptz,
    created_at,
    NOW()
  ) + INTERVAL '90 days'
WHERE share_token IS NULL;

-- ─── 2. New AI Concierge capability toggles ─────────────────────────────────
ALTER TABLE public.agency_ai_config
  ADD COLUMN IF NOT EXISTS allow_booking_lookup BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS allow_payment_links BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.agency_ai_config.allow_booking_lookup IS
  'When true, the AI Concierge can look up the visitor''s booking by email+name.';

COMMENT ON COLUMN public.agency_ai_config.allow_payment_links IS
  'When true, the AI Concierge can mint a Kashier checkout link for a pending booking.';
