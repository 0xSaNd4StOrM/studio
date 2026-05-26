import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { toCamelCase } from '@/lib/utils';
import type { Tour } from '@/types';
import type { ChatTool } from './types';
import { zodToJsonSchema } from './zod-to-schema';

const parameters = z
  .object({
    tourId: z.string().uuid().optional().describe('UUID of the tour.'),
    slug: z.string().min(2).max(120).optional().describe('Slug of the tour, e.g. "luxor-3-day".'),
  })
  .describe('Provide either tourId or slug (one is required).');

type GetTourDetailsArgs = z.infer<typeof parameters>;

export const getTourDetailsTool: ChatTool = {
  name: 'getTourDetails',
  description:
    'Fetch the full record of a single tour: full description, day-by-day itinerary, packages, inclusions, exclusions, and starting price.',
  parameters,
  jsonSchema: zodToJsonSchema(parameters),
  async handler(rawArgs, ctx) {
    const args: GetTourDetailsArgs = parameters.parse(rawArgs);
    if (!args.tourId && !args.slug) {
      return { result: { error: 'missing_identifier', message: 'Provide tourId or slug.' } };
    }

    const supabase = createServiceRoleClient();
    let query = supabase.from('tours').select('*').eq('agency_id', ctx.agencyId);
    if (args.tourId) query = query.eq('id', args.tourId);
    if (args.slug) query = query.eq('slug', args.slug);

    const { data, error } = await query.maybeSingle();
    if (error) {
      return { result: { error: 'database_error', message: error.message } };
    }
    if (!data) {
      return { result: { error: 'tour_not_found' } };
    }

    const tour = toCamelCase(data) as Tour;
    return {
      result: {
        id: tour.id,
        slug: tour.slug,
        name: tour.name,
        destinations: tour.destinations ?? [tour.destination].filter(Boolean),
        type: tour.type ?? [],
        durationDays: tour.duration,
        description: tour.description ?? '',
        durationText: tour.durationText ?? '',
        tourType: tour.tourType ?? '',
        availability: tour.availability,
        availabilityDescription: tour.availabilityDescription ?? '',
        pickupAndDropoff: tour.pickupAndDropoff ?? '',
        cancellationPolicy: tour.cancellationPolicy ?? '',
        highlights: tour.highlights ?? [],
        includes: tour.includes ?? [],
        excludes: tour.excludes ?? [],
        itinerary: tour.itinerary ?? [],
        priceTiers: tour.priceTiers ?? [],
        packages: tour.packages ?? [],
        rating: tour.rating ?? null,
      },
      clientHint: {
        type: 'highlight_tour',
        tourId: tour.id,
        slug: tour.slug,
      },
    };
  },
};
