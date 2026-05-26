# AI Chat v2 — Polish + Customer Support + Payment Flow

Status: **Draft — pending review**
Author: planning session
Scope: five updates layered on top of the shipped AI Chat & Skills system. Most are scoped; item 4 introduces real new architecture (booking lookup + payment link + tokenized share page) and item 5 lifts skill authoring out of "free-text only" into "Markdown + AI-drafted."

---

## 1. The five updates at a glance

| # | Topic | Scope | Effort |
|---|---|---|---|
| U1 | Clickable links in chat — render `[text](url)` and bare URLs as `<a>` tags with a short label, not the raw URL | UI / chat-message renderer | XS |
| U2 | Chat responsive on small screens — fix the horizontal-overflow issue in your screenshot | UI / widget layout | XS |
| U3 | AI can add to cart smoothly + give a direct tour link when asked | System prompt + small tool tweak | S |
| U4 | AI as **customer support**: look up bookings by email+name, create payment links, confirm payment, surface a tokenized share page | Big — new tools, new public page, new DB column, payment-gateway action | L |
| U5 | Skill upgrades: `.md` upload, AI-drafted skills, raise the prompt cap to 10k+ chars | Skill editor + new server action | M |

The non-trivial decisions live in §2. Everything below assumes the **proposed** column.

---

## 2. Decisions to confirm before build

| # | Question | Proposed | Alt |
|---|---|---|---|
| D1 | Link text style — what does the visitor see for a markdown link? | **The markdown link text verbatim if provided; otherwise the URL's hostname** (e.g. `wa.me`, `tixandtripsegypt.com`). Never the full URL. | A flat "Link" label — uniform but loses context. |
| D2 | Schemes allowed in chat links | `http`, `https`, `mailto`, `tel`, `whatsapp` (+ `wa.me` https flavour). All others rendered as inert text. | Allow everything — opens an XSS surface. |
| D3 | Booking lookup — what does the visitor need to provide? | **Email AND name (case-insensitive, fuzzy on name)**. If both don't match a booking, return a generic "no matches" message — never leak whether an email exists. | Email only — too easy to enumerate. |
| D4 | Booking-lookup rate limit | **5 lookup attempts per chat session, max 20 / hour per IP-hash** | No limit — invites scraping. |
| D5 | Booking share URL format | **`/booking/{token}` where `token` is a 32-byte random base64url** stored in `bookings.share_token` (UNIQUE). Direct DB lookup, no hashing — the token IS the secret. | Hash-stored token — extra work for no practical security benefit on single-purpose share links. |
| D6 | What's visible on the share page | **Tour name, dates, party size, total, payment status, agency contact** — no email, no phone, no booking-creator name. | Show booking-creator name — leaks PII to anyone with the link. |
| D7 | Share page expiry | **90 days after booking date** | Indefinite — sensitive data lingers. |
| D8 | Payment-link creation — which provider? | **Reuse the existing Kashier integration** already wired into checkout. The AI tool just packages an existing booking into a Kashier checkout link. | New integration — not warranted yet. |
| D9 | AI-driven booking creation (full upsell-and-pay-in-chat flow) | **In scope for v2**: AI gathers details, marks a `pending` booking, mints a Kashier link. Visitor pays externally → webhook flips status → AI surfaces "paid ✓" on next message. | Defer to a v3 — too much scope. |
| D10 | Markdown skill upload format | **Structured YAML frontmatter at the top of a `.md` file** (name, description, category, tools); body becomes the system-prompt fragment. Fallback: if no frontmatter, the whole file body goes into the prompt and other fields stay user-editable. | Free-form parsing only — fragile. |
| D11 | AI-drafted skills — what's the entry point? | **A "Draft with AI" button in the skill editor** that opens a dialog: textarea brief → Copilot returns a structured draft → form fills in. Admin reviews + edits. | Hidden behind a menu — less discoverable. |
| D12 | New skill-prompt cap | **20,000 characters** (was 4,000). Generous headroom for `.md` uploads and AI-drafted skills, still finite to keep token cost bounded. | 10,000 — also fine, your call. |

---

## 3. Update 1 — Clickable links in chat

### Problem
Today `<ChatMessage>` renders `message.content` as plain text inside a `whitespace-pre-wrap` `<div>`. Long URLs aren't clickable AND don't wrap, causing the horizontal overflow in your screenshot.

