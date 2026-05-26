import { generateStructuredWithCopilot } from '@/lib/ai/copilot';
import { TourInputSchema, TourOutputSchema } from '@/types/tour-schemas';
import { z } from 'zod';

export { TourInputSchema, TourOutputSchema };

export type GenerateTourInput = z.infer<typeof TourInputSchema>;
export type GenerateTourOutput = z.infer<typeof TourOutputSchema>;

export async function generateTourFlow(input: GenerateTourInput): Promise<GenerateTourOutput> {
  const validatedInput = TourInputSchema.parse(input);

  return generateStructuredWithCopilot({
    feature: 'tour-generation',
    schema: TourOutputSchema,
    systemPrompt:
      'You are an expert travel planner for Egypt itineraries. Return strict JSON only. The JSON MUST match the exact schema below — do not rename, omit, or add fields.',
    userPrompt: `Create a personalized tour package for the following traveler.

INPUT
- Travel Dates: ${validatedInput.travelDates.arrival} to ${validatedInput.travelDates.departure}
- Regions: ${validatedInput.region.join(', ')}
- Duration: ${validatedInput.duration} days
- Participants: ${validatedInput.participants}
- Accommodation: ${validatedInput.accommodation}
- Budget: ${validatedInput.budget.amount} ${validatedInput.budget.currency} per person
- Requested Inclusions: ${validatedInput.inclusions.join(', ')}
- Interests: ${validatedInput.interests.join(', ')}
- Custom Preferences: ${validatedInput.customPreferences || 'None'}

OUTPUT SCHEMA — every field is REQUIRED. Return JSON exactly matching this shape:
{
  "tourName": string,                    // marketing-friendly name for the package
  "summary": string,                     // 2-3 sentence overview
  "totalPrice": number,                  // total price for ALL participants combined, as a number
  "currency": string,                    // 3-letter code, e.g. "USD"
  "itinerary": [
    {
      "day": number,                     // 1-indexed
      "title": string,                   // short title for the day
      "description": string,             // 1-2 sentence overview of the day
      "activities": string[],            // 3-5 concrete activities
      "accommodation": string,           // where they sleep that night, or "Overnight flight"/"Departure" when applicable
      "meals": string[]                  // e.g. ["Breakfast","Lunch","Dinner"] — list only the meals included
    }
  ],
  "inclusions": string[],                // what the price covers
  "exclusions": string[],                // what the price does NOT cover
  "transportationDetails": string        // 1-2 sentences on transfers, flights, drivers, etc.
}

RULES
- Itinerary length MUST equal ${validatedInput.duration}.
- Use realistic Egypt pricing; totalPrice is a NUMBER, not a string with a currency symbol.
- Keep every string field non-empty.
- Return ONLY the JSON object — no prose, no markdown fences.`,
    temperature: 0.6,
  });
}
