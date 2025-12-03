import { ai } from "../genkit";
import { TourInputSchema, TourOutputSchema } from "@/types/tour-schemas";

export { TourInputSchema, TourOutputSchema };

export const generateTourFlow = ai.defineFlow(
  {
    name: "generateTour",
    inputSchema: TourInputSchema,
    outputSchema: TourOutputSchema,
  },
  async (input) => {
    const prompt = `
      You are an expert travel agent specializing in Egypt tours.
      Create a personalized tour package based on the following requirements:
      
      - Travel Dates: ${input.travelDates.arrival} to ${input.travelDates.departure}
      - Region: ${input.region.join(", ")}
      - Duration: ${input.duration} days
      - Participants: ${input.participants}
      - Accommodation: ${input.accommodation}
      - Budget: ${input.budget.amount} ${input.budget.currency} (Per Person)
      - Inclusions Requested: ${input.inclusions.join(", ")}
      - Interests: ${input.interests.join(", ")}
      - Custom Preferences/Special Activities: ${input.customPreferences || "None"}

      Generate a detailed itinerary, including:
      1. A catchy Tour Name
      2. A brief Summary
      3. Total Estimated Price (within budget if possible, or explain why not)
      4. Day-by-day itinerary with Title, Description, Activities, Accommodation suggestions, and Meals included.
      5. List of Inclusions and Exclusions.
      6. Transportation details.

      Ensure the response is in valid JSON format matching the output schema.
    `;

    const { output } = await ai.generate({
      prompt,
      output: { schema: TourOutputSchema },
    });

    if (!output) {
      throw new Error("Failed to generate tour");
    }

    return output;
  }
);



