-- Per-agency GitHub Copilot integration fields.
-- See docs/copilot-migration-plan.md for full design rationale.

ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS copilot_github_token_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS copilot_user_login TEXT,
  ADD COLUMN IF NOT EXISTS copilot_plan TEXT,
  ADD COLUMN IF NOT EXISTS copilot_connected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS copilot_model_preferences JSONB
    NOT NULL DEFAULT '{}'::JSONB;

COMMENT ON COLUMN public.agencies.copilot_github_token_encrypted IS
  'AES-256-GCM encrypted GitHub OAuth token (device-flow source). Server-only; never expose. NULL = AI features disabled for this agency.';
