import type { SkillToolName } from '@/types/skill';

export type SkillToolOption = {
  name: SkillToolName;
  label: string;
  description: string;
  /** Built-in tools always work; gated tools depend on agency capability toggles. */
  gated?: 'discounts' | 'cart' | 'tailor-made';
};

export const SKILL_TOOL_OPTIONS: SkillToolOption[] = [
  {
    name: 'searchTours',
    label: 'Search tours',
    description: 'Filter the catalog by destination, type, duration, or price.',
  },
  {
    name: 'getTourDetails',
    label: 'Get tour details',
    description: 'Load full info for one tour: itinerary, packages, includes/excludes.',
  },
  {
    name: 'getPrice',
    label: 'Get price',
    description: 'Compute totals for a party size and package.',
  },
  {
    name: 'checkAvailability',
    label: 'Check availability',
    description: 'See spots remaining on a specific date.',
  },
  {
    name: 'handoffToHuman',
    label: 'Hand off to human',
    description: 'Build a WhatsApp deep-link with conversation summary.',
  },
  {
    name: 'listSkills',
    label: 'List skills',
    description: 'Self-describe capabilities when asked.',
  },
  {
    name: 'linkToTour',
    label: 'Link to tour page',
    description: 'Share the public URL of a specific tour for the visitor to browse.',
  },
  {
    name: 'proposeDiscount',
    label: 'Propose discount',
    description: 'Mint a single-use promo code within the agency cap.',
    gated: 'discounts',
  },
  {
    name: 'addToCart',
    label: 'Add to cart',
    description: "Drop a tour into the visitor's cart in one click.",
    gated: 'cart',
  },
  {
    name: 'reviseItinerary',
    label: 'Revise itinerary',
    description: 'Edit the generated tailor-made itinerary in place.',
    gated: 'tailor-made',
  },
  {
    name: 'lookupBookings',
    label: 'Look up bookings',
    description: "Find a visitor's bookings by email + name (customer support).",
  },
  {
    name: 'getBookingPaymentStatus',
    label: 'Check booking status',
    description: 'Check the payment status of a specific booking.',
  },
  {
    name: 'createPaymentLink',
    label: 'Create payment link',
    description: 'Mint a Kashier checkout URL for a pending booking.',
  },
];

export const SKILL_TOOL_OPTIONS_BY_NAME = new Map(
  SKILL_TOOL_OPTIONS.map((o) => [o.name, o] as const)
);
