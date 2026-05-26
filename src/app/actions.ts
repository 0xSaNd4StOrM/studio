'use server';

import { suggestAlternativeTours } from '@/ai/flows/suggest-alternative-tours';
import { generateTourFlow } from '@/ai/flows/generateTour';
import { generateStructuredWithCopilot } from '@/lib/ai/copilot';
import { createClient } from '@/lib/supabase/server';
import { TourInputSchema, TourOutput } from '@/types/tour-schemas';
import { z } from 'zod';

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string' || typeof item === 'number') {
          return String(item).trim();
        }

        return '';
      })
      .filter((item) => item.length > 0);
  }

  if (typeof value === 'string') {
    return value
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  return [];
}

const OptionalStringArraySchema = z.preprocess(
  (value) => {
    const parsed = parseStringArray(value);
    return parsed.length > 0 ? parsed : undefined;
  },
  z.array(z.string().min(1)).optional()
);

const RequiredStringArraySchema = z.preprocess(
  (value) => parseStringArray(value),
  z.array(z.string().min(1)).min(1)
);

function uniqueStrings(values: string[]): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))
  );
}

function createSlug(value: string): string {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'generated-tour';
}

async function hasAuthenticatedUser(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return Boolean(user);
}

// For AI Suggestions in Cart
const SuggestionActionInputSchema = z.object({
  tourDescriptions: z
    .array(z.string())
    .min(1, { message: 'At least one tour description is required.' }),
});

type SuggestionsState = {
  message: string;
  suggestions: string[];
};

export async function getAiSuggestions(
  prevState: SuggestionsState,
  formData: FormData
): Promise<SuggestionsState> {
  try {
    const rawInput = {
      tourDescriptions: formData.getAll('descriptions') as string[],
    };

    const validatedInput = SuggestionActionInputSchema.safeParse(rawInput);

    if (!validatedInput.success) {
      return {
        message: validatedInput.error.issues[0]?.message ?? 'Invalid input.',
        suggestions: [],
      };
    }

    const result = await suggestAlternativeTours(validatedInput.data);

    if (result.alternativeTours.length === 0) {
      return { message: 'No alternative tours found.', suggestions: [] };
    }

    return { message: 'Success', suggestions: result.alternativeTours };
  } catch (error) {
    console.error(error);
    return {
      message: 'An unexpected error occurred. Please try again.',
      suggestions: [],
    };
  }
}

// For Tailor Made Tour
export type TourGenerationState = {
  success: boolean;
  data?: TourOutput;
  message?: string;
};

export async function generateTailorMadeTourAction(
  input: z.infer<typeof TourInputSchema>
): Promise<TourGenerationState> {
  try {
    const validatedInput = TourInputSchema.parse(input);
    const result = await generateTourFlow(validatedInput);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('Error generating tour:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to generate tour',
    };
  }
}

const SeoAssistInputSchema = z.object({
  prompt: z.string().min(3),
  scope: z.enum([
    'site',
    'home',
    'about',
    'contact',
    'tours',
    'services',
    'destination',
    'tailorMade',
    'blog',
  ]),
  agencyName: z.string().optional(),
  siteName: z.string().optional(),
  existingTitle: z.string().optional(),
  existingDescription: z.string().optional(),
  existingKeywords: z.string().optional(),
});

const SeoAssistOutputSchema = z.object({
  title: z.string(),
  description: z.string(),
  keywords: z.string(),
});

export type SeoAssistResult = z.infer<typeof SeoAssistOutputSchema>;

export async function generateSeoAssistAction(
  input: z.infer<typeof SeoAssistInputSchema>
): Promise<{
  success: boolean;
  data?: SeoAssistResult;
  message?: string;
}> {
  try {
    if (!(await hasAuthenticatedUser())) {
      return { success: false, message: 'Unauthorized' };
    }

    const validated = SeoAssistInputSchema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        message: validated.error.issues[0]?.message ?? 'Invalid input.',
      };
    }

    const scopeLabel =
      validated.data.scope === 'site' ? 'Site Defaults' : `${validated.data.scope} Page`;

    const output = await generateStructuredWithCopilot({
      feature: 'seo-assist',
      schema: SeoAssistOutputSchema,
      systemPrompt:
        'You are an SEO strategist for a travel agency website. Return strict JSON only and keep metadata concise.',
      userPrompt: `Generate SEO metadata.

Requirements:
- title: <= 60 characters.
- description: <= 160 characters.
- keywords: comma-separated list, 8 to 12 items, no duplicates.

Context:
- Scope: ${scopeLabel}
- Agency Name: ${validated.data.agencyName ?? ''}
- Site Name: ${validated.data.siteName ?? ''}
- Existing Title: ${validated.data.existingTitle ?? ''}
- Existing Description: ${validated.data.existingDescription ?? ''}
- Existing Keywords: ${validated.data.existingKeywords ?? ''}

User request: ${validated.data.prompt}`,
      temperature: 0.4,
    });

    return { success: true, data: output };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to generate SEO content.',
    };
  }
}

