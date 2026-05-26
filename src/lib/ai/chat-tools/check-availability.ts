import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type { ChatTool } from './types';
import { zodToJsonSchema } from './zod-to-schema';

const parameters = z.object({
  tourId: z.string().uuid().describe('UUID of the tour.'),
  date: z
    .string()
    .min(10)
    .max(10)
    .describe('Date in YYYY-MM-DD format.'),
});

type CheckAvailabilityArgs = z.infer<typeof parameters>;

export const checkAvailabilityTool: ChatTool = {
  name: 'checkAvailability',
  description:
    'Check how many spots are still available on a tour for a specific date. Returns spotsRemaining (null = unlimited) and isBlocked.',
  parameters,
  jsonSchema: zodToJsonSchema(parameters),
  async handler(rawArgs, ctx) {
    const args: CheckAvailabilityArgs = parameters.parse(rawArgs);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(args.date)) {
      return { result: { error: 'invalid_date_format', hint: 'Use YYYY-MM-DD.' } };
    }

    const supabase = createServiceRoleClient();

    const { data: tour, error: tourErr } = await supabase
      .from('tours')
      .select('id, name, availability')
      .eq('agency_id', ctx.agencyId)
      .eq('id', args.tourId)
      .maybeSingle();
    if (tourErr) return { result: { error: 'database_error', message: tourErr.message } };
    if (!tour) return { result: { error: 'tour_not_found' } };
    if (!(tour as { availability: boolean }).availability) {
      return { result: { tourId: args.tourId, date: args.date, available: false, reason: 'tour_unavailable' } };
    }

    const { data, error } = await supabase
      .from('tour_availability')
      .select('available_spots, is_blocked')
      .eq('agency_id', ctx.agencyId)
      .eq('tour_id', args.tourId)
      .eq('date', args.date)
      .maybeSingle();
    if (error) return { result: { error: 'database_error', message: error.message } };

    if (!data) {
      // No explicit row → treat as default availability (unlimited).
      return {
        result: {
          tourId: args.tourId,
          date: args.date,
          available: true,
          spotsRemaining: null,
          isBlocked: false,
        },
      };
    }

    const row = data as { available_spots: number | null; is_blocked: boolean };
    return {
      result: {
        tourId: args.tourId,
        date: args.date,
        available: !row.is_blocked && (row.available_spots === null || row.available_spots > 0),
        spotsRemaining: row.available_spots,
        isBlocked: row.is_blocked,
      },
    };
  },
};
