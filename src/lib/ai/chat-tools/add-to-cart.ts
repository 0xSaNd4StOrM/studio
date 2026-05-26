import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { toCamelCase } from '@/lib/utils';
import type { Tour } from '@/types';
import type { ChatTool } from './types';
import { zodToJsonSchema } from './zod-to-schema';

const parameters = z.object({
  tourId: z.string().uuid().describe('UUID of the tour to add.'),
  packageId: z
    .string()
    .uuid()
    .optional()
    .describe('Specific package UUID. Omit to use the tour\'s first available package.'),
  adults: z
    .number()
    .int()
    .min(1)
    .max(20)
    .describe('Number of adult travelers.'),
  children: z
    .number()
    .int()
    .min(0)
    .max(20)
    .default(0)
    .describe('Number of child travelers.'),
  date: z
    .string()
    .min(10)
    .max(10)
    .optional()
    .describe('Optional preferred date in YYYY-MM-DD format.'),
});

type AddToCartArgs = z.infer<typeof parameters>;

export const addToCartTool: ChatTool = {
  name: 'addToCart',
  description:
    "Drop a tour into the visitor's cart. Only call this when the visitor has explicitly agreed to add it; never push without consent. Returns the cart-line payload that the browser applies via the existing cart context.",
  parameters,
  jsonSchema: zodToJsonSchema(parameters),
  async handler(rawArgs, ctx) {
    const args: AddToCartArgs = parameters.parse(rawArgs);
    if (args.date && !/^\d{4}-\d{2}-\d{2}$/.test(args.date)) {
      return { result: { ok: false, error: 'invalid_date_format', hint: 'Use YYYY-MM-DD.' } };
    }

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('tours')
      .select('*')
      .eq('agency_id', ctx.agencyId)
      .eq('id', args.tourId)
      .maybeSingle();
    if (error) {
      return { result: { ok: false, error: 'database_error', message: error.message } };
    }
    if (!data) {
      return { result: { ok: false, error: 'tour_not_found' } };
    }

    const tour = toCamelCase(data) as Tour;

    if (!tour.availability) {
      return { result: { ok: false, error: 'tour_unavailable' } };
    }

    // Resolve package: prefer the LLM's choice, else the first package, else
    // signal that this tour uses the legacy priceTiers (no package needed).
    let packageId: string | undefined;
    let packageName: string | undefined;
    if (Array.isArray(tour.packages) && tour.packages.length > 0) {
      const pkg = args.packageId
        ? tour.packages.find((p) => p.id === args.packageId)
        : tour.packages[0];
      if (!pkg) {
        return { result: { ok: false, error: 'package_not_found' } };
      }
      packageId = pkg.id;
      packageName = pkg.name;
    }

    return {
      result: {
        ok: true,
        tourId: tour.id,
        tourName: tour.name,
        slug: tour.slug,
        packageId: packageId ?? null,
        packageName: packageName ?? null,
        adults: args.adults,
        children: args.children,
        date: args.date ?? null,
      },
      clientHint: {
        type: 'add_to_cart',
        tourId: tour.id,
        packageId,
        packageName,
        adults: args.adults,
        children: args.children,
        date: args.date,
        tour,
      },
    };
  },
};