const BlogDraftForAdminInputSchema = z.object({
  topic: z.string().min(3),
  keywords: OptionalStringArraySchema,
  tone: z.string().min(2).optional(),
  audience: z.string().min(2).optional(),
  cta: z.string().min(2).optional(),
});

const BlogDraftForAdminOutputSchema = z.object({
  title: z.string().min(3),
  excerpt: z.string().min(20),
  contentHtml: z.string().min(120),
  seoKeywords: z.preprocess(
    (value) => parseStringArray(value),
    z.array(z.string().min(1)).min(3).max(12)
  ),
});

type BlogDraftForAdmin = z.infer<typeof BlogDraftForAdminOutputSchema>;

export async function generateBlogDraftForAdminAction(
  input: z.infer<typeof BlogDraftForAdminInputSchema>
): Promise<{
  success: boolean;
  data?: BlogDraftForAdmin;
  message?: string;
}> {
  try {
    if (!(await hasAuthenticatedUser())) {
      return { success: false, message: 'Unauthorized' };
    }

    const validated = BlogDraftForAdminInputSchema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        message: validated.error.issues[0]?.message ?? 'Invalid input.',
      };
    }

    const output = await generateStructuredWithCopilot({
      feature: 'blog-draft',
      schema: BlogDraftForAdminOutputSchema,
      systemPrompt:
        'You are a senior travel content strategist. Return valid JSON only and ensure contentHtml contains semantic HTML.',
      userPrompt: `Create an admin-ready travel blog draft.

Return JSON with fields:
- title
- excerpt
- contentHtml
- seoKeywords (array of strings)

Draft context:
- Topic: ${validated.data.topic}
- Keywords: ${validated.data.keywords?.join(', ') ?? 'Not provided'}
- Tone: ${validated.data.tone ?? 'Informative and inspiring'}
- Audience: ${validated.data.audience ?? 'Travelers planning their next trip'}
- CTA: ${validated.data.cta ?? 'Encourage booking a tour inquiry'}

Writing rules:
- contentHtml should be rich and publishable.
- Include clear sections with h2/h3.
- Include one practical call to action paragraph.
- Keep excerpt concise (1-2 sentences).`,
      temperature: 0.7,
    });

    return {
      success: true,
      data: {
        ...output,
        seoKeywords: uniqueStrings(output.seoKeywords).slice(0, 12),
      },
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to generate blog draft.',
    };
  }
}

const TourDraftForAdminInputSchema = z.object({
  destination: z.string().min(2),
  durationDays: z.coerce.number().int().min(1).max(30),
  tourStyle: z.string().min(2),
  audience: z.string().min(2).optional(),
  mustInclude: OptionalStringArraySchema,
  budgetLevel: z.string().min(2).optional(),
});

const AdminPriceTierSchema = z.object({
  minPeople: z.coerce.number().int().min(1),
  maxPeople: z.preprocess(
    (value) => (value === '' || value === undefined || value === null ? null : value),
    z.coerce.number().int().nullable()
  ),
  pricePerAdult: z.coerce.number().min(0),
  pricePerChild: z.coerce.number().min(0),
});

const AdminTourPackageSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(''),
  priceTiers: z.array(AdminPriceTierSchema).min(1),
});

const TourDraftForAdminOutputSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(1),
  destination: z.string().min(2),
  type: z.preprocess((value) => parseStringArray(value), z.array(z.string().min(1)).min(1)),
  duration: z.coerce.number().int().min(1),
  description: z.string().min(20),
  durationText: z.string().min(2),
  tourType: z.string().min(2),
  availabilityDescription: z.string().min(2),
  pickupAndDropoff: z.string().min(2),
  cancellationPolicy: z.string().min(2),
  itinerary: z
    .array(
      z.object({
        day: z.coerce.number().int().min(1),
        activity: z.string().min(3),
      })
    )
    .min(1),
  highlights: z.preprocess((value) => parseStringArray(value), z.array(z.string().min(1)).min(1)),
  includes: z.preprocess((value) => parseStringArray(value), z.array(z.string().min(1)).min(1)),
  excludes: z.preprocess((value) => parseStringArray(value), z.array(z.string().min(1)).min(1)),
  packages: z.array(AdminTourPackageSchema).min(1),
});

