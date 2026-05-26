import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getAgencyAiConfig } from '@/lib/supabase/agency-ai-config';
import { bumpLookupAttempt } from '@/lib/ai/chat-rate-limit';
import type { ChatTool } from './types';
import { zodToJsonSchema } from './zod-to-schema';

const parameters = z.object({
  email: z
    .string()
    .email()
    .describe("The visitor's email exactly as it appears on the booking."),
  name: z
    .string()
    .min(2)
    .max(80)
    .describe("The visitor's name on the booking (first name or full)."),
});

type LookupBookingsArgs = z.infer<typeof parameters>;

type BookingRow = {
  id: string;
  customer_email: string;
  customer_name: string;
  total_price: number;
  status: 'Confirmed' | 'Pending' | 'Cancelled';
  booking_date: string;
  payment_method: 'cash' | 'online' | null;
  share_token: string | null;
  booking_items?: Array<{
    id: string;
    item_date: string | null;
    adults: number | null;
    children: number | null;
    package_name: string | null;
    tours: { name: string; slug: string } | null;
    upsell_items: { name: string; price: number } | null;
  }> | null;
};

function normaliseName(raw: string): string {
  return raw.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Fuzzy-ish name compare: passes if any whitespace-separated token in
 * the visitor's input is a substring of the stored booking name (after
 * normalising both sides), or vice versa. Catches "Ahmed" vs "Ahmed
 * Mohamed", "ahmed mohamed" vs "Ahmed M.", etc.
 */
function nameMatches(visitorName: string, storedName: string): boolean {
  const visitor = normaliseName(visitorName);
  const stored = normaliseName(storedName);
  if (!visitor || !stored) return false;
  if (visitor === stored) return true;
  if (stored.includes(visitor) || visitor.includes(stored)) return true;
  const visitorTokens = visitor.split(' ').filter((t) => t.length >= 2);
  return visitorTokens.some((token) => stored.includes(token));
}

export const lookupBookingsTool: ChatTool = {
  name: 'lookupBookings',
  description:
    "Look up the visitor's bookings by email AND name (both required). Returns up to 5 recent bookings with status + items. If no match comes back, tell the visitor: 'I couldn't find a booking matching that — could you double-check the email and the name on the booking?' Never confirm or deny whether the email itself exists.",
  parameters,
  jsonSchema: zodToJsonSchema(parameters),
  async handler(rawArgs, ctx) {
    const args: LookupBookingsArgs = parameters.parse(rawArgs);

    const config = await getAgencyAiConfig(ctx.agencyId);
    if (!config.allowBookingLookup) {
      return {
        result: {
          ok: false,
          reason: 'agency_disallows_lookup',
          hint: 'This agency does not authorise AI-led booking lookups. Politely offer to connect a human teammate.',
        },
      };
    }

    const limit = bumpLookupAttempt(ctx.sessionId);
    if (!limit.ok) {
      return {
        result: {
          ok: false,
          reason: 'too_many_attempts',
          hint: 'The visitor has tried too many lookups this session. Offer to connect a human via handoffToHuman.',
        },
      };
    }

    const email = args.email.trim().toLowerCase();

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('bookings')
      .select(
        '*, booking_items(*, tours(name, slug), upsell_items(name, price))'
      )
      .eq('agency_id', ctx.agencyId)
      .ilike('customer_email', email)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      return { result: { ok: false, reason: 'database_error', message: error.message } };
    }

    const rows = (data ?? []) as BookingRow[];

    // Generic "no match" when:
    //   - no email rows at all, OR
    //   - email rows exist but none match the name
    // Both cases return the SAME response so callers can't distinguish
    // "email is registered" from "email + name is registered".
    const matching = rows.filter((row) => nameMatches(args.name, row.customer_name));

    if (matching.length === 0) {
      return {
        result: {
          ok: true,
          count: 0,
          bookings: [],
          attemptsRemaining: limit.remaining,
        },
      };
    }

    // Cap to 5 most recent to keep prompts small.
    const top = matching.slice(0, 5);

    // When exactly one booking matches we can give the widget a sticky
    // "View booking" CTA. With multiple matches the visitor needs to
    // pick — the AI lists them in chat and we let it decide.
    const singleMatch = top.length === 1 ? top[0] : null;
    const clientHint =
      singleMatch && singleMatch.share_token
        ? {
            type: 'view_booking' as const,
            bookingId: singleMatch.id,
            shareUrl: `/booking/${singleMatch.share_token}`,
            status: singleMatch.status,
            total: singleMatch.total_price,
            currency: 'USD',
          }
        : undefined;

    return {
      result: {
        ok: true,
        count: top.length,
        attemptsRemaining: limit.remaining,
        bookings: top.map((row) => ({
          bookingId: row.id,
          totalPrice: row.total_price,
          currency: 'USD',
          status: row.status,
          paymentMethod: row.payment_method,
          bookingDate: row.booking_date,
          shareUrl: row.share_token ? `/booking/${row.share_token}` : null,
          items: (row.booking_items ?? []).map((item) => ({
            itemDate: item.item_date,
            adults: item.adults,
            children: item.children,
            packageName: item.package_name,
            tourName: item.tours?.name ?? null,
            tourSlug: item.tours?.slug ?? null,
            upsellName: item.upsell_items?.name ?? null,
          })),
        })),
      },
      ...(clientHint ? { clientHint } : {}),
    };
  },
};
