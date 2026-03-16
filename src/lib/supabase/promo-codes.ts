'use server';

import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/agency-users';
import { getCurrentAgencyId } from '@/lib/supabase/agencies';
import type { PromoCode } from '@/types';
import { toCamelCase } from '@/lib/utils';
import { revalidatePath } from 'next/cache';

type DbPromoCode = {
  id: string;
  agency_id: string;
  code: string;
  type: string;
  value: number;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  starts_at: string | null;
  expires_at: string | null;
  usage_limit: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
  usage_count: number;
};

export async function getPromoCodes(): Promise<PromoCode[]> {
  const supabase = await createClient();
  const agencyId = await getCurrentAgencyId();

  const { data, error } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching promo codes:', error);
    return [];
  }

  return (data as DbPromoCode[]).map((row) => toCamelCase(row) as PromoCode);
}

export async function getPromoCodeById(id: string): Promise<PromoCode | null> {
  const supabase = await createClient();
  const agencyId = await getCurrentAgencyId();

  const { data, error } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('id', id)
    .eq('agency_id', agencyId)
    .single();

  if (error) {
    console.error(`Error fetching promo code ${id}:`, error);
    return null;
  }

  return toCamelCase(data) as PromoCode;
}

export async function createPromoCode(input: Omit<PromoCode, 'id' | 'createdAt' | 'usageCount'>) {
  const supabase = await createAdminClient();
  const agencyId = await getCurrentAgencyId();

  const { error } = await supabase.from('promo_codes').insert({
    agency_id: agencyId,
    code: input.code.toUpperCase(),
    type: input.type,
    value: input.value,
    min_order_amount: input.minOrderAmount ?? 0,
    max_discount_amount: input.maxDiscountAmount,
    starts_at: input.startsAt || null,
    expires_at: input.expiresAt || null,
    usage_limit: input.usageLimit,
    is_active: input.isActive,
  });

  if (error) {
    throw new Error(`Failed to create promo code: ${error.message}`);
  }

  revalidatePath('/admin/promotions');
}

export async function updatePromoCode(
  id: string,
  input: Partial<Omit<PromoCode, 'id' | 'createdAt' | 'usageCount'>>
) {
  const supabase = await createAdminClient();
  const agencyId = await getCurrentAgencyId();

  const updateData: Partial<DbPromoCode> = {};
  if (input.code !== undefined) updateData.code = input.code.toUpperCase();
  if (input.type !== undefined) updateData.type = input.type;
  if (input.value !== undefined) updateData.value = input.value;
  if (input.minOrderAmount !== undefined) updateData.min_order_amount = input.minOrderAmount;
  if (input.maxDiscountAmount !== undefined)
    updateData.max_discount_amount = input.maxDiscountAmount;
  if (input.startsAt !== undefined) updateData.starts_at = input.startsAt || null;
  if (input.expiresAt !== undefined) updateData.expires_at = input.expiresAt || null;
  if (input.usageLimit !== undefined) updateData.usage_limit = input.usageLimit;
  if (input.isActive !== undefined) updateData.is_active = input.isActive;

  updateData.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from('promo_codes')
    .update(updateData)
    .eq('id', id)
    .eq('agency_id', agencyId);

  if (error) {
    throw new Error(`Failed to update promo code: ${error.message}`);
  }

  revalidatePath('/admin/promotions');
}

export async function deletePromoCode(id: string) {
  const supabase = await createAdminClient();
  const agencyId = await getCurrentAgencyId();

  const { error } = await supabase
    .from('promo_codes')
    .delete()
    .eq('id', id)
    .eq('agency_id', agencyId);

  if (error) {
    throw new Error('Failed to delete promo code.');
  }

  revalidatePath('/admin/promotions');
}

export async function validatePromoCode(code: string, cartTotal: number): Promise<PromoCode> {
  const supabase = createServiceRoleClient(); // Use service role to bypass RLS
  const agencyId = await getCurrentAgencyId();
  const normalizedCode = code.toUpperCase().trim();

  const { data, error } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('code', normalizedCode)
    .single();

  if (error || !data) {
    throw new Error('Invalid promo code.');
  }

  const promo = toCamelCase(data) as PromoCode;

  if (!promo.isActive) {
    throw new Error('This promo code is inactive.');
  }

  const now = new Date();
  if (promo.startsAt && new Date(promo.startsAt) > now) {
    throw new Error('This promo code is not active yet.');
  }

  if (promo.expiresAt && new Date(promo.expiresAt) < now) {
    throw new Error('This promo code has expired.');
  }

  if (
    promo.usageLimit !== undefined &&
    promo.usageLimit !== null &&
    promo.usageCount >= promo.usageLimit
  ) {
    throw new Error('This promo code has reached its usage limit.');
  }

  if (promo.minOrderAmount && cartTotal < promo.minOrderAmount) {
    throw new Error(`Minimum order amount of $${promo.minOrderAmount} required.`);
  }

  return promo;
}
