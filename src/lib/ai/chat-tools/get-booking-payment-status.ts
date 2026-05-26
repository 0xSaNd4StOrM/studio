import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getAgencyAiConfig } from '@/lib/supabase/agency-ai-config';
import type { ChatTool } from './types';
import { zodToJsonSchema } from './zod-to-schema';

const parameters = z.object({
  bookingId: z.string().uuid().describe('UUID of the booking to check.'),
  email: z
    .string()
    .email()
    .describe(
      'Visitor email used to verify ownership of the booking. Must match the booking record.'
    ),
});

type GetBookingPaymentStatusArgs = z.infer<typeof parameters>;

export const getBookingPaymentStatusTool: ChatTool = {
  name: 'getBookingPaymentStatus',
  description:
    "Check the payment status of a specific booking. Use after `lookupBookings` if the visitor wants a fresh status check (e.g. 'did my payment go through?'). Requires the email used on the booking — refuses on mismatch.",
  parameters,
  jsonSchema: zodToJsonSchema(parameters),
  async handler(rawArgs, ctx) {
    const args: GetBookingPaymentStatusArgs = parameters.parse(rawArgs);

    const config = await getAgencyAiConfig(ctx.agencyId);
    if (!config.allowBookingLookup) {
      return {
        result: {
          ok: false,
          reason: 'agency_disallows_lookup',
        },
      };
    }

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('bookings')
      .select('id, customer_email, status, total_price, payment_method, booking_date, share_token')
      .eq('id', args.bookingId)
      .eq('agency_id', ctx.agencyId)
      .maybeSingle();

    if (error) {
      return { result: { ok: false, reason: 'database_error', message: error.message } };
    }
    if (!data) {
      return { result: { ok: false, reason: 'booking_not_found' } };
    }

    const row = data as {
      id: string;
      customer_email: string;
      status: 'Confirmed' | 'Pending' | 'Cancelled';
      total_price: number;
      payment_method: 'cash' | 'online' | null;
      booking_date: string;
      share_token: string | null;
    };

    if (row.customer_email.toLowerCase() !== args.email.toLowerCase()) {
      // Same response shape as booking_not_found so a stranger can't tell
      // whether the booking id is even real.
      return { result: { ok: false, reason: 'booking_not_found' } };
    }

    return {
      result: {
        ok: true,
        bookingId: row.id,
        status: row.status,
        paymentMethod: row.payment_method,
        totalPrice: row.total_price,
        currency: 'USD',
        bookingDate: row.booking_date,
        shareUrl: row.share_token ? `/booking/${row.share_token}` : null,
      },
      ...(row.share_token
        ? {
            clientHint: {
              type: 'view_booking' as const,
              bookingId: row.id,
              shareUrl: `/booking/${row.share_token}`,
              status: row.status,
              total: row.total_price,
              currency: 'USD',
            },
          }
        : {}),
    };
  },
};
