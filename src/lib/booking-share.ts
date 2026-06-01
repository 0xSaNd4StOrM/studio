import { randomBytes } from 'node:crypto';
import { createServiceRoleClient } from '@/lib/supabase/server';

const TOKEN_BYTES = 24;
const SHARE_TTL_DAYS = 90;

/**
 * Generate a fresh opaque share token. 24 bytes → 48 hex chars; that's
 * 192 bits of entropy, well beyond brute-force range.
 */
export function generateShareToken(): string {
  return randomBytes(TOKEN_BYTES).toString('hex');
}

/**
 * Compute the share-link expiry for a freshly-created booking. We anchor
 * to the booking date so a 90-day-out trip keeps a working link until the
 * trip is over and a bit past — useful for post-trip "what did I pay?"
 * lookups.
 */
export function computeShareExpiry(bookingDate?: Date | string | null): string {
  const anchor = bookingDate ? new Date(bookingDate) : new Date();
  const safeAnchor = Number.isFinite(anchor.getTime()) ? anchor : new Date();
  const expiry = new Date(safeAnchor.getTime() + SHARE_TTL_DAYS * 24 * 60 * 60 * 1000);
  return expiry.toISOString();
}

export type ShareFields = {
  share_token: string;
  share_expires_at: string;
};

/**
 * Attach share-token columns to a booking insert payload. Call this for
 * every booking-creation code path so every row gets a token at write
 * time — no later mint pass needed.
 */
export function attachShareToken(bookingDate?: Date | string | null): ShareFields {
  return {
    share_token: generateShareToken(),
    share_expires_at: computeShareExpiry(bookingDate),
  };
}

// ─── Public share page data ─────────────────────────────────────────────────

export type SharedBookingItem = {
  tourName: string | null;
  tourSlug: string | null;
  upsellName: string | null;
  packageName: string | null;
  itemDate: string | null;
  adults: number | null;
  children: number | null;
  price: number;
};

export type SharedBooking = {
  bookingId: string;
  status: 'Confirmed' | 'Pending' | 'Cancelled';
  totalPrice: number;
  discountAmount: number;
  paymentMethod: 'cash' | 'online' | null;
  paymentStatus: 'unpaid' | 'deposit_paid' | 'paid_in_full' | null;
  amountPaid: number | null;
  balanceDue: number | null;
  bookingDate: string;
  shareExpiresAt: string | null;
  items: SharedBookingItem[];
  agency: {
    name: string;
    contactEmail: string | null;
    phone: string | null;
    logoUrl: string | null;
  };
};

type RawBookingRow = {
  id: string;
  agency_id: string;
  status: 'Confirmed' | 'Pending' | 'Cancelled';
  total_price: number;
  discount_amount: number | null;
  payment_method: 'cash' | 'online' | null;
  payment_status: 'unpaid' | 'deposit_paid' | 'paid_in_full' | null;
  amount_paid: number | null;
  balance_due: number | null;
  booking_date: string;
  share_expires_at: string | null;
  booking_items?: Array<{
    item_date: string | null;
    adults: number | null;
    children: number | null;
    package_name: string | null;
    price: number;
    tours: { name: string; slug: string } | null;
    upsell_items: { name: string; price: number } | null;
  }> | null;
};

/**
 * Resolve a public share token to a redacted booking payload. Returns
 * null when the token is unknown OR expired. Never throws.
 *
 * Critically: this fetches via the service-role client and explicitly
 * strips PII (email, phone, name) before returning. The caller MUST
 * render only what this helper returns.
 */
export async function getSharedBookingByToken(
  token: string
): Promise<SharedBooking | null> {
  if (!token || typeof token !== 'string') return null;
  // 48 hex chars; reject anything that doesn't look like a token to keep
  // ill-formed URLs from costing a DB round-trip.
  if (!/^[a-f0-9]{32,64}$/i.test(token)) return null;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('bookings')
    .select(
      'id, agency_id, status, total_price, discount_amount, payment_method, payment_status, amount_paid, balance_due, booking_date, share_expires_at, booking_items(item_date, adults, children, package_name, price, tours(name, slug), upsell_items(name, price))'
    )
    .eq('share_token', token)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as unknown as RawBookingRow;

  if (row.share_expires_at) {
    const expires = new Date(row.share_expires_at).getTime();
    if (Number.isFinite(expires) && expires <= Date.now()) {
      return null; // expired
    }
  }

  // Fetch agency contact info separately — strictly limited columns.
  const { data: agencyRow } = await supabase
    .from('agencies')
    .select('name, settings, logo_url')
    .eq('id', row.agency_id)
    .maybeSingle();

  const settings =
    (agencyRow?.settings && typeof agencyRow.settings === 'object'
      ? (agencyRow.settings as Record<string, unknown>)
      : {}) as Record<string, unknown>;
  // settings might be wrapped in { data: {...} } or be the data directly.
  const settingsData =
    (settings.data && typeof settings.data === 'object'
      ? (settings.data as Record<string, unknown>)
      : settings) as Record<string, unknown>;

  const phone =
    (typeof settingsData.phoneNumber === 'string' && settingsData.phoneNumber) ||
    ((settingsData.contact as Record<string, unknown> | undefined)?.phone as
      | string
      | undefined) ||
    null;
  const contactEmail =
    (typeof settingsData.contactEmail === 'string' && settingsData.contactEmail) ||
    ((settingsData.contact as Record<string, unknown> | undefined)?.email as
      | string
      | undefined) ||
    null;

  return {
    bookingId: row.id,
    status: row.status,
    totalPrice: row.total_price,
    discountAmount: row.discount_amount ?? 0,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status ?? null,
    amountPaid: row.amount_paid ?? null,
    balanceDue: row.balance_due ?? null,
    bookingDate: row.booking_date,
    shareExpiresAt: row.share_expires_at,
    items: (row.booking_items ?? []).map((item) => ({
      tourName: item.tours?.name ?? null,
      tourSlug: item.tours?.slug ?? null,
      upsellName: item.upsell_items?.name ?? null,
      packageName: item.package_name,
      itemDate: item.item_date,
      adults: item.adults,
      children: item.children,
      price: item.price,
    })),
    agency: {
      name: (agencyRow?.name as string | undefined) ?? 'Travel agency',
      contactEmail: contactEmail ?? null,
      phone: phone ?? null,
      logoUrl: (agencyRow?.logo_url as string | undefined) ?? null,
    },
  };
}
