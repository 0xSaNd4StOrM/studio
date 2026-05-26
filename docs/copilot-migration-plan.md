# GitHub Copilot Migration Plan — Replace OpenRouter

Status: **Draft — pending review**
Author: planning session, 2026-05
Scope: replace `src/lib/ai/openrouter.ts` and all call sites with a per-agency GitHub Copilot integration. Every AI surface in the app (public + admin) consumes the requesting agency's own Copilot subscription.

---

## 1. Decisions captured

These were settled during planning. The implementation MUST honour them:

| # | Decision | Implication |
|---|---|---|
| D1 | Token ownership = **per-agency (Option B)** | Each agency owner connects their own Copilot subscription once. The SaaS owner pays $0 for AI calls. |
| D2 | Public AI features = **hidden, not disabled**, when agency hasn't connected | `/tailor-made` redirects to `/tours`; nav link is omitted; cart "Need inspiration?" card doesn't render. No "AI is unavailable" toasts visible to visitors. |
| D3 | Admin can pick a model **per feature** from a curated free-tier list | Examples: GPT-5 Mini, GPT-4.1, GPT-4.1 Mini (Raptor Mini), Claude 3.5 Sonnet. Stored in `agencies.copilot_model_preferences` JSONB. |
| D4 | Encryption key env var = `AGENCY_SECRETS_KEY` | 32-byte hex; AES-256-GCM for token at rest. |
| D5 | Disconnect = **immediate** revocation | The encrypted token row is nulled AND the in-memory Copilot-bearer cache for that agency is cleared. No grace period. |

---

## 2. Architecture overview

```
┌──────────────────── public visitor on agency.com ─────────────────────┐
│                                                                         │
│  Tailor-made form ─┐                                                    │
│  Cart "inspire" ───┤                                                    │
│                    ▼                                                    │
│  Server action ── getCurrentAgency() ──> resolve agency by domain      │
│                    │                                                    │
│                    ▼                                                    │
│            ┌──────────────────────────┐                                 │
│            │  src/lib/ai/copilot.ts   │  ← single gateway              │
│            │  generateText / Struct   │                                 │
│            └────────────┬─────────────┘                                 │
│                         │                                               │
│  ┌──────────────────────▼──────────────────────┐                       │
│  │  src/lib/ai/copilot-auth.ts                  │                       │
│  │  ┌─────────────────────────────────────┐    │                       │
│  │  │ in-memory Map<agencyId,             │    │                       │
│  │  │   { copilotBearer, expiresAt }>     │    │                       │
│  │  └─────────────────────────────────────┘    │                       │
│  │                                              │                       │
│  │  on miss/expiry:                             │                       │
│  │   1. read encrypted gh_token from DB         │                       │
│  │   2. decrypt with AGENCY_SECRETS_KEY         │                       │
│  │   3. POST api.github.com/copilot_internal/   │                       │
│  │            v2/token → copilot bearer         │                       │
│  │   4. cache for ~25 min                       │                       │
│  └──────────────────────┬───────────────────────┘                       │
│                         │                                               │
│                         ▼                                               │
│           POST api.githubcopilot.com/chat/completions                  │
│           Authorization: Bearer <copilot_bearer>                        │
│           Editor-Version: vscode/1.95.0                                 │
│           Editor-Plugin-Version: copilot-chat/0.20.0                    │
│           Copilot-Integration-Id: vscode-chat                           │
│           User-Agent: GithubCopilot/1.0                                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────── admin dashboard (agency owner) ────────────────────┐
│                                                                         │
│  Settings → AI & Copilot section                                       │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ [Connect GitHub Copilot]                                       │    │
│  │   POST /api/copilot/device/start  → returns user_code +        │    │
│  │                                      device_code               │    │
│  │   modal: "Visit github.com/login/device, enter A4B2-9F8E"     │    │
│  │   POST /api/copilot/device/poll   (every 5s) → finalize       │    │
│  │   on success: backend encrypts + stores gh_token,              │    │
│  │               first copilot exchange to verify, returns        │    │
│  │               { login, plan, models }                          │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  AI Command Center (dashboard top)                                     │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ if !agency.aiEnabled → "Connect Copilot to unlock AI" panel    │    │
│  │ if  agency.aiEnabled → 3 tabs (blog/tour/advanced plan)        │    │
│  │   each tab uses agency's model_preferences[feature]            │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Database schema

New migration: `supabase/migrations/YYYYMMDDHHMMSS_add_copilot_fields_to_agencies.sql`

```sql
ALTER TABLE public.agencies
  -- Encrypted GitHub OAuth access token (the long-lived one obtained via
  -- device flow). Format: `<iv>:<ciphertext>:<authtag>` all hex-encoded,
  -- AES-256-GCM with AGENCY_SECRETS_KEY. NULL = not connected.
  ADD COLUMN IF NOT EXISTS copilot_github_token_encrypted TEXT,
  -- Public-readable metadata for the settings UI. Filled at connect time.
  ADD COLUMN IF NOT EXISTS copilot_user_login TEXT,
  ADD COLUMN IF NOT EXISTS copilot_plan TEXT,
  ADD COLUMN IF NOT EXISTS copilot_connected_at TIMESTAMPTZ,
  -- Map<feature, modelId>. Falls back to defaults in src/lib/ai/models.ts.
  ADD COLUMN IF NOT EXISTS copilot_model_preferences JSONB
    NOT NULL DEFAULT '{}'::JSONB;

