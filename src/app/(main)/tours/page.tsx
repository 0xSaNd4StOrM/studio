import { getTours } from '@/lib/supabase/tours';
import { ToursClient } from './tours-client';

export default async function AllToursPage() {
  const tours = await getTours();

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold font-headline mb-8 text-center">Explore All Tours</h1>
      <ToursClient tours={tours} />
    </div>
  );
}