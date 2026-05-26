import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { toCamelCase } from '@/lib/utils';
import type { Tour } from '@/types';
import type { ChatTool } from './types';
import { zodToJsonSchema } from './zod-to-schema';

const parameters = z.object({
  destination: z
    .string()
    .min(2)
    .max(80)
    .optional()
    .describe('Filter by destination (e.g. "Aswan"). Case-insensitive partial match.'),
  type: z
    .string()
    .min(2)
    .max(40)
    .optional()
    .describe('Filter by tour category (e.g. "private", "cultural", "adventure").'),
  maxDurationDays: z
    .number()
    .int()
    .min(1)
    .max(30)
    .optional()
    .describe('Cap on trip length in days.'),
  maxPriceUsd: z
    .number()
    .min(1)
    .max(50000)
    .optional()
    .describe('Cap on starting per-adult price in USD.'),
  query: z
    .string()
    .min(2)
    .max(80)
    .optional()
    .describe('Free-text keyword search across tour names.'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(10)
    .default(5)
    .describe('How many tours to return (default 5, max 10).'),
});

type SearchToursArgs = z.infer<typeof parameters>;

type SearchResultTour = {
  id: string;
  slug: string;
  name: string;
  destinations: string[];
  type: string[];
  durationDays: number;
  startingPriceUsd: number | null;
  rating: number | null;
  summary: string;
};

function startingPrice(tour: Tour): number | null {
  if (Array.isArray(tour.priceTiers) && tour.priceTiers.length > 0) {
    const lowest = Math.min(
      ...tour.priceTiers.map((t) => t.pricePerAdult).filter((n) => Number.isFinite(n))
    );
    return Number.isFinite(lowest) ? lowest : null;
  }
  if (Array.isArray(tour.packages) && tour.packages.length > 0) {
    const all = tour.packages.flatMap((p) =>
      p.priceTiers.map((t) => t.pricePerAdult).filter((n) => Number.isFinite(n))
    );
    if (all.length === 0) return null;
    return Math.min(...all);
  }
  return null;
}

function toResult(tour: Tour): SearchResultTour {
  return {
    id: tour.id,
    slug: tour.slug,
    name: tour.name,
    destinations: Array.isArray(tour.destinations) ? tour.destinations : [tour.destination].filter(Boolean) as string[],
    type: Array.isArray(tour.type) ? tour.type : [],
    durationDays: tour.duration,
    startingPriceUsd: startingPrice(tour),
    rating: tour.rating ?? null,
    summary:
      typeof tour.description === 'string'
        ? tour.description.slice(0, 300)
        : '',
  };
}

export const searchToursTool: ChatTool = {
  name: 'searchTours',
  description:
    'Search the agency\'s tour catalog by destination, type, duration, price, or keyword. Returns up to 10 matching tours with their starting price and a short summary.',
  parameters,
  jsonSchema: zodToJsonSchema(parameters),
  async handler(rawArgs, ctx) {
    const args: SearchToursArgs = parameters.parse(rawArgs);
    const supabase = createServiceRoleClient();

    let query = supabase
      .from('tours')
      .select('*')
      .eq('agency_id', ctx.agencyId)
      .eq('availability', true);

    if (args.destination) {
      query = query.contains('destinations', [args.destination]);
    }
    if (args.type) {
      query = query.contains('type', [args.type]);
    }
    if (args.maxDurationDays) {
      query = query.lte('duration', args.maxDurationDays);
    }
    if (args.query) {
      query = query.ilike('name', `%${args.query}%`);
    }

    const { data, error } = await query.limit(args.limit);
    if (error) {
      return { result: { error: 'database_error', message: error.message } };
    }

    let tours = (data ?? []).map(
      (row: Record<string, unknown>) => toCamelCase(row) as Tour
    );

    if (args.maxPriceUsd !== undefined) {
      const cap = args.maxPriceUsd;
      tours = tours.filter((t) => {
        const sp = startingPrice(t);
        return sp === null ? false : sp <= cap;
      });
    }

    return {
      result: {
        count: tours.length,
        tours: tours.map(toResult),
      },
    };
  },
};
