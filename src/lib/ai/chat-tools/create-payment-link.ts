import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getAgencyAiConfig } from '@/lib/supabase/agency-ai-config';
import { buildKashierHppUrl } from '@/lib/kashier';
import type { ChatTool } from './types';
import { zodToJsonSchema } from './zod-to-schema';

const parameters = z.object({
  bookingId: z.string().uuid().describe('UUID of the pending booking to mint a link for.'),
  email: z
    .string()
    .email()
    .describe('Email used on the booking — required to verify ownership.'),
});

type CreatePaymentLinkArgs = z.infer<typeof parameters>;

// Hardcoded fallback rate matches `use-currency.tsx` so the AI tool and the
// checkout client agree to within rounding when the rate API is down.
const FALLBACK_USD_TO_EGP = 47.5;
const RATE_API_URL =
  'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json';

async function fetchUsdToEgp(): Promise<number> {
  try {
    const res = await fetch(RATE_API_URL, {
      next: { revalidate: 3600 }, // 1-hour cache
    });
    if (!res.ok) return FALLBACK_USD_TO_EGP;
    const data = (await res.json()) as { usd?: Record<string, number> };
    const rate = data.usd?.egp;
    return typeof rate === 'number' && rate > 0 ? rate : FALLBACK_USD_TO_EGP;
  } catch {
    return FALLBACK_USD_TO_EGP;
  }
}

export const createPaymentLinkTool: ChatTool = {
  name: 'createPaymentLink',
  description:
    "Mint a Kashier checkout URL for a pending booking. Verifies ownership with the visitor's email — refuses on mismatch. Always confirm the booking is pending (call `getBookingPaymentStatus` first if unsure). The link is single-use and expires when the Kashier session ends. Return the URL as a markdown link, e.g. `[Open payment page →](<url>)`.",
  parameters,
  jsonSchema: zodToJsonSchema(parameters),
  async handler(rawArgs, ctx) {
    const args: CreatePaymentLinkArgs = parameters.parse(rawArgs);

    const config = await getAgencyAiConfig(ctx.agencyId);
    if (!config.allowPaymentLinks) {
      return {
        result: {
          ok: false,
          reason: 'agency_disallows_payment_links',
          hint: 'This agency hasn\'t enabled AI-led payments. Offer to connect a human via handoffToHuman.',
        },
      };
    }

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('bookings')
      .select('id, customer_email, customer_name, phone_number, status, total_price')
      .eq('id', args.bookingId)
      .eq('agency_id', ctx.agencyId)
      .maybeSingle();

    if (error) {
      return { result: { ok: false, reason: 'database_error', message: error.message } };
    }
    if (!data) {
      // Same shape an email mismatch returns — no leak about booking existence.
      return { result: { ok: false, reason: 'booking_not_found' } };
    }

    const row = data as {
      id: string;
      customer_email: string;
      customer_name: string;
      phone_number: string | null;
      status: 'Confirmed' | 'Pending' | 'Cancelled';
      total_price: number;
    };

    if (row.customer_email.toLowerCase() !== args.email.toLowerCase()) {
      return { result: { ok: false, reason: 'booking_not_found' } };
    }
    if (row.status === 'Confirmed') {
      return {
        result: {
          ok: false,
          reason: 'already_paid',
          hint: 'This booking is already confirmed. Reassure the visitor.',
        },
      };
    }
    if (row.status === 'Cancelled') {
      return {
        result: {
          ok: false,
          reason: 'cancelled',
          hint: 'This booking was cancelled. Offer a fresh booking or a human handoff.',
        },
      };
    }

    // Convert stored USD total → EGP for Kashier.
    const rate = await fetchUsdToEgp();
    const amountEgp = Math.round(row.total_price * rate * 100) / 100;

    let paymentUrl: string;
    try {
      paymentUrl = await buildKashierHppUrl({
        merchantOrderId: row.id,
        amount: amountEgp,
        customer: {
          name: row.customer_name,
          email: row.customer_email,
          mobile: row.phone_number ?? undefined,
        },
      });
    } catch (err) {
      // Most likely cause: agency hasn't configured Kashier credentials yet.
      const message = err instanceof Error ? err.message : 'Failed to mint Kashier URL.';
      return {
        result: {
          ok: false,
          reason: 'kashier_not_configured',
          message,
          hint: 'Tell the visitor the agency hasn\'t set up online payments yet — offer a WhatsApp handoff for bank-transfer instructions.',
        },
      };
    }

    return {
      result: {
        ok: true,
        bookingId: row.id,
        paymentUrl,
        totalUsd: row.total_price,
        totalEgp: amountEgp,
        rate,
      },
      clientHint: {
        type: 'apply_payment',
        bookingId: row.id,
        paymentUrl,
        total: row.total_price,
        currency: 'USD',
      },
    };
  },
};
