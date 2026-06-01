
# Deposits (Partial Payment) — Design Spec

**Date:** 2026-06-01
**Status:** Implemented 2026-06-01
**Scope:** Let guests pay a deposit (a percentage of the order) online now and settle the balance on arrival.

---

## 1. Goal & Context

Hotels and tour operators in this market commonly take a deposit online and collect the balance in person. Today the app charges the **full** cart total via Kashier and has no concept of partial payment: booking `status` is only `'Confirmed' | 'Pending' | 'Cancelled'` and there are no money-tracking columns.

This feature adds an **order-level deposit**: a single agency-wide percentage of the cart total, charged online via Kashier, with the remaining balance recorded and collected on arrival.

### Established facts this design builds on
- **All prices are stored in USD at rest.** Tours are entered in USD (admin form labeled with `$`, example tiers 80–200) and rooms are hardcoded USD (`room-pricing.ts:181`). Agency currency (EGP, etc.) is a **display-time conversion only** (`use-currency.tsx` treats every stored number as USD and multiplies by a live rate). There is **no mixed-currency bug**.
- **Kashier settles in EGP.** `buildKashierHppUrl` takes one `amount` (EGP). The webhook at `/api/kashier/webhook/route.ts` verifies the signature and calls `applyVerifiedPaymentStatusChange(merchantOrderId, nextStatus)` to flip Pending→Confirmed.
- **A server-side FX helper already exists** in `src/app/api/booking/[token]/pay/route.ts` (`fetchUsdToEgp()`, CDN + `47.5` fallback, 1h cache). We will extract and reuse it.
- **Idempotent online checkout already exists:** checkout mints a provisional `bookingId` before the Kashier redirect and `createBooking` upserts on it (`bookings.ts:780`).

---

## 2. Requirements (locked)

| Decision | Choice |
|---|---|
| Deposit scope | **Order-level** (% of whole cart total) |
| Amount model | **Percentage of total**, single agency-wide value |
| Guest experience | Guest **chooses** at checkout: "Pay deposit now" or "Pay full amount" |
| Payment methods | **Online (card) only.** Cash bookings unchanged (no deposit concept) |
| Balance collection | **On arrival**, plus an **admin "Mark balance paid"** action |
| FX for the real charge | **Computed server-side**; store USD amount, EGP charged, and rate used |
| FX rate source | **Same CDN + fallback** as the existing pay-link route |
| Refunds (v1) | **Policy text only** — no automated money movement |

---

## 3. Architecture: two independent axes

The core design decision is to **keep booking lifecycle and payment state as separate axes**, rather than overloading the existing `status` enum.

- **`status`** (unchanged): `'Confirmed' | 'Pending' | 'Cancelled'` — *is the booking live?*
- **`payment_status`** (new): `'unpaid' | 'deposit_paid' | 'paid_in_full'` — *how much is paid?*

This keeps every existing `status === 'Confirmed'` check in the codebase correct and unchanged, while adding money tracking alongside it. A deposit booking is `status='Confirmed'` (the room *is* booked) AND `payment_status='deposit_paid'` (only part is paid).

All monetary amounts at rest remain **USD**. Only `charged_*` and `fx_rate_used` record the actual EGP transaction, for audit.

---

## 4. Data model

### 4.1 Migration — new columns on `bookings`

```sql
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS amount_paid numeric NOT NULL DEFAULT 0,      -- USD settled so far
  ADD COLUMN IF NOT EXISTS balance_due numeric NOT NULL DEFAULT 0,      -- USD still owed
  ADD COLUMN IF NOT EXISTS deposit_percent integer,                     -- audit: % applied
  ADD COLUMN IF NOT EXISTS charged_currency text,                       -- 'EGP'
  ADD COLUMN IF NOT EXISTS charged_amount numeric,                      -- actual EGP charged
  ADD COLUMN IF NOT EXISTS fx_rate_used numeric,                        -- USD->EGP at charge time
  ADD COLUMN IF NOT EXISTS balance_paid_at timestamptz;                 -- set when balance collected

ALTER TABLE bookings
  ADD CONSTRAINT bookings_payment_status_chk
  CHECK (payment_status IN ('unpaid','deposit_paid','paid_in_full'));
```

Notes:
- Defaults make the migration backward-compatible: existing rows become `payment_status='unpaid'`, `amount_paid=0`, `balance_due=0`. Historical rows are not back-filled; this is acceptable because the feature is forward-looking and existing bookings predate deposits.
- RLS posture unchanged: writes go through the service-role/admin clients as today.

