import { z } from "zod";

export const TourInputSchema = z.object({
  travelDates: z.object({
    arrival: z.string(),
    departure: z.string(),
  }),
  region: z.array(z.string()),
  duration: z.number(),
  budget: z.object({
    amount: z.number(),
    currency: z.string(),
  }),
  accommodation: z.enum([
    "3-star hotel accommodation",
    "4-star hotel accommodation",
    "5-star hotel accommodation",
    "Self-booked accommodation"
  ]),
  participants: z.number().min(1).max(20),
  inclusions: z.array(z.string()),
  interests: z.array(z.string()),
  customPreferences: z.string().optional(),
});

export const ItineraryDaySchema = z.object({
  day: z.number(),
  title: z.string(),
  description: z.string(),
  activities: z.array(z.string()),
  accommodation: z.string(),
  meals: z.array(z.string()),
});

export const TourOutputSchema = z.object({
  tourName: z.string(),
  summary: z.string(),
  totalPrice: z.number(),
  currency: z.string(),
  itinerary: z.array(ItineraryDaySchema),
  inclusions: z.array(z.string()),
  exclusions: z.array(z.string()),
  transportationDetails: z.string(),
});

export type TourInput = z.infer<typeof TourInputSchema>;
export type TourOutput = z.infer<typeof TourOutputSchema>;


