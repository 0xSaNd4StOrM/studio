'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/agency-users';
import type { Tour } from '@/types';
import { revalidatePath } from 'next/cache';
import { toCamelCase } from '@/lib/utils';
import { getCurrentAgencyId } from '@/lib/supabase/agencies';
import { getPublicTargetLocale } from '@/lib/translation/get-locale';
import { translateObject, translateObjects } from '@/lib/translation/translate-object';

const TOUR_TRANSLATABLE_FIELDS = [
  'name',
  'destination',
  'destinations[]',
  'description',
  'durationText',
  'tourType',
  'availabilityDescription',
  'pickupAndDropoff',
  'cancellationPolicy',
  'highlights[]',
  'includes[]',
  'excludes[]',
  'itinerary[].activity',
  'packages[].name',
  'packages[].description',
  'type[]',
] as const;

type GetToursOptions = {
  q?: string;
  destination?: string;
  type?: string; // matches tour categories (tour.type array)
  limit?: number;
  skipTranslation?: boolean;
};

function ensureTourDefaults(tour: Tour): Tour {
  // `destinations` is the source of truth post-migration. If a row was
  // written before the migration applied (or a write skipped the array),
  // fall back to wrapping the singular `destination` so consumers see a
  // sane non-empty array.
  //
  // We additionally **clean** the array because an earlier version of the
  // multi-select combobox could spread a stringly-typed value into
  // single-character entries (["L","u","x","o","r","Luxor"]). Any entry
  // shorter than 2 characters can never be a real destination, so drop
  // those; then dedupe to collapse duplicates from compounding bugs.
  const rawDestinations = Array.isArray(tour.destinations)
    ? tour.destinations
    : tour.destinations
      ? [String(tour.destinations)]
      : [];
  const cleaned: string[] = [];
  const seen = new Set<string>();
  for (const entry of rawDestinations) {
    const s = typeof entry === 'string' ? entry.trim() : '';
    if (s.length < 2) continue; // drop single-character spread artifacts
    if (seen.has(s.toLowerCase())) continue; // dedupe case-insensitively
    seen.add(s.toLowerCase());
    cleaned.push(s);
  }
  const destinations =
    cleaned.length > 0
      ? cleaned
      : tour.destination && tour.destination.trim().length >= 2
        ? [tour.destination.trim()]
        : [];
  // Mirror destinations[0] back into the legacy singular so unchanged
  // call sites that read `tour.destination` still see a value.
  const destination =
    destinations.length > 0 ? destinations[0] : (tour.destination ?? '');

  return {
    ...tour,
    destination,
    destinations,
    images: Array.isArray(tour.images) ? tour.images : [],
    type: Array.isArray(tour.type) ? tour.type : [],
    itinerary: Array.isArray(tour.itinerary) ? tour.itinerary : [],
    priceTiers: Array.isArray(tour.priceTiers) ? tour.priceTiers : [],
    packages: Array.isArray(tour.packages) ? tour.packages : [],
    highlights: Array.isArray(tour.highlights) ? tour.highlights : [],
    includes: Array.isArray(tour.includes) ? tour.includes : [],
    excludes: Array.isArray(tour.excludes) ? tour.excludes : [],
    // Guard against null from DB columns — z.string().optional() rejects null
    durationText: tour.durationText ?? '',
    tourType: tour.tourType ?? '',
    availabilityDescription: tour.availabilityDescription ?? '',
    pickupAndDropoff: tour.pickupAndDropoff ?? '',
    cancellationPolicy: tour.cancellationPolicy ?? '',
  };
}

export async function getTours(options: GetToursOptions = {}): Promise<Tour[]> {
  const { q, destination, type, limit, skipTranslation } = options;
  const supabase = await createClient();
  const agencyId = await getCurrentAgencyId();

  let query = supabase.from('tours').select('*').eq('agency_id', agencyId);

  if (q && q.trim()) {
    // Search in name (and optionally description)
    query = query.ilike('name', `%${q.trim()}%`);
  }
  if (destination && destination.trim()) {
    // Match tours that include this destination anywhere in their
    // `destinations` array. The GIN index `idx_tours_destinations_gin`
    // makes this index-backed.
    query = query.contains('destinations', [destination.trim()]);
  }
  if (type && type.trim()) {
    query = query.contains('type', [type.trim()]);
  }
  if (limit != null) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Supabase error fetching tours:', error);
    // Only fallback if specifically requested or strictly needed during dev
    // Ideally, we should throw or return empty array to debug DB issues
    throw error;
  }

  if (!data || data.length === 0) {
    console.log('No tours found in Supabase database.');
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tours = (data as any[]).map((item) => ensureTourDefaults(toCamelCase(item) as Tour));

  if (skipTranslation) return tours;
  const target = await getPublicTargetLocale();
  if (target === 'en') return tours;
  return translateObjects(tours, TOUR_TRANSLATABLE_FIELDS, target);
}