### 4.2 TypeScript type changes

In `src/types/index.ts`, extend the `Booking` type with the new optional fields and a `PaymentStatus` union:

```ts
export type PaymentStatus = 'unpaid' | 'deposit_paid' | 'paid_in_full';
// Booking gains: paymentStatus, amountPaid, balanceDue, depositPercent?,
// chargedCurrency?, chargedAmount?, fxRateUsed?, balancePaidAt?
```

### 4.3 Agency config (no migration — settings `data` jsonb)

Add to `AgencySettingsData` (`src/lib/supabase/agency-content.ts`):
- `depositEnabled?: boolean` (default false)
- `depositPercent?: number` (1–100, clamped server-side)
- `depositPolicyText?: string` (free text, e.g. "Deposit is non-refundable.")

Admin UI to edit these lives in the existing agency settings screen.

---

## 5. Shared FX helper

Extract the existing `fetchUsdToEgp()` from `src/app/api/booking/[token]/pay/route.ts` into a new `src/lib/fx.ts`:

```ts
export const FALLBACK_USD_TO_EGP = 47.5;
export async function fetchUsdToEgp(): Promise<number>; // CDN + fallback, 1h revalidate
```

Update the pay-link route to import from here (no behavior change). The checkout server action and any balance flows use the same helper, so every server-side charge uses one rate source.

---

## 6. Checkout flow

### 6.1 Guest UI (`src/app/(main)/checkout/page.tsx`)

When `depositEnabled === true` **and** the selected payment method is `online`, the payment step renders a choice (radio group):

- **Pay deposit now** — "Pay {pct}% = {display $deposit} now · {display $balance} due on arrival" followed by `depositPolicyText` if set.
- **Pay full amount** — current behavior.

Default selection: **deposit** (the conversion-lifting option), but the guest can switch.

Amounts shown here use the existing client `convertTo` for **display only**. The amount actually charged is the **server-computed** figure (§6.2). If `depositEnabled` is false, this UI does not render and checkout behaves exactly as today.

A new form field `paymentChoice: 'deposit' | 'full'` is added (only meaningful for online).

### 6.2 Server action `createBooking` (`src/lib/supabase/bookings.ts`)

Add `paymentChoice?: 'deposit' | 'full'` to `CreateBookingData` (defaults to `'full'`, so all existing callers are unaffected).

Logic after `finalTotal` (USD) is computed as today:

1. Resolve deposit settings **server-side** from agency settings — never trust the client's percent. If `paymentChoice === 'deposit'` and `depositEnabled`:
   - `pct = clamp(depositPercent, 1, 100)`
   - `depositUSD = round2(finalTotal * pct / 100)`
   - `balanceUSD = round2(finalTotal - depositUSD)`
   - set `deposit_percent = pct`, `balance_due = balanceUSD`
   - `amount_paid = 0` for now (set by webhook on confirmation)
2. Else (full): `depositUSD = finalTotal`, `balanceUSD = 0`, `deposit_percent = null`.
3. Compute the EGP charge server-side:
   - `rate = await fetchUsdToEgp()`
   - `chargeEGP = round2((paymentChoice==='deposit' ? depositUSD : finalTotal) * rate)`
   - store `fx_rate_used = rate`, `charged_currency = 'EGP'`, `charged_amount = chargeEGP`
4. `payment_status = 'unpaid'` at insert (online bookings are Pending until the webhook).
5. **Return the EGP charge amount** (and booking id) so the checkout client builds the Kashier URL with this server figure instead of computing its own `convertTo(...,'EGP')`.

The checkout client change at `page.tsx:622`: stop calling `convertTo(getFinalTotal(),'EGP')` for the charge; use the EGP amount returned by `createBooking`. Both deposit and full paths use the server figure, so every online charge is auditable with the same columns.

Cash path: untouched — `status='Confirmed'`, `payment_status` left `'unpaid'` (cash is collected in person; no deposit concept), `balance_due` not set. *(See open question Q1.)*

---

## 7. Webhook reconciliation (`/api/kashier/webhook` + `applyVerifiedPaymentStatusChange`)

Today: positive Kashier status → `status='Confirmed'`; negative → `Cancelled`.

Change `applyVerifiedPaymentStatusChange(merchantOrderId, nextStatus)` so that on a **positive** status it ALSO reconciles payment, reading the booking's own stored figures:

