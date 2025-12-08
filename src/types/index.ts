export type PriceTier = {
  minPeople: number;
  maxPeople: number | null; // null for 'and up'
  pricePerAdult: number;
  pricePerChild: number;
};

export type TourPackage = {
  id: string;
  name: string; // e.g., "Standard", "Luxury"
  description?: string; // e.g., "Includes entry fees and lunch"
  priceTiers: PriceTier[];
};

export type Tour = {
  id: string;
  slug: string;
  name: string;
  destination: string;
  type: string[];
  duration: number; // in days
  description: string;
  itinerary: { day: number; activity: string }[];
  availability: boolean;
  images: string[];
  rating: number;
  priceTiers: PriceTier[]; // Keeping for backward compatibility or default
  packages?: TourPackage[]; // New field for multi-package support
  price?: never; // Ensure old price field is not used

  // Detailed tour information
  durationText?: string;
  tourType?: string;
  availabilityDescription?: string;
  pickupAndDropoff?: string;
  highlights?: string[];
  includes?: string[];
  excludes?: string[];
  cancellationPolicy?: string;
};

export type UpsellItem = {
  id: string;
  name: string;
  description?: string;
  price: number;
  type: "service" | "tour_addon";
  relatedTourId?: string | null; // uuid
  imageUrl?: string; // New: URL for the upsell item image
  isActive: boolean;
  createdAt: string;
};

export type BookingItem = {
  id: string;
  bookingId: string;
  tourId?: string; // Now optional
  upsellItemId?: string; // New: link to upsell item
  packageId?: string; // New: selected package ID
  packageName?: string; // New: selected package name
  adults: number;
  children: number;
  price: number;
  itemDate?: string;
  tours?: {
    // from the join
    name: string;
    slug: string;
  };
  upsellItems?: {
    // New: from the join
    name: string;
    price: number;
  };
};

export type CartItem = {
  product: Tour | UpsellItem;
  productType: "tour" | "upsell";
  packageId?: string; // New: selected package ID
  packageName?: string; // New: selected package name
  adults?: number; // Only for tours
  children?: number; // Only for tours
  date?: Date; // Only for tours
  quantity?: number; // For upsell items, if they can have quantity (e.g., 2 SIM cards)
};

export type Booking = {
  id: string;
  customerName: string;
  customerEmail: string;
  phoneNumber?: string;
  nationality?: string;
  bookingDate: string; // ISO string format for dates
  totalPrice: number;
  status: "Confirmed" | "Pending" | "Cancelled";
  bookingItems: BookingItem[];
};

export type Customer = {
  id: string;
  name: string;
  email: string;
  source: "Booking" | "Newsletter";
  status?: "active" | "inactive";
  totalBookings: number;
  totalSpent: number;
  createdAt: string; // ISO string format for dates
  lastActive?: string;
  bookings: Booking[];
  posts?: Post[];
  avatarUrl?: string;
};

export type Post = {
  id: string;
  slug: string;
  title: string;
  content: string;
  author: string;
  status: "Published" | "Draft";
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  featuredImage: string;
  tags: string[];
};