COMMENT ON COLUMN public.agencies.copilot_github_token_encrypted IS
  'AES-256-GCM encrypted GitHub OAuth token (device-flow source). Server-only; never expose. NULL = AI features disabled for this agency.';

-- No RLS changes — existing agency RLS already protects this row.
```

**Why JSONB for model preferences**: lets us add new feature keys without
a migration. Shape: `{ tourGeneration: "claude-3.5-sonnet", seoAssist: "gpt-4.1-mini", ... }`.

---

## 4. Encryption (`src/lib/ai/crypto.ts`)

```ts
// AES-256-GCM. Format: `${iv-hex}:${cipher-hex}:${authTag-hex}`
export function encryptToken(plaintext: string): string;
export function decryptToken(payload: string): string;
```

- Key source: `process.env.AGENCY_SECRETS_KEY` (32 bytes hex).
- Throws on missing/invalid key — fail loud, never fall back to plaintext.
- Wraps Node's `crypto` module; no extra deps.
- Used ONLY on the server side (server actions + API routes).

---

## 5. Auth flow — Device Code (`src/lib/ai/copilot-auth.ts`)

GitHub's device flow is the only path that returns a token usable against
`api.github.com/copilot_internal/v2/token`. The endpoint requires the
client_id of an OAuth app that's allowlisted for Copilot. The well-known
public ones are:

- `Iv1.b507a08c87ecfe98` (VS Code) — **what we'll use**
- `01ab8ac9400c4e429b23` (GitHub CLI / `gh`)

Both work; both have device-flow + Copilot scopes registered. We use the
VS Code one because it's the de-facto standard third-party tools use.

```ts
// Step 1 — request a device code
// POST https://github.com/login/device/code
// body: { client_id, scope: "read:user" }
// returns: { device_code, user_code, verification_uri, interval, expires_in }
export async function requestDeviceCode(): Promise<DeviceCodeResponse>;

// Step 2 — poll for completion (called by the API route, not the client)
// POST https://github.com/login/oauth/access_token
// body: { client_id, device_code, grant_type: "urn:ietf:params:oauth:grant-type:device_code" }
// returns either: { access_token, token_type, scope }
//          or:    { error: "authorization_pending" | "slow_down" | "expired_token" | "access_denied" }
export async function pollAccessToken(deviceCode: string): Promise<PollResult>;

// Step 3 — exchange the GitHub OAuth token for a short-lived Copilot bearer
// GET https://api.github.com/copilot_internal/v2/token
// headers: { Authorization: `token ${githubToken}`, "User-Agent": "GithubCopilot/1.0" }
// returns: { token, expires_at, refresh_in, endpoints: { api: "https://api.githubcopilot.com" }, ... }
// throws if the user's account has no Copilot subscription.
export async function exchangeForCopilotBearer(
  githubToken: string
): Promise<CopilotBearer>;

// Step 4 — per-agency cached bearer (in-memory)
// On miss/expiry: read encrypted token from DB → decrypt → re-exchange.
// On disconnect: clear the agency's entry.
export async function getCopilotBearerForAgency(
  agencyId: string
): Promise<string>;