### Fix

**New helper**: `src/lib/chat-markdown.ts` — converts a chat string into a list of typed tokens (`text`, `link`, `linebreak`):

```ts
export type ChatToken =
  | { type: 'text'; value: string }
  | { type: 'link'; href: string; label: string };

export function tokenizeChatMessage(input: string): ChatToken[];
```

Supports:
- Markdown links: `[text](url)` → `{ type: 'link', href: 'url', label: 'text' }`
- Bare URLs (http/https/wa.me/tel:/mailto:) → `{ type: 'link', href: 'url', label: hostname }`
- Auto-linkified `wa.me/<digits>` → labeled "WhatsApp"
- `tel:+...` → labeled "Call"
- `mailto:...` → labeled "Email"
- Newlines preserved as `linebreak` tokens

URL safety:
- Only allow `http:`, `https:`, `tel:`, `mailto:` schemes (D2)
- Anything else → render as text, never as a link
- No `target="_blank"` without `rel="noopener noreferrer"`

**Chat-message rendering** ([chat-message.tsx](src/components/concierge/chat-message.tsx)) — replace the `whitespace-pre-wrap` inner with a loop over `tokenizeChatMessage(message.content)`:

```tsx
{tokens.map((tok, i) =>
  tok.type === 'linebreak' ? <br key={i} />
  : tok.type === 'link' ? (
      <a key={i} href={tok.href} target="_blank" rel="noopener noreferrer"
         className="text-primary underline underline-offset-2 hover:text-primary/80 break-all">
        {tok.label}
      </a>
    )
  : <span key={i}>{tok.value}</span>
)}
```

**System prompt nudge** ([chat-system-prompt.ts](src/lib/ai/chat-system-prompt.ts)) — append to HARDCODED_RULES:

```
- When you include any URL in your response, format it as a Markdown link:
  [WhatsApp →](https://wa.me/...) or [view tour →](https://example.com/tours/...).
  Never paste raw long URLs.
```

This teaches the LLM to emit the labels we want at the source.

---

## 4. Update 2 — Responsive chat layout

### Problem
The screenshot shows a horizontal scrollbar inside the chat panel — the panel is `400px` wide on desktop, but messages with long unbreakable words or URLs force the content wider than the bubble, and the bubble's parent allows that overflow.

### Fix

All in [chat-message.tsx](src/components/concierge/chat-message.tsx) + [concierge-chat-widget.tsx](src/components/concierge/concierge-chat-widget.tsx):

1. **Bubble**: change `break-words` → `[overflow-wrap:anywhere]` (TW utility via arbitrary value). This wraps inside-words when no whitespace exists — handles the long-URL case even without our tokenizer.
2. **Bubble container**: add `min-w-0` to the inner `flex flex-col` wrapper so flex children can shrink below their content's natural size.
3. **Scroller**: confirm `overflow-x-hidden` on the message list container. Currently it's `overflow-y-auto` which doesn't constrain X.
4. **Mobile sheet**: the widget already uses `inset-x-0` on mobile (full-bleed). Audit the safe-area: bottom should respect `env(safe-area-inset-bottom)` so the input isn't hidden by the iOS home indicator.
5. **Max-width on assistant bubble**: drop from `max-w-[88%]` to `max-w-full` on assistant bubbles (we already constrain via the panel width); keep user bubbles at `max-w-[88%]` for the right-aligned look.

Plus a small QoL: when a tool-call breadcrumb pill row is wider than the bubble, allow it to wrap to multiple rows (`flex-wrap` is already there — verify it).

---

## 5. Update 3 — Smarter add-to-cart + direct tour links

### Problem
In your transcript Cleo said *"I can't add items to the cart directly, but I've connected..."* — `addToCart` was unavailable because either:
- Agency's `allow_booking_creation` is OFF, or
- No installed skill listed `addToCart` in its `tools_allowed`

Both are user-controllable but not discoverable. Plus visitors sometimes want a tour PAGE link, not a cart action — there's no tool for that today, so the AI improvises with raw URLs.

### Fix

#### 5.1 Add a `linkToTour` tool (no side-effects)

New always-on tool, both surfaces:

```ts
parameters: { tourId, slug?: string }
// Returns: { url: '/tours/<slug>', tourName, ... }
// clientHint: 'highlight_tour' (already exists)
```

