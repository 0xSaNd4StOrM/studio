
export type PriceTier = {
  minPeople: number;
  maxPeople: number | null; // null for 'and up'
  pricePerAdult: number;
  pricePerChild: number;
};

export type Tour = {
  id: string;
  name: string;
  destination: string;
  type: 'Adventure' | 'Relaxation' | 'Cultural' | 'Culinary' | 'Family' | 'Honeymoon';
  duration: number; // in days
  description: string;
  itinerary: { day: number; activity: string }[];
  availability: boolean;
  image: string;
  rating: number;
  priceTiers: PriceTier[];
  price?: never; // Ensure old price field is not used

  // Detailed tour information
  durationText?: string;
  tourType?: string;
  availabilityDescription?: string;
  pickupAndDropoff?: string;
  includes?: string[];
  excludes?: string[];
};

export type CartItem = {
  tour: Tour;
  quantity: number; // This might represent adults now, or be refactored
  adults?: number;
  children?: number;
};
