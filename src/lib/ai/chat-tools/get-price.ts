import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { toCamelCase } from '@/lib/utils';
import type { PriceTier, Tour, TourPackage } from '@/types';
import type { ChatTool } from './types';
import { zodToJsonSchema } from './zod-to-schema';

const parameters = z.object({
  tourId: z.string().uuid().describe('UUID of the tour to price.'),
  packageId: z
    .string()
    .uuid()
    .optional()
    .describe('UUID of a specific package; omit to use the first available package or the legacy priceTiers.'),
  adults: z.number().int().min(1).max(20).describe('Number of adult travelers.'),
  children: z.number().int().min(0).max(20).default(0).describe('Number of child travelers.'),
});

type GetPriceArgs = z.infer<typeof parameters>;

function pickTier(tiers: PriceTier[], totalPeople: number): PriceTier | null {
  if (!Array.isArray(tiers) || tiers.length === 0) return null;
  // Sort by minPeople ascending so we always land in the right bracket.
  const sorted = [...tiers].sort((a, b) => a.minPeople - b.minPeople);
  for (const tier of sorted) {
    const min = tier.minPeople;
    const max = tier.maxPeople ?? Number.POSITIVE_INFINITY;
    if (totalPeople >= min && totalPeople <= max) return tier;
  }
  // Out of range — use the highest-min tier (covers "X and up" bookings).
  return sorted[sorted.length - 1];
}

export const getPriceTool: ChatTool = {
  name: 'getPrice',
  description:
    'Compute the total price for a tour for a given party size. Returns adult/child totals and the matched price tier.',
  parameters,
  jsonSchema: zodToJsonSchema(parameters),
  async handler(rawArgs, ctx) {
    const args: GetPriceArgs = parameters.parse(rawArgs);
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from('tours')
      .select('*')
      .eq('agency_id', ctx.agencyId)
      .eq('id', args.tourId)
      .maybeSingle();
    if (error) return { result: { error: 'database_error', message: error.message } };
    if (!data) return { result: { error: 'tour_not_found' } };

    const tour = toCamelCase(data) as Tour;
    const totalPeople = args.adults + args.children;

    let tier: PriceTier | null = null;
    let chosenPackage: TourPackage | null = null;

    if (Array.isArray(tour.packages) && tour.packages.length > 0) {
      chosenPackage = args.packageId
        ? tour.packages.find((p) => p.id === args.packageId) ?? null
        : tour.packages[0];
      if (!chosenPackage) {
        return { result: { error: 'package_not_found' } };
      }
      tier = pickTier(chosenPackage.priceTiers, totalPeople);
    } else if (Array.isArray(tour.priceTiers) && tour.priceTiers.length > 0) {
      tier = pickTier(tour.priceTiers, totalPeople);
    }

    if (!tier) {
      return { result: { error: 'no_price_tier_matches', totalPeople } };
    }

    const adultTotal = tier.pricePerAdult * args.adults;
    const childTotal = tier.pricePerChild * args.children;
    const total = adultTotal + childTotal;

    return {
      result: {
        tourId: tour.id,
        tourName: tour.name,
        packageId: chosenPackage?.id ?? null,
        packageName: chosenPackage?.name ?? null,
        adults: args.adults,
        children: args.children,
        pricePerAdult: tier.pricePerAdult,
        pricePerChild: tier.pricePerChild,
        adultTotal,
        childTotal,
        total,
        currency: 'USD',
        tier: {
          minPeople: tier.minPeople,
          maxPeople: tier.maxPeople,
        },
      },
    };
  },
};