export function clearCopilotBearerCache(agencyId: string): void;
```

Cache shape:

```ts
const cache = new Map<string, { bearer: string; expiresAt: number }>();
// expiresAt is wall-clock ms; refresh when within 60s of expiry.
```

---

## 6. Gateway (`src/lib/ai/copilot.ts`)

Mirrors the OpenRouter file's public API so call-site changes are minimal:

```ts
export interface CopilotTextOptions {
  agencyId: string;                 // who pays
  feature: AiFeature;               // which model preference to use
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  models?: string[];                // override; defaults from preference
}

export interface CopilotStructuredOptions<TSchema extends z.ZodTypeAny>
  extends CopilotTextOptions {
  schema: TSchema;
}

export async function generateTextWithCopilot(
  options: CopilotTextOptions
): Promise<string>;

export async function generateStructuredWithCopilot<TSchema extends z.ZodTypeAny>(
  options: CopilotStructuredOptions<TSchema>
): Promise<z.infer<TSchema>>;
```

Implementation reuses the OpenRouter file's good parts:
- Multi-model fallback loop (try each in order, collect failures)
- Robust JSON extraction (strip ```json fences, slice braces, parse)
- Zod schema validation with error formatting

Request shape (same as OpenAI chat completions):

```http
POST https://api.githubcopilot.com/chat/completions
Authorization: Bearer <copilot_bearer>
Editor-Version: vscode/1.95.0
Editor-Plugin-Version: copilot-chat/0.20.0
Copilot-Integration-Id: vscode-chat
User-Agent: GithubCopilot/1.0
Content-Type: application/json

{
  "model": "gpt-4.1-mini",
  "messages": [ ... ],
  "temperature": 0.6,
  "response_format": { "type": "json_object" }  // for structured calls
}
```

The `Editor-Version` and `Editor-Plugin-Version` headers are NOT optional —
the Copilot endpoint rejects requests without them.

---

## 7. Model registry (`src/lib/ai/models.ts`)

Single source of truth for what models are offered to admins and what the
default is for each feature.

```ts
export const AI_FEATURES = [
  'tour-generation',         // /tailor-made public flow
  'cart-suggestions',        // cart "Need inspiration?"
  'blog-draft',              // admin Command Center
  'tour-draft',              // admin Command Center
  'advanced-plan',           // admin Command Center
  'seo-assist',              // admin settings SEO
] as const;
export type AiFeature = (typeof AI_FEATURES)[number];

export interface ModelOption {
  id: string;          // Copilot model id, e.g. "gpt-4.1-mini"
  label: string;       // "GPT-4.1 Mini"
  tier: 'free' | 'premium';
  goodFor: AiFeature[];  // recommended fits
}

export const AVAILABLE_MODELS: ModelOption[] = [
  { id: 'gpt-4.1-mini',     label: 'GPT-4.1 Mini (Raptor Mini)', tier: 'free', goodFor: ['seo-assist', 'cart-suggestions'] },
  { id: 'gpt-4.1',          label: 'GPT-4.1 (Raptor)',           tier: 'free', goodFor: ['tour-draft', 'blog-draft'] },
  { id: 'gpt-5-mini',       label: 'GPT-5 Mini',                 tier: 'free', goodFor: ['cart-suggestions', 'seo-assist'] },
  { id: 'claude-3.5-sonnet',label: 'Claude 3.5 Sonnet',          tier: 'free', goodFor: ['tour-generation', 'blog-draft', 'advanced-plan'] },
];

export const DEFAULT_MODEL_FOR_FEATURE: Record<AiFeature, string> = {
  'tour-generation':   'claude-3.5-sonnet',
  'cart-suggestions':  'gpt-4.1-mini',
  'blog-draft':        'claude-3.5-sonnet',
  'tour-draft':        'gpt-4.1',
  'advanced-plan':     'claude-3.5-sonnet',
  'seo-assist':        'gpt-4.1-mini',
};

export function resolveModelForAgency(
  agency: Agency,
  feature: AiFeature
): string {
  const prefs = agency.settings?.copilot_model_preferences ?? {};
  const chosen = prefs[feature];
  if (chosen && AVAILABLE_MODELS.some((m) => m.id === chosen)) return chosen;
  return DEFAULT_MODEL_FOR_FEATURE[feature];
}
```