type TourDraftForAdmin = z.infer<typeof TourDraftForAdminOutputSchema>;

function normalizeTourDraft(draft: TourDraftForAdmin): TourDraftForAdmin {
  return {
    ...draft,
    slug: createSlug(draft.slug || draft.name),
    type: uniqueStrings(draft.type),
    highlights: uniqueStrings(draft.highlights),
    includes: uniqueStrings(draft.includes),
    excludes: uniqueStrings(draft.excludes),
    itinerary: [...draft.itinerary]
      .sort((left, right) => left.day - right.day)
      .map((item, index) => ({
        day: index + 1,
        activity: item.activity.trim(),
      })),
    packages: draft.packages.map((pkg) => ({
      ...pkg,
      name: pkg.name.trim(),
      description: pkg.description?.trim() ?? '',
      priceTiers: pkg.priceTiers.map((tier) => {
        const normalizedMinPeople = Math.max(1, Math.round(tier.minPeople));
        const normalizedMaxPeople =
          tier.maxPeople === null ? null : Math.max(1, Math.round(tier.maxPeople));

        return {
          minPeople: normalizedMinPeople,
          maxPeople:
            normalizedMaxPeople !== null && normalizedMaxPeople < normalizedMinPeople
              ? null
              : normalizedMaxPeople,
          pricePerAdult: Math.max(0, tier.pricePerAdult),
          pricePerChild: Math.max(0, tier.pricePerChild),
        };
      }),
    })),
  };
}

export async function generateTourDraftForAdminAction(
  input: z.infer<typeof TourDraftForAdminInputSchema>
): Promise<{
  success: boolean;
  data?: TourDraftForAdmin;
  message?: string;
}> {
  try {
    if (!(await hasAuthenticatedUser())) {
      return { success: false, message: 'Unauthorized' };
    }

    const validated = TourDraftForAdminInputSchema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        message: validated.error.issues[0]?.message ?? 'Invalid input.',
      };
    }

    const output = await generateStructuredWithCopilot({
      feature: 'tour-draft',
      schema: TourDraftForAdminOutputSchema,
      systemPrompt:
        'You are an expert tourism product manager creating publishable tour drafts for an admin dashboard. Return strict JSON only.',
      userPrompt: `Create a tour draft object for a tour form.

You must return JSON with these exact fields:
name, slug, destination, type, duration, description, durationText, tourType,
availabilityDescription, pickupAndDropoff, cancellationPolicy,
itinerary (array of { day, activity }),
highlights (string[]), includes (string[]), excludes (string[]),
packages (array of { name, description, priceTiers: [{ minPeople, maxPeople, pricePerAdult, pricePerChild }] }).

Input context:
- Destination: ${validated.data.destination}
- Duration Days: ${validated.data.durationDays}
- Tour Style: ${validated.data.tourStyle}
- Audience: ${validated.data.audience ?? 'General travelers'}
- Must Include: ${validated.data.mustInclude?.join(', ') ?? 'Not specified'}
- Budget Level: ${validated.data.budgetLevel ?? 'Mid-range'}

Business constraints:
- duration must equal Duration Days.
- slug must be URL friendly.
- type should include 1-3 relevant categories.
- include at least 2 packages with realistic price tiers.
- itinerary should match duration with one main activity per day.
- keep copy concise and admin-editable.`,
      temperature: 0.65,
    });

    return {
      success: true,
      data: normalizeTourDraft(output),
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to generate tour draft.',
    };
  }
}

const AdvancedTailorMadePlanInputSchema = z.object({
  title: z.string().min(3),
  travelDates: z.string().min(3),
  regions: RequiredStringArraySchema,
  participants: z
    .union([z.string(), z.number()])
    .transform((value) => String(value).trim())
    .refine((value) => value.length > 0, { message: 'participants is required.' }),
  accommodation: z.string().min(2),
  budget: z.string().min(2),
  interests: RequiredStringArraySchema,
  pace: z.string().min(2),
  customPreferences: z.string().optional(),
});

