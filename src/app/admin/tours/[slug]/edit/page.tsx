import { notFound } from 'next/navigation';
import { getTourBySlug } from '@/lib/supabase/tours';
import { TourEditClient } from './tour-edit-client';
import { getAgencySettings } from '@/lib/supabase/agency-content';

export default async function EditTourPage({
  params,
}: {
  params: Promise<{
    slug: string;
  }>;
}) {
  const { slug } = await params;
  const tour = await getTourBySlug(slug, { skipTranslation: true });
  const settings = await getAgencySettings({ skipTranslation: true });

  if (!tour) {
    notFound();
  }

  const categories = settings?.data?.tourCategories ?? [];

  const destinations = settings?.data?.tourDestinations ?? [];

  return <TourEditClient tour={tour} categories={categories} destinations={destinations} />;
}