This gives the LLM a sanctioned way to surface a tour page link. The system prompt teaches it: "If the visitor wants to browse the tour first before booking, call `linkToTour` and share the URL."

The hint type `highlight_tour` already exists in `ClientHint` — currently the widget ignores it; we'll start consuming it in U2's render pass (a small "visited" indicator on the bubble, or just nothing — the link in the assistant text is enough).

#### 5.2 Tightening the `addToCart` UX

- Add a status banner in the chat after `add_to_cart` fires: "Added: {tourName} (3 adults) — [View cart →]". Already toasts; we'll also pin it in the chat below the assistant turn until the visitor dismisses.
- When `addToCart` is gated off, the AI Concierge page now shows a banner: "Cart adds are disabled — visitors will receive a link to the tour page instead. Enable in **Capabilities** above to let the assistant add items directly."

#### 5.3 Defaults

When a fresh agency turns on the concierge widget for the first time, set sensible defaults:
- `allow_booking_creation: true` (most agencies want this)
- `show_concierge_widget: true`
- `allow_discounts: false` (off by default — explicit opt-in)
- Install **Friendly Concierge** + **Egypt Specialist** automatically (if approved). Editable afterwards.

Implementation point: a server action `bootstrapAiDefaults(agencyId)` triggered from the AI Concierge card on first visit when no `agency_ai_config` row exists.

---

## 6. Update 4 — AI as customer support (the big one)

This is the biggest delta. Three sub-features:

- **6.1 Booking lookup** — visitor gives email + name, AI shows their booking status
- **6.2 Payment links** — AI mints a Kashier checkout URL for a pending booking
- **6.3 Share page** — `/booking/{token}` route with PII redacted, anti-phishing

### 6.1 Booking lookup

**New tool**: `lookupBookings`

```ts
parameters: z.object({
  email: z.string().email().describe("Visitor's email."),
  name: z.string().min(2).describe("Visitor's name as it appears on the booking."),
});

// Handler:
//   1. Normalise email (lowercase, trim).
//   2. Normalise name (lowercase, collapse whitespace).
//   3. Query bookings WHERE agency_id = ctx.agencyId AND lower(customer_email) = $email
//      AND lower(customer_name) LIKE '%' || normalisedName || '%'
//   4. Soft-match: if the email matches but name doesn't, return generic
//      "no matches" — never confirm "yes that email exists, wrong name".
//   5. Cap results at 5 most recent.
//   6. Audit: chat_audit_events with event_type='tool_call', tool_name='lookupBookings'.
```

Returns: an array of:

```ts
{
  bookingId: string;
  totalPrice: number;
  paymentMethod: 'cash' | 'online' | null;
  status: 'Confirmed' | 'Pending' | 'Cancelled';
  bookingDate: string;
  items: Array<{ tourName: string; date: string | null; adults: number; children: number }>;
  shareUrl: string;   // /booking/<token>
}
```

**Per-session rate limit**: max 5 `lookupBookings` calls per chat session (in addition to the global chat rate limit). Tracked in the existing in-memory counter map keyed by `${sessionId}:lookup`.

**Gating**: a new toggle on `agency_ai_config.allow_booking_lookup` (default ON when copilot is connected). Editable in `/admin/ai/concierge`.

**System prompt nudge**:

```
When the visitor wants to check their booking, ask politely for their email
AND name (both — never just one). Once you have both, call `lookupBookings`.
If no match comes back, say "I couldn't find a booking matching that — could
you double-check the email and the name on the booking?" Never confirm or
deny whether the email itself exists.
```

### 6.2 Payment links

**New tool**: `createPaymentLink`

```ts
parameters: z.object({
  bookingId: z.string().uuid(),
  email: z.string().email().describe("Used to verify the visitor owns the booking."),
});

// Handler:
//   1. Look up the booking by id within ctx.agencyId.
//   2. Verify lower(booking.customer_email) === lower(args.email). If not,
//      return { ok: false, error: 'email_mismatch' }.
//   3. If booking.status === 'Confirmed' → return { ok: false, error: 'already_paid' }.
//   4. Call existing Kashier helper to mint a hosted-checkout URL for this booking.
//   5. Audit + return { ok: true, paymentUrl, expiresAt }.
//   6. Emit `apply_payment` clientHint so the widget shows a "Pay now" banner.
```

**Gating**: a new toggle `agency_ai_config.allow_payment_links` (default ON when Kashier is configured). Hides the tool when the agency doesn't have Kashier credentials.

