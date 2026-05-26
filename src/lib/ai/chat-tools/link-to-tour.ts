import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type { ChatTool } from './types';
import { zodToJsonSchema } from './zod-to-schema';

const parameters = z
  .object({
    tourId: z.string().uuid().optional().describe('UUID of the tour to link to.'),
    slug: z.string().min(2).max(120).optional().describe('Slug of the tour (e.g. "luxor-3-day").'),
  })
  .describe('Provide either tourId or slug (one is required).');

type LinkToTourArgs = z.infer<typeof parameters>;

export const linkToTourTool: ChatTool = {
  name: 'linkToTour',
  description:
    "Get a shareable URL to a tour's public page. Use when the visitor wants to browse a tour before booking, save it for later, or share it with someone. Returns the path as `/tours/<slug>`. Always wrap it in a Markdown link when quoting it, e.g. [view tour →](/tours/luxor-day-trip).",
  parameters,
  jsonSchema: zodToJsonSchema(parameters),
  async handler(rawArgs, ctx) {
    const args: LinkToTourArgs = parameters.parse(rawArgs);
    if (!args.tourId && !args.slug) {
      return { result: { ok: false, error: 'missing_identifier', hint: 'Provide tourId or slug.' } };
    }

    const supabase = createServiceRoleClient();
    let query = supabase
      .from('tours')
      .select('id, slug, name, destination, destinations, duration, availability')
      .eq('agency_id', ctx.agencyId);
    if (args.tourId) query = query.eq('id', args.tourId);
    if (args.slug) query = query.eq('slug', args.slug);

    const { data, error } = await query.maybeSingle();
    if (error) {
      return { result: { ok: false, error: 'database_error', message: error.message } };
    }
    if (!data) {
      return { result: { ok: false, error: 'tour_not_found' } };
    }

    const tour = data as {
      id: string;
      slug: string;
      name: string;
      destination: string;
      destinations: string[] | null;
      duration: number;
      availability: boolean;
    };

    return {
      result: {
        ok: true,
        tourId: tour.id,
        slug: tour.slug,
        url: `/tours/${tour.slug}`,
        tourName: tour.name,
        destinations:
          Array.isArray(tour.destinations) && tour.destinations.length > 0
            ? tour.destinations
            : tour.destination
              ? [tour.destination]
              : [],
        durationDays: tour.duration,
        available: tour.availability,
      },
      clientHint: {
        type: 'highlight_tour',
        tourId: tour.id,
        slug: tour.slug,
      },
    };
  },
};