type GetToursPagedOptions = GetToursOptions & {
  offset?: number;
};

export async function getToursPaged(
  options: GetToursPagedOptions = {}
): Promise<{ tours: Tour[]; total: number }> {
  const { q, destination, type, limit, offset = 0, skipTranslation } = options;
  const supabase = await createClient();
  const agencyId = await getCurrentAgencyId();

  let query = supabase.from('tours').select('*', { count: 'exact' }).eq('agency_id', agencyId);

  if (q && q.trim()) {
    query = query.ilike('name', `%${q.trim()}%`);
  }
  if (destination && destination.trim()) {
    // Match tours that include this destination anywhere in their
    // `destinations` array. The GIN index `idx_tours_destinations_gin`
    // makes this index-backed.
    query = query.contains('destinations', [destination.trim()]);
  }
  if (type && type.trim()) {
    query = query.contains('type', [type.trim()]);
  }

  const safeLimit = typeof limit === 'number' && limit > 0 ? limit : 12;
  const safeOffset = Math.max(0, offset);
  query = query.range(safeOffset, safeOffset + safeLimit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Supabase error fetching paged tours:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    return { tours: [], total: count ?? 0 };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tours = (data as any[]).map((item) => ensureTourDefaults(toCamelCase(item) as Tour));

  if (skipTranslation) return { tours, total: count ?? tours.length };
  const target = await getPublicTargetLocale();
  if (target === 'en') return { tours, total: count ?? tours.length };
  const translated = await translateObjects(tours, TOUR_TRANSLATABLE_FIELDS, target);
  return { tours: translated, total: count ?? translated.length };
}

export async function getTourBySlug(
  slug: string,
  options: { skipTranslation?: boolean } = {}
): Promise<Tour | null> {
  const supabase = await createClient();
  const agencyId = await getCurrentAgencyId();

  const { data, error } = await supabase
    .from('tours')
    .select('*')
    .eq('slug', slug)
    .eq('agency_id', agencyId)
    .single();

  if (error) {
    console.error(`Error fetching tour by slug ${slug}:`, error);
    return null;
  }
  if (!data) {
    console.log(`No tour found for slug: ${slug}`);
    return null;
  }

  const tour = ensureTourDefaults(toCamelCase(data) as Tour);
  if (options.skipTranslation) return tour;
  const target = await getPublicTargetLocale();
  if (target === 'en') return tour;
  return translateObject(tour, TOUR_TRANSLATABLE_FIELDS, target);
}

export async function addTour(
  formData: Omit<Tour, 'id' | 'images'> & {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    images: any[];
  }
) {
  const supabase = await createAdminClient();
  const agencyId = await getCurrentAgencyId();

  // 1. Handle image uploads
  const imageUrls: string[] = [];
  if (formData.images && formData.images.length > 0) {
    for (const image of formData.images) {
      const file = image as unknown as File; // We receive File objects from the form
      if (!file.name || !file.size) continue; // Skip empty/invalid file inputs
      const filePath = `public/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage.from('tours').upload(filePath, file);

      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        throw new Error('Failed to upload image.');
      }

      const { data: urlData } = supabase.storage.from('tours').getPublicUrl(filePath);

      imageUrls.push(urlData.publicUrl);
    }
  }

  // 2. Prepare data for database (snake_case)
  const {
    priceTiers,
    packages,
    durationText,
    tourType,
    availabilityDescription,
    pickupAndDropoff,
    cancellationPolicy,
    destination,
    destinations,
    ...rest
  } = formData;
  // Keep the legacy single + new array columns in sync server-side so a
  // client that only sends one of them still produces a consistent row.
  // Also clean: drop single-character spread artifacts and dedupe (defends
  // against the historical Combobox bug, see ensureTourDefaults).
  const rawDestSource = Array.isArray(destinations)
    ? destinations
    : destinations
      ? [String(destinations)]
      : [];
  const cleanedDestSeen = new Set<string>();
  const cleanedDestinations: string[] = [];
  for (const entry of rawDestSource) {
    const s = typeof entry === 'string' ? entry.trim() : '';
    if (s.length < 2) continue;
    const key = s.toLowerCase();
    if (cleanedDestSeen.has(key)) continue;
    cleanedDestSeen.add(key);
    cleanedDestinations.push(s);
  }
  const normalizedDestinations =
    cleanedDestinations.length > 0
      ? cleanedDestinations
      : destination && destination.trim().length >= 2
        ? [destination.trim()]
        : [];
  const normalizedDestination =
    normalizedDestinations[0] ?? destination ?? '';
  const dbData = {
    ...rest,
    destination: normalizedDestination,
    destinations: normalizedDestinations,
    images: imageUrls.length > 0 ? imageUrls : rest.images, // Use new URLs or keep old ones if no new files were uploaded
    // Clear legacy priceTiers when using packages to avoid stale data
    price_tiers: packages && packages.length > 0 ? [] : (priceTiers ?? []),
    packages: packages?.map((p) => ({ ...p, id: p.id || crypto.randomUUID() })) || [],
    duration_text: durationText,
    tour_type: tourType,
    availability_description: availabilityDescription,
    pickup_and_dropoff: pickupAndDropoff,
    cancellation_policy: cancellationPolicy,
    agency_id: agencyId,
  };

  // 3. Insert into database
  const { error: insertError } = await supabase.from('tours').insert(dbData);

  if (insertError) {
    console.error('Error inserting tour:', insertError);
    throw new Error('Failed to create tour.');
  }

  // 4. Revalidate paths (redirect is handled by the client)
  revalidatePath('/admin/tours');
  revalidatePath('/'); // Revalidate homepage
  revalidatePath('/tours'); // Revalidate tours page
}

export async function deleteTour(id: string) {
  // createAdminClient already verifies the user is authenticated and is an
  // agency member before returning the service-role client.
  const supabase = await createAdminClient();
  const agencyId = await getCurrentAgencyId();

  const { error } = await supabase.from('tours').delete().eq('id', id).eq('agency_id', agencyId);

  if (error) {
    console.error('Error deleting tour:', error);
    throw new Error(error.message || 'Failed to delete tour.');
  }

  revalidatePath('/admin/tours');
  revalidatePath('/');
  revalidatePath('/tours');
}

export async function updateTour(id: string, formData: Omit<Tour, 'id'>) {
  const supabase = await createAdminClient();
  const agencyId = await getCurrentAgencyId();

  // 1. Handle image uploads (similar logic as addTour, but consider existing images)
  const imageUrls: string[] = [];
  if (formData.images && formData.images.length > 0) {
    for (const image of formData.images) {
      // If it's a new File object, upload it
      if (typeof image === 'object' && 'name' in image && 'size' in image) {
        const file = image as unknown as File;
        if (!file.name || !file.size) continue;
        const filePath = `public/${Date.now()}-${file.name}`;

        const { error: uploadError } = await supabase.storage.from('tours').upload(filePath, file);

        if (uploadError) {
          console.error('Error uploading image:', uploadError);
          throw new Error('Failed to upload image.');
        }

        const { data: urlData } = supabase.storage.from('tours').getPublicUrl(filePath);

        imageUrls.push(urlData.publicUrl);
      } else if (typeof image === 'string') {
        // If it's an existing URL, keep it
        imageUrls.push(image);
      }
    }
  }

  // 2. Prepare data for database (snake_case)
  const {
    priceTiers,
    packages,
    durationText,
    tourType,
    availabilityDescription,
    pickupAndDropoff,
    cancellationPolicy,
    destination,
    destinations,
    ...rest
  } = formData;
  // Mirror addTour: keep legacy `destination` and new `destinations` array
  // in sync server-side regardless of which the client populated.
  const normalizedDestinations =
    Array.isArray(destinations) && destinations.length > 0
      ? destinations
      : destination
        ? [destination]
        : [];
  const normalizedDestination =
    normalizedDestinations[0] ?? destination ?? '';
  const dbData = {
    ...rest,
    destination: normalizedDestination,
    destinations: normalizedDestinations,
    images: imageUrls.length > 0 ? imageUrls : rest.images, // Use new URLs or keep old ones if no new files were uploaded
    // Clear legacy priceTiers when using packages to avoid stale data
    price_tiers: packages && packages.length > 0 ? [] : (priceTiers ?? []),
    packages: packages?.map((p) => ({ ...p, id: p.id || crypto.randomUUID() })) || [],
    duration_text: durationText,
    tour_type: tourType,
    availability_description: availabilityDescription,
    pickup_and_dropoff: pickupAndDropoff,
    cancellation_policy: cancellationPolicy,
  };

  // 3. Update in database
  const { error: updateError } = await supabase
    .from('tours')
    .update(dbData)
    .eq('id', id)
    .eq('agency_id', agencyId);

  if (updateError) {
    console.error('Error updating tour:', updateError);
    throw new Error('Failed to update tour.');
  }

  // 4. Revalidate paths (redirect is handled by the client)
  revalidatePath('/admin/tours');
  revalidatePath('/'); // Revalidate homepage
  revalidatePath('/tours'); // Revalidate tours page
}