const AdvancedTailorMadePlanOutputSchema = z.object({
  tourName: z.string().min(3),
  executiveSummary: z.string().min(20),
  totalPriceEstimate: z.string().min(2),
  itinerary: z
    .array(
      z.object({
        day: z.coerce.number().int().min(1),
        title: z.string().min(2),
        plan: z.string().min(3),
        activities: z.preprocess(
          (value) => parseStringArray(value),
          z.array(z.string().min(1)).min(1)
        ),
      })
    )
    .min(1),
  inclusions: z.preprocess((value) => parseStringArray(value), z.array(z.string().min(1)).min(1)),
  exclusions: z.preprocess((value) => parseStringArray(value), z.array(z.string().min(1)).min(1)),
  logistics: z.object({
    transportation: z.string().min(3),
    transfers: z.string().min(3),
    accommodationPlan: z.string().min(3),
    support: z.string().min(3),
  }),
  upsellIdeas: z
    .array(
      z.object({
        title: z.string().min(2),
        reason: z.string().min(3),
        estimatedPrice: z.string().min(1),
      })
    )
    .min(1),
  riskNotes: z.preprocess((value) => parseStringArray(value), z.array(z.string().min(1)).min(1)),
});

type AdvancedTailorMadePlan = z.infer<typeof AdvancedTailorMadePlanOutputSchema>;

function normalizeAdvancedPlan(plan: AdvancedTailorMadePlan): AdvancedTailorMadePlan {
  return {
    ...plan,
    itinerary: [...plan.itinerary]
      .sort((left, right) => left.day - right.day)
      .map((item, index) => ({
        ...item,
        day: index + 1,
        activities: uniqueStrings(item.activities),
      })),
    inclusions: uniqueStrings(plan.inclusions),
    exclusions: uniqueStrings(plan.exclusions),
    riskNotes: uniqueStrings(plan.riskNotes),
    upsellIdeas: plan.upsellIdeas.map((idea) => ({
      title: idea.title.trim(),
      reason: idea.reason.trim(),
      estimatedPrice: idea.estimatedPrice.trim(),
    })),
  };
}

export async function generateAdvancedTailorMadePlanAction(
  input: z.infer<typeof AdvancedTailorMadePlanInputSchema>
): Promise<{
  success: boolean;
  data?: AdvancedTailorMadePlan;
  message?: string;
}> {
  try {
    if (!(await hasAuthenticatedUser())) {
      return { success: false, message: 'Unauthorized' };
    }

    const validated = AdvancedTailorMadePlanInputSchema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        message: validated.error.issues[0]?.message ?? 'Invalid input.',
      };
    }

    const output = await generateStructuredWithCopilot({
      feature: 'advanced-plan',
      schema: AdvancedTailorMadePlanOutputSchema,
      systemPrompt:
        'You are a senior luxury travel consultant creating advanced tailor-made itineraries for operations teams. Return strict JSON only.',
      userPrompt: `Create an advanced tailor-made plan.

Return JSON with fields:
- tourName
- executiveSummary
- totalPriceEstimate
- itinerary: array of { day, title, plan, activities[] }
- inclusions: string[]
- exclusions: string[]
- logistics: { transportation, transfers, accommodationPlan, support }
- upsellIdeas: array of { title, reason, estimatedPrice }
- riskNotes: string[]

Traveler brief:
- Plan title: ${validated.data.title}
- Travel dates: ${validated.data.travelDates}
- Regions: ${validated.data.regions.join(', ')}
- Participants: ${validated.data.participants}
- Accommodation: ${validated.data.accommodation}
- Budget: ${validated.data.budget}
- Interests: ${validated.data.interests.join(', ')}
- Pace: ${validated.data.pace}
- Custom preferences: ${validated.data.customPreferences ?? 'None provided'}

Constraints:
- Keep recommendations realistic for Egypt travel operations.
- Include practical logistics and risk awareness.
- Upsell ideas must be value-add and relevant.`,
      temperature: 0.6,
    });

    return {
      success: true,
      data: normalizeAdvancedPlan(output),
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to generate advanced plan.',
    };
  }
}

export async function markNotificationsRead(agencyId: string) {
  const supabase = await createClient();
  await supabase
    .from('agency_notifications')
    .update({ is_read: true })
    .eq('agency_id', agencyId)
    .eq('is_read', false);
}

export async function subscribeToNewsletter(
  _prev: { ok: boolean; message: string },
  formData: FormData
): Promise<{ ok: boolean; message: string }> {
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: 'Please enter a valid email address.' };
  }

  const { subscribeEmail } = await import('@/lib/supabase/blog');
  const result = await subscribeEmail(email);
  if (result.ok) {
    return { ok: true, message: 'You have been subscribed! Check your inbox for updates.' };
  }
  return { ok: false, message: result.error ?? 'Something went wrong. Please try again.' };
}