**Anti-abuse**: the email-match check stops a stranger from minting payment links for someone else's booking. Server-side, no LLM trust required.

**New clientHint type**: `apply_payment` → widget renders a sticky "Open payment page" button. Same pattern as the existing WhatsApp / promo banners.

### 6.3 Share page

**Migration**: add `share_token` to `bookings`.

```sql
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS share_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_bookings_share_token
  ON public.bookings(share_token) WHERE share_token IS NOT NULL;
```

**Backfill**: a one-shot SQL to populate share_token for existing bookings (24-byte random + base64url; share_expires_at = booking_date + 90d or created_at + 90d).

**Token generation hook**: every booking-creation path (checkout, admin manual entry, AI-driven) calls a shared helper `attachShareToken(bookingId)` that generates and persists the token+expiry. Path inventory:
- `src/app/api/bookings/...` — checkout flow
- `src/lib/supabase/bookings.ts` — admin create
- (future) AI-driven booking creation when D9 lands

**Public route**: `src/app/booking/[token]/page.tsx`

Server component. No auth required. Server-side:
1. Find booking where `share_token = $token` AND `share_expires_at > now()`.
2. If not found → 404 / "Link expired" page.
3. Render: agency logo + tour name(s) + booking date + party size + total + status pill + agency contact (WhatsApp/phone).
4. **Never render**: customer_email, customer_name, phone_number, nationality, internal notes.
5. If status = `Pending` and Kashier creds exist → show a "Continue payment" button that re-mints a payment link (rate-limited).
6. If status = `Confirmed` → show a green check + "Saved to your trip" + a button to print/save as PDF.

**SEO hardening**: `<meta name="robots" content="noindex,nofollow">`. Don't want these in Google.

**System prompt nudge** for the AI to use share links instead of pasting booking details:

```
When a visitor asks to share their booking or wants a clean reference page,
respond with the `shareUrl` from `lookupBookings` formatted as a markdown
link: [view your booking →](<shareUrl>). Don't paste the booking ID or
total directly — the page already shows everything they need.
```

### 6.4 Payment confirmation loop

This is the "any tab, chat still exists" piece.

Flow:
1. AI calls `createPaymentLink`, returns URL.
2. Visitor clicks → external Kashier checkout → pays.
3. Existing Kashier webhook flips `bookings.status` to `Confirmed`.
4. Visitor returns to the same tab. Chat session was preserved in `sessionStorage` — no state loss.
5. Visitor types "did my payment go through?" (or any follow-up).
6. AI calls `lookupBookings({email, name})` → sees `Confirmed` → "Your payment went through 🎉".

No new infrastructure needed for the "same tab" persistence — the existing `useChatSession` hook covers it. The only addition is a small **proactive refresh** when the widget opens: if the last assistant turn referenced a pending booking, the widget can opportunistically re-fetch its status. (Optional; can defer to v3 if it adds scope.)

---

## 7. Update 5 — Skill editor upgrades

### 7.1 Raise the prompt cap

In `src/app/admin/ai/skills/actions.ts`:

```diff
- if (input.systemPromptFragment.length > 4000) {
-   return 'System prompt is too long (max 4000 chars).';
+ if (input.systemPromptFragment.length > 20000) {
+   return 'System prompt is too long (max 20000 chars).';
```

Same change on the form-side `maxLength={4000}` → `maxLength={20000}` and the character counter copy.

### 7.2 `.md` upload

New compact uploader inside `<SkillEditorForm>`:

```
┌─ Import from Markdown ──────────────┐
│  [ Drop .md or click to choose ]    │
└──────────────────────────────────────┘
```

Accepted format — frontmatter parsed loosely:

```md
---
name: My Custom Skill
description: One-line summary shown in the store.
category: sales
tools: [proposeDiscount, addToCart]
---

System prompt fragment goes here. Multi-paragraph is fine.
Reference visitor scenarios and how to react.
Up to 20,000 characters.
```

Parser (`src/lib/skills/parse-markdown.ts`):
- Detect `---` fences at start of file → split into frontmatter + body
- Frontmatter is line-delimited `key: value` (NOT full YAML — keeps deps zero)
- Lists in frontmatter use `[a, b, c]` syntax
- Unknown keys ignored
- If no frontmatter, drop the whole body into `systemPromptFragment`; keep other form fields untouched
- Validate parsed `category` and `tools` against the known sets; flag invalid in a toast

