import React from "react";
import { getTours } from "@/lib/supabase/tours";
import { createClient } from "@/lib/supabase/server";
import HomePageClient from "./home-client";
import { browseCategoryIconKeys } from "@/types";
import type { BrowseCategoryItem, HomeContent, Post } from "@/types";

const defaultBrowseCategories: BrowseCategoryItem[] = [
  { label: "Adventure", type: "adventure", icon: "mountain" },
  { label: "Relaxation", type: "relaxation", icon: "sailboat" },
  { label: "Cultural", type: "cultural", icon: "building2" },
  { label: "Culinary", type: "culinary", icon: "utensils" },
  { label: "Family", type: "family", icon: "ferrisWheel" },
  { label: "Honeymoon", type: "honeymoon", icon: "plane" },
];

const browseCategoryIconKeySet = new Set<string>(browseCategoryIconKeys);

function normalizeBrowseCategoryItem(value: unknown): BrowseCategoryItem | null {
  if (typeof value !== "object" || value === null) return null;
  const obj = value as Record<string, unknown>;

  const label = typeof obj.label === "string" ? obj.label : null;
  const type = typeof obj.type === "string" ? obj.type : null;
  if (!label || !type) return null;

  const icon =
    typeof obj.icon === "string" && browseCategoryIconKeySet.has(obj.icon)
      ? (obj.icon as BrowseCategoryItem["icon"])
      : "mountain";

  return { label, type, icon };
}

function normalizeBrowseCategories(value: unknown): BrowseCategoryItem[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const normalized = value
    .map((v) => normalizeBrowseCategoryItem(v))
    .filter((v): v is BrowseCategoryItem => v != null);
  return normalized.length > 0 ? normalized : undefined;
}

const defaultContent: HomeContent = {
  hero: {
    title: "Let's Make Your Best<br />Trip With Us",
    subtitle:
      "Explore the world with our curated travel packages. Adventure awaits!",
    imageUrl: "https://placehold.co/1920x1080.png",
    imageAlt: "Ancient Egyptian temples",
  },
  whyChooseUs: {
    pretitle: "Why Choose Us",
    title: "Great Opportunity For<br/>Adventure & Travels",
    imageUrl:
      "https://images.unsplash.com/photo-1699115823831-cf1329dfc58f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw4fHxhZHZlbnR1cmUlMjB0cmF2ZWx8ZW58MHx8fHwxNzUyNjIyOTA5fDA&ixlib=rb-4.1.0&q=80&w=1080",
    imageAlt: "Adventure travel",
    badgeValue: "25+",
    badgeLabel: "Years Of Experience",
    feature1: {
      title: "Safety First",
      description:
        "We prioritize your safety to ensure you have a worry-free and memorable experience.",
    },
    feature2: {
      title: "Professional Guide",
      description:
        "Our guides are local experts who bring destinations to life with their passion and knowledge.",
    },
    feature3: {
      title: "Exclusive Trip",
      description:
        "We offer unique itineraries and exclusive access to create once-in-a-lifetime journeys.",
    },
  },
  browseCategory: {
    title: "Browse By Destination Category",
    subtitle: "Select a category to see our exclusive tour packages",
    categories: defaultBrowseCategories,
  },
  popularDestinations: {
    pretitle: "Top Destinations",
    title: "Popular Tours We Offer",
    count: 6,
  },
  discountBanners: {
    banner1: {
      title: "35% OFF",
      description: "Explore The World tour Hotel Booking.",
    },
    banner2: {
      title: "35% OFF",
      description: "On Flight Ticket Grab This Now.",
    },
  },
  lastMinuteOffers: {
    discount: "50%",
    pretitle: "Deals & Offers",
    title: "Incredible Last-Minute Offers",
    count: 4,
  },
  testimonials: [
    {
      id: "1",
      name: "Brooklyn Simmons",
      role: "Brooklyn Simmons",
      avatar: "https://placehold.co/100x100.png",
      content: "Praesent ut lacus a velit tincidunt aliquam a eget urna. Sed ullamcorper tristique nisl at pharetra turpis accumsan et etiam eu sollicitudin eros. In imperdiet accumsan.",
    },
    {
      id: "2",
      name: "Kristin Watson",
      role: "Web Designer",
      avatar: "https://placehold.co/100x100.png",
      content: "Praesent ut lacus a velit tincidunt aliquam a eget urna. Sed ullamcorper tristique nisl at pharetra turpis accumsan et etiam eu sollicitudin eros. In imperdiet accumsan.",
    },
    {
      id: "3",
      name: "Wade Warren",
      role: "President Of Sales",
      avatar: "https://placehold.co/100x100.png",
      content: "Praesent ut lacus a velit tincidunt aliquam a eget urna. Sed ullamcorper tristique nisl at pharetra turpis accumsan et etiam eu sollicitudin eros. In imperdiet accumsan.",
    },
  ],
  testimonialCount: 6,
  videoSection: {
    pretitle: "Watch Our Story",
    title: "We Provide The Best Tour Facilities",
    backgroundImageUrl: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
    button1Text: "Find Out More",
    button1Link: "/tours",
    button2Text: "Watch Video",
    button2Link: "#",
  },
  newsSection: {
    pretitle: "News & Updates",
    title: "Our Latest News & Articles",
    count: 3,
  },
  visibility: {
    hero: true,
    browseCategory: true,
    whyChooseUs: true,
    popularDestinations: true,
    discountBanners: true,
    lastMinuteOffers: true,
    testimonials: true,
    videoSection: true,
    newsSection: true,
  },
};