Adding a new model later = one line in `AVAILABLE_MODELS`. Adding a new
feature = add to the `AI_FEATURES` union + default mapping. No migration.

---

## 8. Per-feature integration map

Every existing AI call site, where it goes, and the model it'll use.

### 8.1 Public — Tailor-Made Tour (`/tailor-made`)
- **File**: `src/ai/flows/generateTour.ts`
- **Action**: `generateTailorMadeTourAction` ([actions.ts:174](../src/app/actions.ts))
- **Migration**: replace `generateStructuredWithOpenRouter` call with `generateStructuredWithCopilot({ agencyId, feature: 'tour-generation', ... })`.
- **Gating**: `src/app/(main)/tailor-made/page.tsx` — server check: if `!agency.copilotConnected`, `redirect('/tours')`. Also conditionally render the nav link in `src/components/header.tsx` and the footer link.

### 8.2 Public — Cart AI Suggestions
- **File**: `src/ai/flows/suggest-alternative-tours.ts`
- **Action**: `getAiSuggestions` ([actions.ts:84](../src/app/actions.ts))
- **Migration**: same swap with `feature: 'cart-suggestions'`.
- **Gating**: `src/app/(main)/cart/page.tsx` — read `agency.copilotConnected` (via SettingsProvider or a new context); when false, omit the entire "Need inspiration?" card from the sidebar render.

### 8.3 Admin — Blog Draft (Command Center Tab A)
- **Action**: `generateBlogDraftForAdminAction` ([actions.ts:298](../src/app/actions.ts))
- **Migration**: same swap with `feature: 'blog-draft'`.
- **Gating**: handled at the AI Command Center component level (entire card replaced with "Connect Copilot" panel when not connected).

### 8.4 Admin — Tour Draft (Command Center Tab B)
- **Action**: `generateTourDraftForAdminAction` ([actions.ts:298+](../src/app/actions.ts))
- **Migration**: same swap with `feature: 'tour-draft'`.

### 8.5 Admin — Advanced Tailor-Made Plan (Command Center Tab C)
- **Action**: `generateAdvancedTailorMadePlanAction` ([actions.ts:590](../src/app/actions.ts))
- **Migration**: same swap with `feature: 'advanced-plan'`.

### 8.6 Admin — SEO Assistant (settings page)
- **Action**: `generateSeoAssistAction` ([actions.ts:222](../src/app/actions.ts))
- **Migration**: same swap with `feature: 'seo-assist'`.
- **Gating**: settings UI — when not connected, the ✨ AI buttons next to each SEO field group are disabled with a tooltip "Connect Copilot in the AI section to enable".

### 8.7 DELETE — Legacy public blog generator
- **File**: `src/ai/flows/generate-blog-post.ts`
- **Action**: `generateBlogPostAction` ([actions.ts:129](../src/app/actions.ts))
- **Status**: replaced by Command Center Tab A (admin-only). Public visitors never needed this. Delete the file + action + any UI references.

---

## 9. Admin Settings UX

### 9.1 New section: "AI & Copilot"

Placement: in `src/app/admin/settings/page.tsx`, add a new Card between
Email Notifications and Currency. Anchor id `copilot` (so it's accessible
from the `<SettingsToc>` sidebar). Add to the toc inventory in
`src/components/admin/settings-toc.tsx`.

#### Not connected state

```
┌─ AI & Copilot ──────────────────────────────────────┐
│ Status: ⚪ Not connected                              │
│                                                       │
│ Connect your GitHub Copilot subscription to enable   │
│ AI features for your agency — tailor-made tours,     │
│ blog drafts, SEO assistant, and more.                │
│                                                       │
│ Requires: Copilot Pro, Business, or Enterprise.      │
│                                                       │
│        [ Connect GitHub Copilot ]                    │
└───────────────────────────────────────────────────────┘
```

#### Connect modal (device flow)

Triggered by the Connect button → POST `/api/copilot/device/start`:

```
┌─ Connect Copilot ───────────────────────────────────┐
│ Step 1: Open this link                              │
│         https://github.com/login/device             │
│         [Open in new tab]                           │
│                                                       │
│ Step 2: Enter this code                             │
│              ╭──────────────╮                         │
│              │  A4B2-9F8E   │  [Copy]                 │
│              ╰──────────────╯                         │
│                                                       │
│ Waiting for authorization... ⏳ 14:32 remaining     │
│                                                       │
│ [Cancel]                                              │
└───────────────────────────────────────────────────────┘
```

Client polls `/api/copilot/device/poll?id=<sessionId>` every 5s. On
success, modal closes → settings refreshes → connected state renders.

#### Connected state

```
┌─ AI & Copilot ──────────────────────────────────────┐
│ Status: ✅ Connected as @hossamomar                  │
│ Plan: Copilot Pro                                    │
│ Connected: 3 days ago                                 │
│                                                       │
│ ┌─ Model preferences ──────────────────────────┐    │
│ │ Tour generation:     [Claude 3.5 Sonnet ▼]  │    │
│ │ Cart suggestions:    [GPT-4.1 Mini      ▼]  │    │
│ │ Blog drafts:         [Claude 3.5 Sonnet ▼]  │    │
│ │ Tour bootstrap:      [GPT-4.1           ▼]  │    │
│ │ Advanced plans:      [Claude 3.5 Sonnet ▼]  │    │
│ │ SEO metadata:        [GPT-4.1 Mini      ▼]  │    │
│ └──────────────────────────────────────────────┘    │
│                                                       │
│ [Disconnect]                                          │
└───────────────────────────────────────────────────────┘
```

Each dropdown lists every entry in `AVAILABLE_MODELS`. Selection writes
to `agencies.copilot_model_preferences` via a server action.

### 9.2 New component: `src/components/admin/copilot-connect-card.tsx`

Client component. Owns the connect modal, polling logic, status display,
model dropdowns. Imports the device-flow API routes; doesn't know about
the underlying gateway.

### 9.3 SettingsToc entry

```ts
{ id: 'copilot', label: 'AI & Copilot', group: 'Setup',
  keywords: 'ai copilot github model gpt claude' }
```

---

## 10. API routes

### `POST /api/copilot/device/start`

- Admin-authenticated (existing `checkAgencyAccess()` guard).
- Calls `requestDeviceCode()`.
- Stores `{ deviceCode, agencyId, expiresAt, interval }` in a server-side
  in-memory map keyed by a session id (UUID). NOT persisted — short-lived.
- Returns `{ sessionId, userCode, verificationUri, expiresIn, interval }`.

### `GET /api/copilot/device/poll?id=<sessionId>`

- Admin-authenticated.
- Looks up `deviceCode` for the session.
- Calls `pollAccessToken(deviceCode)`.
- On `authorization_pending` / `slow_down` → returns `{ status: 'pending' }`.
- On `access_denied` / `expired_token` → returns `{ status: 'error', code }`.
- On success:
  1. Calls `exchangeForCopilotBearer(githubToken)` to verify Copilot access.
  2. Captures `login`, `plan` (from the GitHub user API + Copilot endpoint).
  3. Encrypts `githubToken` with `encryptToken()`.
  4. Writes encrypted token + metadata to the `agencies` row.
  5. Returns `{ status: 'connected', login, plan }`.

### `POST /api/copilot/disconnect`

- Admin-authenticated.
- Sets `copilot_github_token_encrypted = NULL`, clears metadata fields.
- Calls `clearCopilotBearerCache(agencyId)`.
- Returns `{ status: 'ok' }`.

### `POST /api/copilot/preferences`

- Admin-authenticated.
- Body: `{ feature: AiFeature, model: string }`. Both validated against
  the registry — unknown values rejected.
- Updates `agencies.copilot_model_preferences[feature] = model`.

---

## 11. Public-facing gating

We need a way for both server components and client components to know
"is AI enabled for the current agency."

### Server side
- `src/lib/supabase/agencies.ts` — extend `Agency` shape with a derived
  boolean `aiEnabled: boolean` computed in `getCurrentAgency()` as
  `!!data.copilot_github_token_encrypted`. The encrypted token itself is
  NEVER returned to the client — only the boolean.

### Client side
- `SettingsProvider` (existing) extended to include `aiEnabled` in the
  value it provides. Consumers (Header, Cart, etc.) call
  `useSettings()?.aiEnabled`.

### Gating list

