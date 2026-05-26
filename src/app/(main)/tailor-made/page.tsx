import React from 'react';
import { redirect } from 'next/navigation';
import { TailorMadePageContent } from './tailor-made-content';
import { Metadata } from 'next';
import { getPageMetadata } from '@/lib/supabase/agency-content';
import { getCurrentAgency } from '@/lib/supabase/agencies';

export async function generateMetadata(): Promise<Metadata> {
  return getPageMetadata('tailorMade', {
    title: 'Tailor Made',
    description: 'Build a custom itinerary based on your dates, preferences, and budget.',
  });
}

export default async function TailorMadePage() {
  const agency = await getCurrentAgency();
  if (!agency?.aiEnabled) {
    redirect('/tours');
  }
  return <TailorMadePageContent />;
}
