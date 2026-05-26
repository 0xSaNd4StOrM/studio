import { z } from 'zod';
import { TourOutputSchema } from '@/types/tour-schemas';
import type { ChatTool } from './types';
import { zodToJsonSchema } from './zod-to-schema';

// Tool arg shape: the model emits a full revised tour matching the
// TourOutputSchema, plus a short `changeSummary` describing what it
// touched (used both in the assistant's reply and for audit).
//
// Why full replacement rather than a JSON-patch op list:
//   - Models call this tool reliably when the schema is concrete.
//   - The visitor doesn't see the tool args — only the assistant text and
//     the rendered itinerary — so payload size is not user-facing.
//   - We can reject any malformed shape on the server and force the LLM
//     to retry, which the chat loop handles automatically.
//
// A future iteration could add a patch-style mode to keep token usage
// down on long trips; see docs/ai-chat-plan.md section 11.2.
const parameters = z.object({
  changeSummary: z
    .string()
    .min(5)
    .max(400)
    .describe(
      'One-sentence summary of what changed, e.g. "Swapped day 3 shopping for a felucca sunset cruise."'
    ),
  revised: TourOutputSchema.describe(
    'The complete revised itinerary. Include EVERY field of the schema — do not omit days, inclusions, or pricing.'
  ),
});

type ReviseItineraryArgs = z.infer<typeof parameters>;

export const reviseItineraryTool: ChatTool = {
  name: 'reviseItinerary',
  description:
    "Rewrite the visitor's tailor-made itinerary based on their requested change. Always call this when the visitor asks for any modification to days, activities, accommodation, meals, inclusions, pricing, or the overall pace. Echo the full revised itinerary in `revised` and a one-sentence change description in `changeSummary`.",
  parameters,
  jsonSchema: zodToJsonSchema(parameters),
  async handler(rawArgs) {
    const parsed = parameters.safeParse(rawArgs);
    if (!parsed.success) {
      return {
        result: {
          ok: false,
          error: 'invalid_itinerary_shape',
          issues: parsed.error.issues.slice(0, 5).map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        },
      };
    }
    const args: ReviseItineraryArgs = parsed.data;
    // Normalise day numbers: keep them 1-indexed even if the model emitted
    // them out of order. Trim itinerary down to its provided length.
    const normalisedItinerary = [...args.revised.itinerary]
      .sort((a, b) => a.day - b.day)
      .map((day, index) => ({ ...day, day: index + 1 }));

    const finalRevised = {
      ...args.revised,
      itinerary: normalisedItinerary,
    };

    return {
      result: {
        ok: true,
        changeSummary: args.changeSummary,
        days: normalisedItinerary.length,
      },
      clientHint: {
        type: 'replace_itinerary',
        itinerary: finalRevised,
      },
    };
  },
};
