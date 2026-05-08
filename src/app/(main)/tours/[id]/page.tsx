import { getTourBySlug } from '@/lib/supabase/tours';
import { notFound } from 'next/navigation';
import { TourDetailsClient } from '@/components/tour-details-client';
import type { Metadata } from 'next';
import { getAgencySettings } from '@/lib/supabase/agency-content';
import { getCurrentAgency } from '@/lib/supabase/agencies';
import { getApprovedReviewsForTour } from '@/lib/supabase/reviews';
import { getPublicTourAvailability } from '@/lib/supabase/tour-availability';
import { getAddonsForTour } from '@/lib/supabase/addons';
import { ReviewForm } from '@/components/review-form';
import { ReviewsDisplay } from '@/components/reviews-display';

interface TourDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params }: TourDetailsPageProps): Promise<Metadata> {
  const { id } = await params;
  const tour = await getTourBySlug(id);

  let brand = 'our agency';
  try {
    const settings = await getAgencySettings();
    const agencyName = settings?.data?.agencyName || '';
    brand = agencyName.trim() || brand;
  } catch {
    brand = brand;
  }

  if (!tour) {
    return {
      title: 'Tour Not Found',
    };
  }

  const description = tour.description?.substring(0, 160) || `Book ${tour.name} with ${brand}.`;

  return {
    title: tour.name,
    description,
    openGraph: {
      title: tour.name,
      description: tour.description?.substring(0, 200) || description,
      images: tour.images && tour.images.length > 0 ? [tour.images[0]] : [],
    },
  };
}

export default async function TourDetailsPage({ params }: TourDetailsPageProps) {
  const { id } = await params;
  // The slug is passed as `id` from the folder name [id]
  const tour = await getTourBySlug(id);

  if (!tour) {
    notFound();
  }

  // Fetch agency + reviews + availability + addons in parallel
  const [agency, reviews, availability, addons] = await Promise.all([
    getCurrentAgency(),
    getApprovedReviewsForTour(tour.id),
    getPublicTourAvailability(tour.id),
    getAddonsForTour({ id: tour.id, destination: tour.destination }),
  ]);

  const reviewsEnabled = agency?.settings?.modules?.reviews !== false;

  return (
    <>
      <TourDetailsClient tour={tour} availability={availability} addons={addons} />
      {reviewsEnabled && (
        <div className="mx-auto w-full max-w-6xl space-y-8 px-4 pb-10">
          <ReviewsDisplay reviews={reviews} title={`Reviews for ${tour.name}`} />
          <ReviewForm agencyId={agency?.id || ''} tourId={tour.id} itemName={tour.name} />
        </div>
      )}
    </>
  );
}
