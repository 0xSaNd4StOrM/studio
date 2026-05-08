'use client';

import type { Tour } from '@/types';
import { TourCard, type TourAvailabilityStatus } from '@/components/tour-card';

interface ToursClientProps {
  tours: Tour[];
  availabilityStatusByTourId?: Record<string, TourAvailabilityStatus>;
  compareEnabled?: boolean;
  selectedCompareIds?: string[];
  onToggleCompare?: (tourId: string) => void;
  compareLimit?: number;
}

export function ToursClient({
  tours,
  availabilityStatusByTourId,
  compareEnabled = false,
  selectedCompareIds = [],
  onToggleCompare,
  compareLimit = 3,
}: ToursClientProps) {
  const limitReached = selectedCompareIds.length >= compareLimit;
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8 xl:grid-cols-4">
      {tours.map((tour, idx) => {
        const selected = selectedCompareIds.includes(tour.id);
        return (
          <TourCard
            key={tour.id}
            tour={tour}
            index={idx}
            availabilityStatus={availabilityStatusByTourId?.[tour.id]}
            compareEnabled={compareEnabled}
            compareSelected={selected}
            onToggleCompare={onToggleCompare}
            compareDisabled={limitReached}
          />
        );
      })}
    </div>
  );
}
