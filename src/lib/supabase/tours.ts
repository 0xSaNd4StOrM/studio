'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/agency-users';
import type { Tour } from '@/types';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { toCamelCase } from '@/lib/utils';
import { getCurrentAgencyId } from '@/lib/supabase/agencies';

type GetToursOptions = {
  q?: string;
  destination?: string;
  type?: string; // matches tour categories (tour.type array)
  limit?: number;
};

function ensureTourDefaults(tour: Tour): Tour {
  return {
    ...tour,
    images: tour.images || [],
    type: tour.type || [],
    itinerary: tour.itinerary || [],
    priceTiers: tour.priceTiers || [],
    packages: tour.packages || [],
    highlights: tour.highlights || [],
    includes: tour.includes || [],
    excludes: tour.excludes || [],
  };
}

export async function getTours(options: GetToursOptions = {}): Promise<Tour[]> {
  const { q, destination, type, limit } = options;
  const supabase = await createClient();
  const agencyId = await getCurrentAgencyId();

  let query = supabase.from('tours').select('*').eq('agency_id', agencyId);

  if (q && q.trim()) {
    // Search in name (and optionally description)
    query = query.ilike('name', `%${q.trim()}%`);
  }
  if (destination && destination.trim()) {
    query = query.ilike('destination', destination.trim());
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
  return (data as any[]).map((item) => ensureTourDefaults(toCamelCase(item) as Tour));
}

export async function getTourBySlug(slug: string): Promise<Tour | null> {
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

  return ensureTourDefaults(toCamelCase(data) as Tour);
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
    ...rest
  } = formData;
  const dbData = {
    ...rest,
    images: imageUrls.length > 0 ? imageUrls : rest.images, // Use new URLs or keep old ones if no new files were uploaded
    price_tiers: priceTiers,
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
    ...rest
  } = formData;
  const dbData = {
    ...rest,
    images: imageUrls.length > 0 ? imageUrls : rest.images, // Use new URLs or keep old ones if no new files were uploaded
    price_tiers: priceTiers,
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

  // 4. Revalidate and redirect
  revalidatePath('/admin/tours');
  revalidatePath('/'); // Revalidate homepage
  revalidatePath('/tours'); // Revalidate tours page
  redirect('/admin/tours');
}