export default async function HomePage() {
  const supabase = await createClient();

  // Fetch home page content from Supabase
  const { data: homePageData } = await supabase
    .from("home_page_content")
    .select("data")
    .eq("id", 1)
    .single();
    
  // Fetch posts/articles from Supabase
  // Try 'articles' first, if not found (error), try 'posts'
  // Actually, based on investigation, 'articles' table doesn't exist, 'posts' exists but is empty.
  // So we'll fetch from 'posts'.
  const { data: postsData } = await supabase
    .from("posts")
    .select("*")
    .eq("status", "Published")
    .order("createdAt", { ascending: false })
    .limit(3);

  const articles = (postsData as unknown as Post[]) || [];

  const dbContent = (homePageData?.data ?? {}) as Partial<typeof defaultContent>;

  const homeContent: HomeContent = homePageData?.data
    ? {
        ...defaultContent,
        ...dbContent,
        hero: { ...defaultContent.hero, ...(dbContent.hero || {}) },
        whyChooseUs: {
          ...defaultContent.whyChooseUs,
          ...(dbContent.whyChooseUs || {}),
          feature1: {
            ...defaultContent.whyChooseUs.feature1,
            ...(dbContent.whyChooseUs?.feature1 || {}),
          },
          feature2: {
            ...defaultContent.whyChooseUs.feature2,
            ...(dbContent.whyChooseUs?.feature2 || {}),
          },
          feature3: {
            ...defaultContent.whyChooseUs.feature3,
            ...(dbContent.whyChooseUs?.feature3 || {}),
          },
        },
        browseCategory: {
          ...defaultContent.browseCategory!,
          ...(dbContent.browseCategory || {}),
          title:
            typeof dbContent.browseCategory?.title === "string" &&
            dbContent.browseCategory.title.trim().length > 0
              ? dbContent.browseCategory.title
              : defaultContent.browseCategory!.title,
          subtitle:
            typeof dbContent.browseCategory?.subtitle === "string" &&
            dbContent.browseCategory.subtitle.trim().length > 0
              ? dbContent.browseCategory.subtitle
              : defaultContent.browseCategory!.subtitle,
          categories:
            normalizeBrowseCategories(dbContent.browseCategory?.categories) ??
            defaultContent.browseCategory!.categories,
        },
        popularDestinations: {
          ...defaultContent.popularDestinations!,
          ...(dbContent.popularDestinations || {}),
        },
        discountBanners: {
          ...defaultContent.discountBanners,
          ...(dbContent.discountBanners || {}),
          banner1: {
            ...defaultContent.discountBanners.banner1,
            ...(dbContent.discountBanners?.banner1 || {}),
          },
          banner2: {
            ...defaultContent.discountBanners.banner2,
            ...(dbContent.discountBanners?.banner2 || {}),
          },
        },
        lastMinuteOffers: {
          ...defaultContent.lastMinuteOffers,
          ...(dbContent.lastMinuteOffers || {}),
        },
        videoSection: {
          ...defaultContent.videoSection,
          ...(dbContent.videoSection || {}),
        },
        newsSection: {
          ...defaultContent.newsSection,
          ...(dbContent.newsSection || {}),
        },
        visibility: {
          ...defaultContent.visibility,
          ...(dbContent.visibility || {}),
        },
      }
    : defaultContent;

  const popularCount =
    homeContent.popularDestinations?.count ??
    defaultContent.popularDestinations?.count ??
    0;
  const offersCount = homeContent.lastMinuteOffers?.count ?? defaultContent.lastMinuteOffers.count;
  const toursLimit = Math.max(popularCount || 0, offersCount || 0);

  const initialTours = await getTours({ limit: toursLimit > 0 ? toursLimit : undefined });

  return (
    <HomePageClient 
      initialTours={initialTours} 
      homeContent={homeContent}
      articles={articles}
    />
  );
}
