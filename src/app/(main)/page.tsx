import React from 'react';
import { getTours } from '@/lib/supabase/tours';
import { getPublicHotels, getPublicRoomTypesByHotelId } from '@/lib/supabase/hotels';
import { createClient } from '@/lib/supabase/server';
import HomePageClient from './home-client';
import type { Post } from '@/types';
import { toCamelCase } from '@/lib/utils';
import {
  getAgencySettings,
  getHomePageContent,
  getPageMetadata,
} from '@/lib/supabase/agency-content';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return getPageMetadata('home', {
    title: 'Home',
    description: 'Explore tours, experiences, and travel services.',
  });
}

export default async function HomePage() {
  const supabase = await createClient();

  // Fetch home page content
  const homeContent = await getHomePageContent();
  const settings = await getAgencySettings();

  // Fetch posts/articles from Supabase
  // Try 'articles' first, if not found (error), try 'posts'
  // Actually, based on investigation, 'articles' table doesn't exist, 'posts' exists but is empty.
  // So we'll fetch from 'posts'.
  const { data: postsData } = await supabase
    .from('posts')
    .select('*')
    .eq('status', 'Published')
    .order('created_at', { ascending: false })
    .limit(3);

  const articles = (postsData as unknown as object[])?.map((p) => toCamelCase(p) as Post) ?? [];

  if (!homeContent) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="rounded-2xl border bg-card p-8 text-center">
          <h1 className="font-headline text-3xl font-bold">Home page not configured</h1>
          <p className="mt-2 text-muted-foreground">
            Add home page content in the admin panel to publish this page.
          </p>
        </div>
      </div>
    );
  }

  const popularCount =
    typeof homeContent.popularDestinations?.count === 'number'
      ? homeContent.popularDestinations.count
      : 0;
  const offersCount =
    typeof homeContent.lastMinuteOffers?.count === 'number'
      ? homeContent.lastMinuteOffers.count
      : 0;
  const toursLimit = Math.max(popularCount || 0, offersCount || 0);

  const initialTours = await getTours({ limit: toursLimit > 0 ? toursLimit : undefined });
  const hotels = await getPublicHotels();

  // Fetch room types for single-hotel mode (first active hotel's rooms)
  const roomTypes =
    hotels.length > 0 ? await getPublicRoomTypesByHotelId(hotels[0].id).catch(() => []) : [];

  return (
    <HomePageClient
      initialTours={initialTours}
      hotels={hotels}
      roomTypes={roomTypes}
      homeContent={homeContent}
      articles={articles}
      tourDestinations={settings?.data?.tourDestinations ?? []}
      tourCategories={settings?.data?.tourCategories ?? []}
      settings={settings?.data || null}
    />
  );
}