| Surface | When `!aiEnabled` |
|---|---|
| Header nav "Tailor Made" link | Don't render |
| Footer "Tailor Made" link | Don't render |
| `/tailor-made` route | `redirect('/tours')` server-side |
| Cart "Need inspiration?" card | Don't render |
| Admin `<AiCommandCenter>` | Replace with "Connect Copilot" CTA card |
| Admin SEO ✨ buttons | Disabled + tooltip |

---

## 12. Cleanup — removing OpenRouter

### Files to delete
- `src/lib/ai/openrouter.ts`
- `src/ai/flows/generate-blog-post.ts` (legacy public blog generator, see 8.7)
- `src/ai/genkit.ts` (already a stub, finish removing)

### Env vars to remove from `.env` template + docs
- `OPENROUTER_API_KEY`
- `OPENROUTER_FREE_MODELS`
- `OPENROUTER_BASE_URL`
- `OPENROUTER_HTTP_REFERER`
- `OPENROUTER_APP_NAME`

### Env vars to add
- `AGENCY_SECRETS_KEY` — 32-byte hex, used for AES-256-GCM token encryption.
  Generation hint: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### Server-action import updates
All 6 actions in `src/app/actions.ts` change from
`@/lib/ai/openrouter` to `@/lib/ai/copilot`. The `generateBlogPostAction`
gets deleted entirely along with its call sites (if any remain).

---

## 13. Implementation order (sprints)

Each sprint ends with `npm run typecheck && npm run lint` passing.

### Sprint α — Foundation (~half day)
1. Run the migration: `add_copilot_fields_to_agencies.sql`.
2. Add `AGENCY_SECRETS_KEY` to env. Generate one for dev.
3. Build `src/lib/ai/crypto.ts` (encrypt/decrypt round-trip unit-tested).
4. Build `src/lib/ai/copilot-auth.ts` (device flow + token exchange + cache).
5. Extend `Agency` type + `getCurrentAgency()` to expose `aiEnabled`.

### Sprint β — Gateway (~half day)
6. Build `src/lib/ai/copilot.ts` mirroring the OpenRouter API.
7. Build `src/lib/ai/models.ts` (registry + defaults + resolver).
8. Add API routes:
   - `/api/copilot/device/start`
   - `/api/copilot/device/poll`
   - `/api/copilot/disconnect`
   - `/api/copilot/preferences`

### Sprint γ — Settings UI (~half day)
9. Build `src/components/admin/copilot-connect-card.tsx`.
10. Wire into `src/app/admin/settings/page.tsx` with anchor `copilot`.
11. Add the section to `src/components/admin/settings-toc.tsx`.

### Sprint δ — Migrate call sites (~half day)
12. Replace `generateTourFlow` openrouter call → copilot.
13. Replace `suggestAlternativeTours` openrouter call → copilot.
14. Replace all 4 admin actions in `src/app/actions.ts` → copilot.
15. Delete `generateBlogPostAction` + `generate-blog-post.ts`.

### Sprint ε — Public gating (~half day)
16. Header + Footer: conditionally render Tailor-Made link.
17. `/tailor-made` route guard: redirect when `!aiEnabled`.
18. Cart: omit "Need inspiration?" card when `!aiEnabled`.
19. Admin AI Command Center: render "Connect Copilot" CTA when `!aiEnabled`.
20. Admin SEO buttons: disabled tooltip when `!aiEnabled`.

### Sprint ζ — Cleanup (~quarter day)
21. Delete `src/lib/ai/openrouter.ts`.
22. Delete `src/ai/genkit.ts`.
23. Remove `OPENROUTER_*` from env + docs.
24. Add doc snippet "Connecting Copilot" to README or this file's appendix.

**Total: ~2.5 days of focused work.**

---

## 14. Testing checklist

### Manual checks for each agency
- [ ] Settings → AI & Copilot card shows "Not connected" before setup.
- [ ] Click Connect → modal shows a code that matches what GitHub displays.
- [ ] Authorize on github.com → modal flips to connected within ~5s.
- [ ] Connected card shows correct `@login` and plan.
- [ ] Model dropdowns list available models; default selection persists.
- [ ] Change a model → server action returns OK → reload still shows new choice.
- [ ] Tailor-made link appears in header/footer (was hidden before).
- [ ] `/tailor-made` form generates a real itinerary using the chosen model.
- [ ] Cart "Need inspiration?" card now appears.
- [ ] Admin Command Center 3 tabs all work end-to-end.
- [ ] Admin SEO ✨ buttons no longer disabled; generate metadata.
- [ ] Disconnect → all the above reverts immediately. No grace period.

