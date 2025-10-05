'use client'

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getTours } from '@/lib/supabase/tours';
import { TourCard } from '@/components/tour-card';
import type { Tour } from '@/types';

export default function SearchResultsPage() {
  return (
    <Suspense fallback={<div>Loading search results...</div>}>
      <SearchResultsContent />
    </Suspense>
  );
}

async function SearchResultsContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const destination = searchParams.get('destination') || '';
  const type = searchParams.get('type') || '';

  const tours = await getTours();

  const filteredTours = tours.filter(tour => {
    const matchesQuery = query ? tour.name?.toLowerCase().includes(query.toLowerCase()) : true;
    const matchesDestination = destination ? tour.destination?.toLowerCase() === destination.toLowerCase() : true;
    const matchesType = type ? tour.tourType?.toLowerCase() === type.toLowerCase() : true;
    return matchesQuery && matchesDestination && matchesType;
  });

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Search Results</h1>
      <div className="mb-8">
        <p className="text-lg">Showing results for:</p>
        <ul className="list-disc list-inside">
          {query && <li>Query: <strong>{query}</strong></li>}
          {destination && <li>Destination: <strong>{destination}</strong></li>}
          {type && <li>Type: <strong>{type}</strong></li>}
        </ul>
      </div>

      {filteredTours.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTours.map(tour => (
            <TourCard key={tour.id} tour={tour} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <h2 className="text-2xl font-semibold mb-4">No Tours Found</h2>
          <p className="text-muted-foreground">We couldn't find any tours matching your search criteria. Try broadening your search.</p>
        </div>
      )}
    </div>
  );
}