- If `deposit_percent` is set (deposit booking): `payment_status='deposit_paid'`, `amount_paid = total_price - balance_due` (i.e. the deposit), `balance_due` unchanged.
- Else (full): `payment_status='paid_in_full'`, `amount_paid = total_price`, `balance_due = 0`.
- `status='Confirmed'` exactly as today.

Negative status → `status='Cancelled'`, payment fields untouched (nothing was captured).

Must remain **idempotent** (Kashier retries webhooks): re-applying the same positive status yields the same row state. Payment fields are computed from stored absolute values (not increments), which is naturally idempotent.

---

## 8. Balance collection (admin)

### 8.1 "Mark balance paid" action
A server action (admin-membership gated, mirroring existing admin actions) that, given a booking id, sets `payment_status='paid_in_full'`, `amount_paid = total_price`, `balance_due = 0`, `balance_paid_at = now()`.

### 8.2 Surfaces
- **Front Desk board** (`/admin/hotels/ops`): show `balance_due` for arrivals and a "Mark balance paid" button per booking with an outstanding balance.
- **Booking detail page** (`/admin/bookings/[id]`): payment summary (paid / balance) + the button.
- **Bookings list** (`/admin/bookings`): a payment-status badge (Deposit paid / Paid / —).

---

## 9. Guest-facing surfaces

- **Confirmation email** and **PDF voucher**: show "Paid: $Y (deposit) · Balance due on arrival: $Z" and the `depositPolicyText`. Full-payment bookings show "Paid in full."
- **Share page** `/booking/[token]`: same payment summary.

---

## 10. Refunds (v1)

Policy text only. On cancellation there is no automated refund or money movement; the `depositPolicyText` communicates the terms. Tracking forfeited/refunded deposits is a clean future addition (would add e.g. `payment_status='refunded'` + a reason), explicitly **out of scope** here.

---

## 11. Edge cases

| Case | Handling |
|---|---|
| Client tampers with deposit % | Ignored — server re-reads `depositPercent` from agency settings |
| FX CDN fetch fails | Fallback rate (47.5); the rate actually used is still recorded in `fx_rate_used` |
| Webhook retries / double fire | Idempotent: payment fields computed from stored absolutes, not increments |
| Webhook arrives before row exists | Existing provisional-id upsert path ensures the row exists pre-redirect |
| `depositEnabled` off | No deposit UI; `paymentChoice` defaults to `'full'`; zero behavior change |
| Deposit + cash | Not offered; cash checkout skips deposit UI entirely |
| Promo code + deposit | Deposit % applies to the **post-discount** `finalTotal` |
| Partial payment then guest pays nothing more | `balance_due` remains; visible on Front Desk until admin marks paid |

---

## 12. Out of scope (explicit)

- Per-room / per-tour deposit policies (this is order-level only).
- Fixed-amount or minimum-floor deposits (percentage only).
- Online "pay balance later" link (balance is collected on arrival / marked by admin).
- Automated refunds or refund accounting.
- A separate `booking_payments` ledger (single deposit + balance is enough for v1; a ledger is the natural upgrade if installment plans are needed later).
- Treating EGP as settlement currency end-to-end (prices stay USD-at-rest).

---

## 13. Affected files (anticipated)

**New**
- `supabase/migrations/<ts>_add_booking_deposits.sql`
- `src/lib/fx.ts`

**Modified**
- `src/types/index.ts` (Booking + PaymentStatus)
- `src/lib/supabase/agency-content.ts` (AgencySettingsData + getters)
- `src/lib/supabase/bookings.ts` (`createBooking`, `applyVerifiedPaymentStatusChange`, new `markBalancePaid`)
- `src/app/(main)/checkout/page.tsx` (deposit choice UI; use server EGP amount)
- `src/app/api/booking/[token]/pay/route.ts` (import shared `fetchUsdToEgp`)
- Admin: agency settings screen (deposit config), `/admin/hotels/ops`, `/admin/bookings` list + `[id]` detail
- Email template + voucher; `/booking/[token]` share page

---

## 14. Open questions for spec review

- **Q1 — Cash bookings & `balance_due`:** v1 leaves cash bookings with `payment_status='unpaid'` and no `balance_due` (the whole amount is paid in person anyway). Acceptable, or should cash bookings also show an "amount to collect on arrival = total" on the Front Desk board for consistency? (Low effort either way.)
- **Q2 — Default guest selection:** design defaults the radio to **deposit**. Confirm that's desired (vs defaulting to full).
