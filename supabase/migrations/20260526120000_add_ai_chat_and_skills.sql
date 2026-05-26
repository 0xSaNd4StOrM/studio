-- AI Concierge chat + skills system.
-- See docs/ai-chat-plan.md for full design rationale.

-- ─── 1. Per-agency AI config (1:1 with agencies) ────────────────────────────
CREATE TABLE IF NOT EXISTS public.agency_ai_config (
  agency_id UUID PRIMARY KEY REFERENCES public.agencies(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL DEFAULT 'Concierge',
  greeting TEXT NOT NULL DEFAULT 'Hi! How can I help you plan your trip?',
  persona_prompt TEXT NOT NULL DEFAULT '',
  knowledge_text TEXT NOT NULL DEFAULT '',
  rules_text TEXT NOT NULL DEFAULT '',
  allow_negotiation BOOLEAN NOT NULL DEFAULT FALSE,
  allow_discounts BOOLEAN NOT NULL DEFAULT FALSE,
  max_discount_pct INTEGER NOT NULL DEFAULT 0 CHECK (max_discount_pct BETWEEN 0 AND 100),
  allow_booking_creation BOOLEAN NOT NULL DEFAULT FALSE,
  show_concierge_widget BOOLEAN NOT NULL DEFAULT FALSE,
  greeting_delay_seconds INTEGER NOT NULL DEFAULT 8 CHECK (greeting_delay_seconds BETWEEN 0 AND 120),
  data_access JSONB NOT NULL DEFAULT '{
    "public_catalog": true,
    "prices": true,
    "availability": true,
    "admin_notes": false,
    "review_text": false
  }'::JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.agency_ai_config IS
  'Per-agency configuration for the AI concierge chat (persona, rules, capabilities).';

ALTER TABLE public.agency_ai_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agency members read own ai config" ON public.agency_ai_config;
CREATE POLICY "Agency members read own ai config"
  ON public.agency_ai_config FOR SELECT
  USING (
    agency_id IN (
      SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Agency members write own ai config" ON public.agency_ai_config;
CREATE POLICY "Agency members write own ai config"
  ON public.agency_ai_config FOR ALL
  USING (
    agency_id IN (
      SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()
    )
  );

-- Public-readable view exposing only the flags the public site needs
-- (whether to show the widget and what greeting to render). The persona,
-- knowledge, and rules stay private — they're only used server-side when
-- building the LLM prompt.
CREATE OR REPLACE VIEW public.agency_ai_public AS
  SELECT
    agency_id,
    agent_name,
    greeting,
    show_concierge_widget,
    greeting_delay_seconds
  FROM public.agency_ai_config;

GRANT SELECT ON public.agency_ai_public TO anon, authenticated;


-- ─── 2. Skills catalog ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL CHECK (category IN ('persona','sales','service','specialty')),
  system_prompt_fragment TEXT NOT NULL,
  tools_allowed JSONB NOT NULL DEFAULT '[]'::JSONB,
  ui_hints JSONB NOT NULL DEFAULT '{}'::JSONB,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  created_by_agency_id UUID NULL REFERENCES public.agencies(id) ON DELETE SET NULL,
  review_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (review_status IN ('draft','pending','approved','rejected')),
  published_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skills_public_approved
  ON public.skills (is_public, review_status)
  WHERE is_public = TRUE AND review_status = 'approved';
CREATE INDEX IF NOT EXISTS idx_skills_created_by
  ON public.skills (created_by_agency_id);

ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public approved skills are readable" ON public.skills;
CREATE POLICY "Public approved skills are readable"
  ON public.skills FOR SELECT
  USING (is_public = TRUE AND review_status = 'approved');

DROP POLICY IF EXISTS "Owners read own skills" ON public.skills;
CREATE POLICY "Owners read own skills"
  ON public.skills FOR SELECT
  USING (
    created_by_agency_id IN (
      SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners write own skills" ON public.skills;
CREATE POLICY "Owners write own skills"
  ON public.skills FOR ALL
  USING (
    created_by_agency_id IN (
      SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()
    )
  );


-- ─── 3. Per-agency skill attachments ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agency_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  custom_config JSONB NOT NULL DEFAULT '{}'::JSONB,
  installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (agency_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_agency_skills_agency
  ON public.agency_skills (agency_id, is_enabled);

ALTER TABLE public.agency_skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agency members manage own skill attachments" ON public.agency_skills;
CREATE POLICY "Agency members manage own skill attachments"
  ON public.agency_skills FOR ALL
  USING (
    agency_id IN (
      SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()
    )
  );


-- ─── 4. Chat session metadata (server-only audit) ───────────────────────────
-- The conversation transcript lives in the visitor's sessionStorage; this
-- table only tracks the server's view: which session is rate-limited, who
-- made tool calls when, etc.
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  surface TEXT NOT NULL CHECK (surface IN ('concierge','tailor-made')),
  ip_hash TEXT,
  user_agent TEXT,
  message_count INTEGER NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_agency_recent
  ON public.chat_sessions (agency_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_ip_recent
  ON public.chat_sessions (ip_hash, created_at DESC);


-- ─── 5. Tool-call audit log ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'tool_call','refusal','handoff','message_in','message_out','error'
  )),
  tool_name TEXT,
  args JSONB,
  result_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_audit_session
  ON public.chat_audit_events (session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_audit_agency
  ON public.chat_audit_events (agency_id, created_at DESC);


-- ─── 6. Negotiation audit (separate from generic audit — business value) ────
CREATE TABLE IF NOT EXISTS public.chat_negotiation_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  tour_id UUID NULL REFERENCES public.tours(id) ON DELETE SET NULL,
  requested_pct INTEGER NOT NULL,
  cap_pct INTEGER NOT NULL,
  granted_pct INTEGER NULL,
  promo_code_id UUID NULL REFERENCES public.promo_codes(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_negotiation_agency
  ON public.chat_negotiation_audits (agency_id, created_at DESC);


-- ─── 7. Seed built-in public skills ──────────────────────────────────────────
-- Idempotent: ON CONFLICT (slug) DO NOTHING so re-running this migration
-- doesn't overwrite admin tweaks to seeded prompts.
INSERT INTO public.skills (slug, name, description, category, system_prompt_fragment, tools_allowed, is_public, review_status, published_at)
VALUES
  ('friendly-concierge', 'Friendly Concierge', 'Warm, helpful tone for the default agent persona.', 'persona',
   'Speak warmly and use the visitor''s first name if known. Confirm understanding before recommending.',
   '["searchTours","getTourDetails","getPrice","checkAvailability","handoffToHuman"]'::jsonb,
   TRUE, 'approved', NOW()),

  ('hard-negotiator', 'Hard Negotiator', 'Actively pursues discounts when the visitor seems hesitant.', 'sales',
   'When the visitor mentions price concerns or hesitates after a quote, proactively use proposeDiscount with a reasonable request (5-10%). Frame as "let me see what I can do for you".',
   '["proposeDiscount","getPrice","addToCart"]'::jsonb,
   TRUE, 'approved', NOW()),

  ('soft-negotiator', 'Soft Negotiator', 'Offers discounts only when explicitly asked twice.', 'sales',
   'Only use proposeDiscount after the visitor has asked for a discount or expressed price concern at least twice. Be polite but conservative.',
   '["proposeDiscount","getPrice","addToCart"]'::jsonb,
   TRUE, 'approved', NOW()),

  ('multilingual', 'Multilingual', 'Detects and responds in the visitor''s language.', 'service',
   'Detect the visitor''s language from their first message and respond in it. Fall back to English if uncertain.',
   '[]'::jsonb,
   TRUE, 'approved', NOW()),

  ('egypt-specialist', 'Egypt Specialist', 'Adds historical and cultural context for Egyptian destinations.', 'specialty',
   'When discussing Egyptian destinations, include brief historical context, best time to visit, and one practical local tip (dress code, tipping, etc).',
   '["getTourDetails"]'::jsonb,
   TRUE, 'approved', NOW()),

  ('upsell-specialist', 'Upsell Specialist', 'Suggests relevant add-ons when cart subtotal is above $1000.', 'sales',
   'When the visitor''s cart subtotal exceeds $1000, suggest one relevant upsell (insurance, private guide, airport assist). Never push more than one upsell per turn.',
   '["addToCart","getTourDetails"]'::jsonb,
   TRUE, 'approved', NOW()),

  ('family-first', 'Family-First', 'Prioritizes family-friendly tours when group has children.', 'specialty',
   'When the conversation indicates children in the party, prioritize family-friendly tours and call out child-suitability for each recommendation.',
   '["searchTours","getTourDetails"]'::jsonb,
   TRUE, 'approved', NOW()),

  ('safety-first', 'Safety-First', 'Always mentions insurance and key safety considerations.', 'service',
   'For trips longer than 3 days, always mention travel insurance. For activities like diving, hot-air ballooning, or desert camping, mention specific safety considerations.',
   '[]'::jsonb,
   TRUE, 'approved', NOW()),

  ('last-minute-closer', 'Last-Minute Closer', 'Creates urgency for trips starting soon.', 'sales',
   'For tours starting within 14 days, mention limited availability and that prices may rise. Use proposeDiscount sparingly to close the sale.',
   '["proposeDiscount","checkAvailability","addToCart"]'::jsonb,
   TRUE, 'approved', NOW()),

  ('sustainability-advocate', 'Sustainability Advocate', 'Highlights eco-friendly and sustainable tour options.', 'specialty',
   'When the visitor mentions interest in nature, sustainability, or ethics, highlight eco-conscious tour options and the agency''s sustainability practices.',
   '["searchTours","getTourDetails"]'::jsonb,
   TRUE, 'approved', NOW())

ON CONFLICT (slug) DO NOTHING;