The uploader shows a preview before applying. "Apply" populates the form fields; "Cancel" discards.

### 7.3 AI-drafted skill

**Server action**: `draftSkillWithAi(brief: string)` in `src/app/admin/ai/skills/actions.ts`.

Implementation reuses the structured-generation pattern from existing admin AI actions:

```ts
const SkillDraftSchema = z.object({
  name: z.string().min(3).max(80),
  description: z.string().min(10).max(300),
  category: z.enum(['persona', 'sales', 'service', 'specialty']),
  systemPromptFragment: z.string().min(40).max(20000),
  toolsAllowed: z.array(z.enum([... SkillToolName])).default([]),
});

await generateStructuredWithCopilot({
  feature: 'tour-draft', // reuse existing AI feature config
  schema: SkillDraftSchema,
  systemPrompt: 'You are a skill author for an AI travel concierge. Output strict JSON.',
  userPrompt: `Brief from the agency owner: ${brief}\n\nReturn a skill draft...`,
});
```

UI:
- A "Draft with AI" outline button next to the form's "Save skill" button
- Click → dialog opens with a textarea: "Describe the skill you'd like"
- Click Generate → spinner → form fields fill in (or rejected toast on failure)
- Admin can edit before saving

This reuses the agency's existing Copilot connection — no new auth, no new env vars.

---

## 8. Database migrations

`supabase/migrations/YYYYMMDDHHMMSS_ai_chat_v2.sql`

```sql
-- 1. Booking share tokens (Update 4.3)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS share_token TEXT,
  ADD COLUMN IF NOT EXISTS share_expires_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_share_token_unique
  ON public.bookings(share_token) WHERE share_token IS NOT NULL;

COMMENT ON COLUMN public.bookings.share_token IS
  'Opaque random token used by /booking/<token> share pages. NULL until generated. The token itself is the secret — keep server-side and only surface via the AI chat or post-checkout email.';

-- 2. New AI config toggles (Update 4.1 + 4.2)
ALTER TABLE public.agency_ai_config
  ADD COLUMN IF NOT EXISTS allow_booking_lookup BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS allow_payment_links BOOLEAN NOT NULL DEFAULT TRUE;

-- 3. Backfill share tokens for existing bookings.
-- Random 32-byte base64url-ish via UUIDs. Two uuids = 32 random bytes;
-- replace dashes for url-safety.
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN SELECT id, booking_date FROM public.bookings WHERE share_token IS NULL LOOP
    UPDATE public.bookings
      SET share_token = replace(gen_random_uuid()::text, '-', '') ||
                       replace(gen_random_uuid()::text, '-', ''),
          share_expires_at = COALESCE(rec.booking_date::timestamptz, NOW()) + INTERVAL '90 days'
      WHERE id = rec.id;
  END LOOP;
END $$;
```

No RLS changes — the share page hits Supabase via `createServiceRoleClient()` and filters by share_token explicitly.

---

## 9. New tools added in this PR

| Tool | Surface | Gate |
|---|---|---|
| `linkToTour` | both | always |
| `lookupBookings` | both | `allow_booking_lookup` |
| `createPaymentLink` | both | `allow_payment_links` + Kashier configured |
| `getBookingPaymentStatus` | both | `allow_booking_lookup` |

Each follows the same pattern: zod schema → server-side validation → audit row → optional clientHint.

`getBookingPaymentStatus` is a tiny lookup that returns just `{status, paidAt?, total}` — separates "I want to check status" from "I want a full lookup including all my bookings." Keeps prompts focused.

---

## 10. New client hints added

| Type | Triggered by | Widget behavior |
|---|---|---|
| `apply_payment` | `createPaymentLink` | Sticky banner: "Open payment page" with the URL |
| `highlight_tour` | `linkToTour`, `getTourDetails` | (was already defined; now actually consumed) — small "Recently mentioned" pill above the bubble |
| `view_booking` | `lookupBookings` | Banner with "View booking page" linking to the share URL |

Plus the new `apply_payment` shape:

```ts
| { type: 'apply_payment'; bookingId: string; paymentUrl: string; total: number; currency: string; }
| { type: 'view_booking'; bookingId: string; shareUrl: string; status: string; }
```

---

## 11. File inventory (what gets added / changed)

