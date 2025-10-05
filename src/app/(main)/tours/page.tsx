'use client'

import React from 'react';
import { getTours } from '@/lib/tours';
import { TourCard } from '@/components/tour-card';

export default function AllToursPage() {
  const tours = getTours();

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold font-headline mb-8 text-center">Explore All Tours</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {tours.map(tour => (
          <TourCard key={tour.id} tour={tour} />
        ))}
      </div>
    </div>
  );
}
