'use server';

import { ai } from '@/ai/genkit';
import { suggestAlternativeTours } from '@/ai/flows/suggest-alternative-tours';
import { generateBlogPost } from '@/ai/flows/generate-blog-post';
import { generateTourFlow } from '@/ai/flows/generateTour';
import { createClient } from '@/lib/supabase/server';
import { TourInputSchema, TourOutput } from '@/types/tour-schemas';
import { z as genkitZ } from 'genkit';
import { z } from 'zod';

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
        message: validatedInput.error.errors[0].message,
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

// For AI Blog Post Generation
const BlogPostActionInputSchema = z.object({
  topic: z.string().min(5, { message: 'Please enter a topic with at least 5 characters.' }),
  keywords: z.string().optional(),
});

type BlogPostState = {
  message: string;
  content: string;
};

export async function generateBlogPostAction(
  prevState: BlogPostState,
  formData: FormData
): Promise<BlogPostState> {
  try {
    const rawInput = {
      topic: formData.get('topic') as string,
      keywords: formData.get('keywords') as string,
    };

    const validatedInput = BlogPostActionInputSchema.safeParse(rawInput);

    if (!validatedInput.success) {
      return { message: validatedInput.error.errors[0].message, content: '' };
    }

    const result = await generateBlogPost(validatedInput.data);

    if (!result.content) {
      return {
        message: 'Could not generate content based on the topic.',
        content: '',
      };
    }

    return { message: 'Success', content: result.content };
  } catch (error) {
    console.error(error);
    return {
      message: 'An unexpected error occurred. Please try again.',
      content: '',
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
    // Validate input
    const validatedInput = TourInputSchema.parse(input);

    // Call Genkit Flow
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

const SeoAssistOutputSchema = genkitZ.object({
  title: genkitZ.string(),
  description: genkitZ.string(),
  keywords: genkitZ.string(),
});

export type SeoAssistResult = genkitZ.infer<typeof SeoAssistOutputSchema>;

export async function generateSeoAssistAction(
  input: z.infer<typeof SeoAssistInputSchema>
): Promise<{
  success: boolean;
  data?: SeoAssistResult;
  message?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    const validated = SeoAssistInputSchema.safeParse(input);
    if (!validated.success) {
      return { success: false, message: validated.error.errors[0]?.message ?? 'Invalid input.' };
    }

    const scopeLabel =
      validated.data.scope === 'site' ? 'Site Defaults' : `${validated.data.scope} Page`;
    const prompt = `You are an SEO expert for a travel agency website.

Generate SEO metadata based on the user's request.

Requirements:
- title: <= 60 characters, clear and compelling.
- description: <= 160 characters, natural and not stuffed.
- keywords: comma-separated list, 8 to 12 items, no duplicates.

Context:
- Scope: ${scopeLabel}
- Agency Name: ${validated.data.agencyName ?? ''}
- Site Name: ${validated.data.siteName ?? ''}
- Existing Title: ${validated.data.existingTitle ?? ''}
- Existing Description: ${validated.data.existingDescription ?? ''}
- Existing Keywords: ${validated.data.existingKeywords ?? ''}

User request: ${validated.data.prompt}`;

    const { output } = await ai.generate({
      prompt,
      output: { schema: SeoAssistOutputSchema },
    });

    if (!output) {
      return { success: false, message: 'Failed to generate SEO content.' };
    }

    return { success: true, data: output };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to generate SEO content.',
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
