'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/agency-users';
import { getCurrentAgencyId } from '@/lib/supabase/agencies';
import { toCamelCase } from '@/lib/utils';
import { revalidatePath } from 'next/cache';
import type { Review } from '@/types';

// ─── Public: Submit a review (no auth required) ────────────────────────────
export async function submitReview(data: {
  agencyId: string;
  tourId?: string;
  hotelId?: string;
  customerName: string;
  customerEmail: string;
  rating: number;
  content: string;
}) {
  const supabase = await createClient();

  const { error } = await supabase.from('reviews').insert({
    agency_id: data.agencyId,
    tour_id: data.tourId || null,
    hotel_id: data.hotelId || null,
    customer_name: data.customerName,
    customer_email: data.customerEmail,
    rating: data.rating,
    content: data.content,
    status: 'pending',
  });

  if (error) {
    console.error('Error submitting review:', error);
    throw new Error('Failed to submit review.');
  }

  // Revalidate detail pages so approved reviews update
  if (data.tourId) revalidatePath(`/tours`);
  if (data.hotelId) revalidatePath(`/hotels`);
}

// ─── Public: Get approved reviews for a tour ───────────────────────────────
export async function getApprovedReviewsForTour(tourId: string): Promise<Review[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('tour_id', tourId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tour reviews:', error);
    return [];
  }

  return (data || []).map(toCamelCase) as Review[];
}

// ─── Public: Get approved reviews for a hotel ──────────────────────────────
export async function getApprovedReviewsForHotel(hotelId: string): Promise<Review[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('hotel_id', hotelId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching hotel reviews:', error);
    return [];
  }

  return (data || []).map(toCamelCase) as Review[];
}

// ─── Admin: Get all reviews for the current agency ─────────────────────────
export async function getReviews(statusFilter?: string): Promise<Review[]> {
  const supabase = await createClient();
  const agencyId = await getCurrentAgencyId();

  let query = supabase
    .from('reviews')
    .select('*, tours(name, slug), hotels(name, slug)')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false });

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching reviews:', error);
    return [];
  }

  return (data || []).map(toCamelCase) as Review[];
}

// ─── Admin: Update review status ───────────────────────────────────────────
export async function updateReviewStatus(reviewId: string, status: 'approved' | 'rejected') {
  const supabase = await createAdminClient();
  const agencyId = await getCurrentAgencyId();

  const { error } = await supabase
    .from('reviews')
    .update({ status })
    .eq('id', reviewId)
    .eq('agency_id', agencyId);

  if (error) {
    console.error('Error updating review status:', error);
    throw new Error('Failed to update review status.');
  }

  revalidatePath('/admin/reviews');
  revalidatePath('/tours');
  revalidatePath('/hotels');
}

// ─── Admin: Delete a review ────────────────────────────────────────────────
export async function deleteReview(reviewId: string) {
  const supabase = await createAdminClient();
  const agencyId = await getCurrentAgencyId();

  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', reviewId)
    .eq('agency_id', agencyId);

  if (error) {
    console.error('Error deleting review:', error);
    throw new Error('Failed to delete review.');
  }

  revalidatePath('/admin/reviews');
}

// ─── Admin: Get review stats ───────────────────────────────────────────────
export async function getReviewStats() {
  const supabase = await createClient();
  const agencyId = await getCurrentAgencyId();

  const { data, error } = await supabase.from('reviews').select('status').eq('agency_id', agencyId);

  if (error) {
    console.error('Error fetching review stats:', error);
    return { total: 0, pending: 0, approved: 0, rejected: 0 };
  }

  const reviews = data || [];
  return {
    total: reviews.length,
    pending: reviews.filter((r) => r.status === 'pending').length,
    approved: reviews.filter((r) => r.status === 'approved').length,
    rejected: reviews.filter((r) => r.status === 'rejected').length,
  };
}
