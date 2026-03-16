'use server';

import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getCurrentAgencyId } from '@/lib/supabase/agencies';
import { redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function checkAgencyAccess() {
  const supabase = await createClient();
  const agencyId = await getCurrentAgencyId();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false; // Not logged in
  }

  // Check if user is a member of this agency
  const { data, error } = await supabase
    .from('agency_users')
    .select('role')
    .eq('user_id', user.id)
    .eq('agency_id', agencyId)
    .maybeSingle();

  if (error || !data) {
    console.warn(`User ${user.id} attempted to access agency ${agencyId} without permission.`);
    return false;
  }

  return true;
}

export async function ensureAgencyAccess() {
  const hasAccess = await checkAgencyAccess();
  if (!hasAccess) {
    redirect('/');
  }
}

/**
 * Returns a service-role Supabase client after verifying that the
 * current user is an authenticated member of the current agency.
 * Use this for admin write operations so they are not blocked by RLS
 * while still being protected by application-level access control.
 */
export async function createAdminClient(): Promise<SupabaseClient> {
  const supabase = await createClient();
  const agencyId = await getCurrentAgencyId();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized: not authenticated.');
  }

  const { data, error } = await supabase
    .from('agency_users')
    .select('role')
    .eq('user_id', user.id)
    .eq('agency_id', agencyId)
    .maybeSingle();

  if (error || !data) {
    throw new Error('Unauthorized: not a member of this agency.');
  }

  return createServiceRoleClient();
}
