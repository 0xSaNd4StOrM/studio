'use server';

import { createClient } from '@/lib/supabase/server';
import type { UpsellItem } from '@/types';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// Helper function to convert snake_case to camelCase
function toCamelCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(v => toCamelCase(v));
  }
  if (obj !== null && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = key.replace(/_([a-z])/g, g => g[1].toUpperCase());
      result[camelKey] = toCamelCase(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
}

export async function getUpsellItems(): Promise<UpsellItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('upsell_items')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching upsell items:', error);
    return [];
  }
  return data.map(toCamelCase) as UpsellItem[];
}

export async function getUpsellItemById(id: string): Promise<UpsellItem | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('upsell_items')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching upsell item by ID ${id}:`, error);
    return null;
  }
  if (!data) return null;

  return toCamelCase(data) as UpsellItem;
}

export async function addUpsellItem(formData: Omit<UpsellItem, 'id' | 'createdAt'>) {
  const supabase = createClient();

  const { error } = await supabase
    .from('upsell_items')
    .insert({
      name: formData.name,
      description: formData.description,
      price: formData.price,
      type: formData.type,
      related_tour_id: formData.relatedTourId,
      is_active: formData.isActive,
    });

  if (error) {
    console.error('Error adding upsell item:', error);
    throw new Error('Failed to add upsell item.');
  }

  revalidatePath('/admin/upsell-items');
  redirect('/admin/upsell-items');
}

export async function updateUpsellItem(id: string, formData: Omit<UpsellItem, 'id' | 'createdAt'>) {
  const supabase = createClient();

  const { error } = await supabase
    .from('upsell_items')
    .update({
      name: formData.name,
      description: formData.description,
      price: formData.price,
      type: formData.type,
      related_tour_id: formData.relatedTourId,
      is_active: formData.isActive,
    })
    .eq('id', id);

  if (error) {
    console.error('Error updating upsell item:', error);
    throw new Error('Failed to update upsell item.');
  }

  revalidatePath('/admin/upsell-items');
  redirect('/admin/upsell-items');
}

export async function deleteUpsellItem(id: string) {
  const supabase = createClient();

  const { error } = await supabase
    .from('upsell_items')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting upsell item:', error);
    throw new Error('Failed to delete upsell item.');
  }

  revalidatePath('/admin/upsell-items');
}