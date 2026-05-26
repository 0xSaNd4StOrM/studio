"use server";

import { generateStructuredWithCopilot } from '@/lib/ai/copilot';
import { z } from 'zod';

const SuggestAlternativeToursInputSchema = z.object({
  tourDescriptions: z
    .array(z.string())
    .describe('A list of descriptions of tours currently in the shopping cart.'),
});
export type SuggestAlternativeToursInput = z.infer<typeof SuggestAlternativeToursInputSchema>;

const SuggestAlternativeToursOutputSchema = z.object({
  alternativeTours: z
    .array(z.string())
    .describe('A list of suggested alternative tours based on the cart content.'),
});
export type SuggestAlternativeToursOutput = z.infer<typeof SuggestAlternativeToursOutputSchema>;

export async function suggestAlternativeTours(
  input: SuggestAlternativeToursInput
): Promise<SuggestAlternativeToursOutput> {
  const validatedInput = SuggestAlternativeToursInputSchema.parse(input);

  return generateStructuredWithCopilot({
    feature: 'cart-suggestions',
    schema: SuggestAlternativeToursOutputSchema,
    systemPrompt:
      'You are a travel recommendation assistant. Return valid JSON matching the output schema.',
    userPrompt: `Given the tours below, suggest exactly 4 alternative tour ideas. Keep each suggestion concise and specific.

Tours in cart:
${validatedInput.tourDescriptions.map((description) => `- ${description}`).join('\n')}`,
    temperature: 0.6,
  });
}