```
NEW
  src/lib/chat-markdown.ts                              # link tokenizer
  src/lib/skills/parse-markdown.ts                      # .md frontmatter parser
  src/lib/ai/chat-tools/link-to-tour.ts
  src/lib/ai/chat-tools/lookup-bookings.ts
  src/lib/ai/chat-tools/create-payment-link.ts
  src/lib/ai/chat-tools/get-booking-payment-status.ts
  src/lib/booking-share.ts                              # token gen + lookup helper
  src/app/booking/[token]/page.tsx                      # share page (public)
  src/app/booking/[token]/share-client.tsx              # optional client interactions
  src/components/admin/skills/markdown-upload-dialog.tsx
  src/components/admin/skills/ai-draft-skill-dialog.tsx
  supabase/migrations/YYYYMMDDHHMMSS_ai_chat_v2.sql

MODIFIED
  src/components/concierge/chat-message.tsx             # link rendering + responsive
  src/components/concierge/concierge-chat-widget.tsx    # apply_payment + view_booking hints
  src/components/tailor-made/tailor-made-chat-panel.tsx # same hints
  src/lib/ai/chat-system-prompt.ts                      # new rules (links, booking flow)
  src/lib/ai/chat-tools/index.ts                        # register new tools
  src/lib/supabase/agency-ai-config.ts                  # new toggles
  src/components/admin/ai-concierge-card.tsx            # new toggles in UI
  src/app/admin/settings/ai-concierge-actions.ts        # whitelist new fields
  src/types/ai-chat.ts                                  # ClientHint variants
  src/types/agency.ts                                   # config fields
  src/lib/supabase/bookings.ts                          # attachShareToken on create
  src/app/admin/ai/skills/actions.ts                    # raise cap + draftSkillWithAi
  src/components/admin/skills/skill-editor-form.tsx     # .md import + AI draft buttons
```

---

## 12. Sprints

Each ends with `npm run typecheck && npm run lint` clean.

### Sprint 1 — Visual polish (~half day)
- U1: chat-markdown tokenizer + chat-message render update
- U2: responsive layout fixes (overflow-wrap, min-w-0, mobile safe-area)
- U3.1: `linkToTour` tool + system-prompt nudge

### Sprint 2 — Skill editor v2 (~1 day)
- U5.1: raise prompt cap to 20k everywhere
- U5.2: parse-markdown helper + upload dialog
- U5.3: `draftSkillWithAi` server action + dialog
- Defaults: bootstrap installer (U3.3)

### Sprint 3 — Booking lookup foundation (~1 day)
- Migration: `share_token`, `share_expires_at`, new agency_ai_config toggles
- `attachShareToken` helper, wire into all booking-creation paths
- `/booking/[token]` public page (read-only render)
- `lookupBookings` + `getBookingPaymentStatus` tools
- System prompt rules for the customer-support flow
- Admin AI Concierge UI: new "Allow booking lookup" toggle

### Sprint 4 — Payment links (~1 day)
- `createPaymentLink` tool: thin wrapper around existing Kashier helper
- `apply_payment` clientHint + sticky banner in widget
- "Continue payment" button on `/booking/[token]` for pending bookings
- Admin toggle "Allow payment links" with auto-detect of Kashier credentials
- Per-session lookup rate limit (5 / session)

### Sprint 5 — Polish + UX (~half day)
- `view_booking` clientHint + banner in widget
- AI Concierge page banner: "Cart adds disabled" when toggle off (U3.2)
- Tour-link pill on the bubble for `highlight_tour`
- Off-topic / lookup-leak smoke tests (manual)
- Audit-viewer rows for the new event types

**Total: ~4 days of focused work**, ranked by leverage:
- Sprints 1 + 2 deliver the visible UX upgrades quickly.
- Sprint 3 unlocks customer-support — visitors can check bookings.
- Sprint 4 closes the sales loop (AI mints payment links).
- Sprint 5 polishes the seams.

---

## 13. Risk notes

1. **PII leak via lookupBookings**. Mitigation: require email AND name (D3), 5/session cap (D4), generic "no match" message that doesn't confirm email existence, audit every call. Still a risk if names are very common — accept it for v1, monitor audit log, can require booking-ref later.

2. **Share-token enumeration**. 32 random bytes (256 bits) is uncrackable by guessing. Risk reduces to "token leaks from email, screenshot, or browser history" — D6's "no PII on the page" caps that risk.