### Cross-agency isolation
- [ ] Connect agency A. Verify agency B's tenant still shows "not connected".
- [ ] Agency A's AI calls only succeed; agency B's are not exposed.

### Token expiry
- [ ] Wait 30+ min after a call → next call should silently re-exchange the
  bearer (test by manually shrinking the cache TTL to 1 min in dev).

### Failure modes
- [ ] Set GH token to garbage → AI calls fail gracefully (toast says
  "AI connection error", agency still has site features intact).
- [ ] Disable Copilot subscription on the GitHub account → re-exchange
  returns 403 → we should detect this and auto-disconnect that agency,
  clearing the encrypted token and showing the "Not connected" state.

---

## 15. Risk & ToS notes

### Status of this approach
This uses the same internal Copilot API VS Code and tools like
`opencode`, `aichat`, and the user's hermes-agent already use. Public
posture from GitHub: **neither endorsed nor explicitly prohibited.**
No known cases of account suspension for this usage pattern over the
past ~2 years.

### Practical risks
1. **Endpoint changes**: `api.githubcopilot.com` is internal, no
   stability guarantee. Mitigation: the gateway's error envelope is
   forgiving (we already handle JSON shape variance for non-compliant
   models). If the endpoint structure changes, ~1 day of work to
   re-target.

2. **Rate limits**: Copilot Pro is generous but not unlimited. An
   agency hammering the public tailor-made form with bot traffic could
   exhaust their quota. Mitigation (future, not v1): per-agency
   request rate limiting at our edge.

3. **Token leakage**: agencies trust us with their GitHub OAuth tokens.
   The encryption (AES-256-GCM with a 32-byte key) protects at rest,
   but the key itself sits in our env. If `AGENCY_SECRETS_KEY` leaks,
   every agency's token is exposed. Mitigation: standard production
   secret hygiene; consider key rotation procedure as a separate doc.

4. **Account suspension worst case**: if GitHub does crack down and an
   agency's account gets paused, the agency's AI features go offline.
   Our side keeps working — they just see "Not connected" state.
   Mitigation: nothing client-side to do; this is a tail risk.

---

## 16. Open / future work

Not in v1. Listed for posterity:

- **Usage tracking**: an `ai_generations` audit table (`agency_id`,
  `feature`, `model`, `tokens_in`, `tokens_out`, `latency_ms`,
  `created_at`). Foundation for per-agency analytics + future tiered
  billing.

- **Streaming responses**: the Copilot endpoint supports SSE. For long
  outputs (Advanced Plan ~30s), streaming would feel ~3× faster. Adds
  client complexity (Server-Sent Events) — defer.

- **Premium model gating**: today every model in the registry is treated
  the same. If/when we add o3 or Claude Opus, gate behind a plan column
  on the agency or a SaaS-wide flag.

- **Cart suggestions → real tours**: today it returns plain strings.
  Upgrade to RAG-style: pass the catalog as context, get back actual
  tour IDs we can link to.

- **Per-feature token budgets**: prevent a runaway loop on Advanced Plan
  from burning the agency's daily quota. UI shows "X% of estimated
  daily quota remaining."

---

## 17. Sign-off checklist

Before merging Sprint ζ:

- [ ] All 6 sprints' work is in.
- [ ] `npm run typecheck` clean.
- [ ] `npm run lint` clean.
- [ ] Migration applied to staging Supabase.
- [ ] At least one staging agency successfully connected + tested all 6 AI surfaces.
- [ ] Disconnect → reconnect cycle works.
- [ ] Old `OPENROUTER_*` env vars removed from production secrets.
- [ ] README updated with the "Connect Copilot" section.
- [ ] This plan moved from `docs/copilot-migration-plan.md` to
      `docs/copilot-integration.md` (it becomes the canonical reference,
      not a "plan").

---

**End of plan.** Ready for review. Once approved, I'll execute Sprint α first and check in for a review before continuing.
