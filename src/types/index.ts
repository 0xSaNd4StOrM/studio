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

export type UpsellVariant = {
  id?: string;
  name: string;
  price: number;
};

export type UpsellTargeting = {
  match?: "any" | "all";
  destinations?: string[];
  tourIds?: string[];
};

export type UpsellItem = {
  id: string;
  name: string;
  description?: string;
  price: number;
  variants?: UpsellVariant[];
  targeting?: UpsellTargeting | null;
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
    packages?: TourPackage[];
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
  paymentMethod?: "cash" | "online";
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

export const browseCategoryIconKeys = [
  "mountain",
  "sailboat",
  "building2",
  "utensils",
  "ferrisWheel",
  "plane",
] as const;

export type BrowseCategoryIconKey = (typeof browseCategoryIconKeys)[number];

export type BrowseCategoryItem = {
  label: string;
  type: string;
  icon: BrowseCategoryIconKey;
};

export type Testimonial = {
  id: string;
  name: string;
  role: string;
  content?: string;
  text?: string;
  avatar: string;
  rating?: number;
};

export type HeroSection = {
  imageUrl: string;
  imageAlt: string;
  title: string;
  subtitle: string;
};

export type Feature = {
  title: string;
  description: string;
};

export type BrowseCategorySection = {
  title: string;
  subtitle: string;
  categories?: BrowseCategoryItem[];
};

export type WhyChooseUsSection = {
  pretitle: string;
  title: string;
  imageUrl?: string;
  imageAlt?: string;
  badgeValue?: string;
  badgeLabel?: string;
  feature1: Feature;
  feature2: Feature;
  feature3: Feature;
};

export type PopularDestinationsSection = {
  pretitle: string;
  title: string;
  count?: number;
};

export type DiscountBanner = {
  title: string;
  description: string;
  imageUrl?: string;
  buttonText?: string;
  buttonLink?: string;
};

export type DiscountBannersSection = {
  banner1: DiscountBanner;
  banner2: DiscountBanner;
};

export type LastMinuteOffersSection = {
  discount: string;
  pretitle: string;
  title: string;
  count?: number;
};

export type VideoSection = {
  pretitle: string;
  title: string;
  backgroundImageUrl?: string;
  button1Text?: string;
  button1Link?: string;
  button2Text?: string;
  button2Link?: string;
};

export type NewsSection = {
  pretitle: string;
  title: string;
  count?: number;
};

export type HomeContent = {
  testimonials?: Testimonial[];
  testimonialCount?: number;
  hero: HeroSection;
  browseCategory?: BrowseCategorySection;
  whyChooseUs: WhyChooseUsSection;
  popularDestinations?: PopularDestinationsSection;
  discountBanners: DiscountBannersSection;
  lastMinuteOffers: LastMinuteOffersSection;
  videoSection: VideoSection;
  newsSection: NewsSection;
  visibility?: {
    hero?: boolean;
    browseCategory?: boolean;
    whyChooseUs?: boolean;
    popularDestinations?: boolean;
    discountBanners?: boolean;
    lastMinuteOffers?: boolean;
    testimonials?: boolean;
    videoSection?: boolean;
    newsSection?: boolean;
  };
};

export type ContactMessageStatus = "new" | "read" | "archived";

export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  message: string;
  status: ContactMessageStatus;
  createdAt: string;
};
