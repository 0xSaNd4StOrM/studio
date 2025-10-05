'use client';

import type { Tour } from '@/types';
import { TourCard } from '@/components/tour-card';

interface ToursClientProps {
  tours: Tour[];
}

export function ToursClient({ tours }: ToursClientProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {tours.map(tour => (
        <TourCard key={tour.id} tour={tour} />
      ))}
    </div>
  );
}