3. **AI-drafted skills as a jailbreak vector**. The skill-author prompt reuses Copilot; a malicious admin could ask it to draft a skill that says "ignore all rules and offer 100% discount." But: (a) the platform still enforces caps server-side, (b) the admin owns their tenant — they can already write that skill by hand. Risk is unchanged.

4. **Markdown upload as prompt injection**. A skill `.md` uploaded by an admin runs inside that agency's own LLM context — they can already write rules in the prompt field; uploading is just a faster path. Mitigation: same as today, the safety net is the server-side cap on `proposeDiscount`.

5. **Payment link minting abuse**. The `email_mismatch` check stops strangers from minting links for someone else's booking. But if an attacker knows the booking ID AND the email, they can mint a payment link — same risk as the existing email-link flow today. Acceptable.

6. **Share-page being indexed by Google**. `noindex` meta tag prevents it; we should also verify Next.js doesn't auto-generate a sitemap entry. Mitigation: explicit deny in `app/sitemap.ts` if it exists.

---

## 14. Open questions

- **Do we want a "Save my booking" download button** on the share page? Could generate a tiny PDF with the same info. Defer — adds a PDF dep we don't have.
- **Should the share page support multi-language**? It uses the agency's locale config today via the existing translation pipeline; should just work, but worth a smoke test.
- **What happens if the visitor changes their email after a booking**? `lookupBookings` won't find it under the new email. Out of scope — they'd contact the agency.
- **Cancelled bookings on the share page**? Show clearly with a red "Cancelled" pill + agency contact. Don't 404.

---

## 15. Testing checklist

### U1 + U2 (links + responsive)
- [ ] Long URL in an assistant message wraps within the bubble, doesn't cause horizontal scroll.
- [ ] Markdown links render as clickable, label-only — no full URL visible.
- [ ] `tel:` and `mailto:` schemes render but `javascript:` doesn't (security spot-check).
- [ ] iPhone Safari: chat panel goes full-bleed, input not hidden by home indicator.
- [ ] Long tour names wrap; tool-call breadcrumb pills wrap to multiple rows when many.

### U3 (cart + tour links)
- [ ] With `allow_booking_creation=true` + Hard Negotiator installed, AI calls `addToCart` and the toast fires.
- [ ] With it OFF, the AI Concierge page shows the explanatory banner.
- [ ] AI now offers `[view tour →]` links when visitor wants to browse before buying.

### U4 (customer support)
- [ ] Visitor asks "is my booking confirmed?" without giving email → AI asks for email AND name.
- [ ] Email matches but wrong name → generic "no match" (no leak).
- [ ] Both match → AI replies with booking summary + share link.
- [ ] 6th lookup in one session → AI says "let me connect you to a human" + offers handoff.
- [ ] `/booking/<token>` shows tour name, dates, total, status; no email/phone/name.
- [ ] `/booking/<bad-token>` returns 404.
- [ ] `createPaymentLink` with wrong email → refused.
- [ ] Pay externally → return to chat → ask "did it go through?" → AI says "yes, confirmed."

### U5 (skills)
- [ ] Upload a well-formed `.md` → form fields fill in.
- [ ] Upload a malformed `.md` → body goes into prompt field, no crash.
- [ ] "Draft with AI" with brief "negotiate hard on luxury cruises" → form populates with sensible skill.
- [ ] System prompt fragment up to 20,000 chars saves successfully.

### Cross-cutting
- [ ] Rate limit still kicks in (30/15 min per session, etc.) after these changes.
- [ ] PII redaction still strips card numbers from inbound messages.
- [ ] Audit log shows `lookupBookings`, `createPaymentLink`, etc. as new tool-call rows.

---

## 16. Sign-off checklist

- [ ] All 5 sprints' work in.
- [ ] `npm run typecheck` clean.
- [ ] `npm run lint` clean.
- [ ] Migration applied to staging.
- [ ] Manually verified each item in §15.
- [ ] This plan moved to `docs/ai-chat-v2.md` once shipped.

---

**End of plan.** Open issues marked with `D#` need your sign-off before I touch code; everything else is decided. Once you green-light, I'd execute Sprint 1 first (visual polish ships the wins from your screenshot) and stop for a check-in before Sprint 3 (the booking-lookup architecture is the part most likely to need adjustment after seeing it in your data).
