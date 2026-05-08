'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/agency-users';
import type { AddonPlacement, UpsellItem } from '@/types';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { toCamelCase } from '@/lib/utils';
import { getCurrentAgencyId } from '@/lib/supabase/agencies';
import { getPublicTargetLocale } from '@/lib/translation/get-locale';
import { translateObject, translateObjects } from '@/lib/translation/translate-object';

const UPSELL_TRANSLATABLE_FIELDS = ['name', 'description', 'variants[].name'] as const;

function emptyPlacement(): AddonPlacement {
  return {
    match: 'any',
    tourIds: [],
    destinations: [],
    roomTypeIds: [],
    hotelIds: [],
    showInCart: true,
  };
}

function ensureUpsellItemDefaults(item: UpsellItem): UpsellItem {
  const placement: AddonPlacement = {
    match: item.placement?.match ?? 'any',
    tourIds: Array.isArray(item.placement?.tourIds) ? item.placement.tourIds : [],
    destinations: Array.isArray(item.placement?.destinations) ? item.placement.destinations : [],
    roomTypeIds: Array.isArray(item.placement?.roomTypeIds) ? item.placement.roomTypeIds : [],
    hotelIds: Array.isArray(item.placement?.hotelIds) ? item.placement.hotelIds : [],
    showInCart: item.placement?.showInCart !== false,
  };
  // Synthesize legacy `targeting` from placement so cart code that branches
  // on `targeting` keeps working until every consumer migrates over.
  const synthesizedTargeting =
    placement.tourIds.length > 0 || placement.destinations.length > 0
      ? {
          match: placement.match,
          tourIds: placement.tourIds,
          destinations: placement.destinations,
        }
      : (item.targeting ?? null);

  return {
    ...item,
    isActive: item.isActive ?? false,
    price: item.price ?? 0,
    variants: (item.variants ?? []).map((variant) => ({
      ...variant,
      id: variant.id ?? variant.name,
    })),
    targeting: synthesizedTargeting,
    pricingMode: item.pricingMode ?? 'flat',
    quantityMode: item.quantityMode ?? 'none',
    minPax: item.minPax ?? null,
    maxPax: item.maxPax ?? null,
    minHours: item.minHours ?? null,
    maxHours: item.maxHours ?? null,
    defaultHours: item.defaultHours ?? null,
    currency: item.currency ?? 'USD',
    sortOrder: item.sortOrder ?? 0,
    placement,
  };
}

function normalizeVariants(variants: UpsellItem['variants'] | undefined) {
  return (variants ?? []).map((variant) => ({
    ...variant,
    id: variant.id || crypto.randomUUID(),
  }));
}

function normalizePlacement(placement: AddonPlacement | undefined | null): AddonPlacement {
  if (!placement) return emptyPlacement();
  return {
    match: placement.match === 'all' ? 'all' : 'any',
    tourIds: (placement.tourIds ?? []).filter((v) => typeof v === 'string' && v.length > 0),
    destinations: (placement.destinations ?? []).filter(
      (v) => typeof v === 'string' && v.length > 0
    ),
    roomTypeIds: (placement.roomTypeIds ?? []).filter(
      (v) => typeof v === 'string' && v.length > 0
    ),
    hotelIds: (placement.hotelIds ?? []).filter((v) => typeof v === 'string' && v.length > 0),
    showInCart: placement.showInCart !== false,
  };
}

function normalizeTargeting(targeting: UpsellItem['targeting'] | undefined) {
  if (!targeting) return null;

  const match = targeting.match ?? 'any';
  const destinations = (targeting.destinations ?? []).filter((v) => v && v.length > 0);
  const tourIds = (targeting.tourIds ?? []).filter((v) => v && v.length > 0);

  if (destinations.length === 0 && tourIds.length === 0) return null;

  return {
    match,
    destinations,
    tourIds,
  };
}

function buildAddonPayload(
  formData: Omit<UpsellItem, 'id' | 'createdAt' | 'imageUrl'> & {
    images?: unknown[];
  },
  imageUrl: string | undefined,
  placement: AddonPlacement
) {
  const targeting = normalizeTargeting(formData.targeting) ?? {
    match: placement.match,
    tourIds: placement.tourIds,
    destinations: placement.destinations,
  };
  const targetingPayload =
    targeting.tourIds.length === 0 && targeting.destinations.length === 0 ? null : targeting;

  return {
    name: formData.name,
    description: formData.description,
    price: formData.price,
    variants: normalizeVariants(formData.variants),
    targeting: targetingPayload,
    type: formData.type,
    related_tour_id: formData.relatedTourId ?? null,
    image_url: imageUrl,
    is_active: formData.isActive,
    pricing_mode: formData.pricingMode ?? 'flat',
    quantity_mode: formData.quantityMode ?? 'none',
    min_pax: formData.minPax ?? null,
    max_pax: formData.maxPax ?? null,
    min_hours: formData.minHours ?? null,
    max_hours: formData.maxHours ?? null,
    default_hours: formData.defaultHours ?? null,
    currency: formData.currency ?? 'USD',
    sort_order: formData.sortOrder ?? 0,
    placement,
  };
}

export async function getUpsellItems(
  options: { skipTranslation?: boolean } = {}
): Promise<UpsellItem[]> {
  const supabase = await createClient();
  const agencyId = await getCurrentAgencyId();

  const { data, error } = await supabase
    .from('upsell_items')
    .select('*')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching upsell items:', error);
    return [];
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = (data as any[]).map((item) =>
    ensureUpsellItemDefaults(toCamelCase(item) as UpsellItem)
  );
  if (options.skipTranslation) return items;
  const target = await getPublicTargetLocale();
  if (target === 'en') return items;
  return translateObjects(items, UPSELL_TRANSLATABLE_FIELDS, target);
}

export async function getUpsellItemById(
  id: string,
  options: { skipTranslation?: boolean } = {}
): Promise<UpsellItem | null> {
  const supabase = await createClient();
  const agencyId = await getCurrentAgencyId();

  const { data, error } = await supabase
    .from('upsell_items')
    .select('*')
    .eq('id', id)
    .eq('agency_id', agencyId)
    .single();

  if (error) {
    console.error(`Error fetching upsell item by ID ${id}:`, error);
    return null;
  }
  if (!data) return null;

  const item = ensureUpsellItemDefaults(toCamelCase(data) as UpsellItem);
  if (options.skipTranslation) return item;
  const target = await getPublicTargetLocale();
  if (target === 'en') return item;
  return translateObject(item, UPSELL_TRANSLATABLE_FIELDS, target);
}

async function handleImageUpload(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  images: any[] | undefined,
  existingImageUrl?: string
): Promise<string | undefined> {
  const supabase = await createClient();
  let imageUrl: string | undefined = existingImageUrl;

  if (images && images.length > 0) {
    const file = images[0] as File;
    if (file.name && file.size) {
      // Check if it's a new file object
      const filePath = `public/upsell-items/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('tours') // Using the existing 'tours' bucket as requested
        .upload(filePath, file);

      if (uploadError) {
        console.error('Error uploading upsell item image:', uploadError);
        throw new Error('Failed to upload upsell item image.');
      }

      const { data: urlData } = supabase.storage.from('tours').getPublicUrl(filePath);

      imageUrl = urlData.publicUrl;
    }
  }
  return imageUrl;
}

const PG_UNDEFINED_COLUMN = '42703';

function stripUnifiedFields<T extends Record<string, unknown>>(payload: T): T {
  const out: Record<string, unknown> = { ...payload };
  delete out.pricing_mode;
  delete out.quantity_mode;
  delete out.min_pax;
  delete out.max_pax;
  delete out.min_hours;
  delete out.max_hours;
  delete out.default_hours;
  delete out.currency;
  delete out.sort_order;
  delete out.placement;
  return out as T;
}

export async function addUpsellItem(
  formData: Omit<UpsellItem, 'id' | 'createdAt' | 'imageUrl'> & {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    images?: any[];
  }
) {
  const supabase = await createAdminClient();
  const agencyId = await getCurrentAgencyId();

  const imageUrl = await handleImageUpload(formData.images);
  const placement = normalizePlacement(formData.placement);
  const payload = buildAddonPayload(formData, imageUrl, placement);
  const insert = { ...payload, agency_id: agencyId };

  let { error } = await supabase.from('upsell_items').insert(insert);
  if (error) {
    const code = (error as { code?: string }).code;
    if (code === PG_UNDEFINED_COLUMN) {
      // Unified-addons migration not yet applied — fall back to the legacy
      // column set so an admin can still create items in the meantime.
      const legacyInsert = stripUnifiedFields(insert);
      ({ error } = await supabase.from('upsell_items').insert(legacyInsert));
    }
  }

  if (error) {
    console.error('Error adding upsell item:', error);
    throw new Error('Failed to add upsell item.');
  }

  revalidatePath('/admin/upsell-items');
  redirect('/admin/upsell-items');
}

export async function updateUpsellItem(
  id: string,
  formData: Omit<UpsellItem, 'id' | 'createdAt' | 'imageUrl'> & {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    images?: any[];
    imageUrl?: string;
  }
) {
  const supabase = await createAdminClient();
  const agencyId = await getCurrentAgencyId();

  const imageUrl = await handleImageUpload(formData.images, formData.imageUrl);
  const placement = normalizePlacement(formData.placement);
  const payload = buildAddonPayload(formData, imageUrl, placement);

  let { error } = await supabase
    .from('upsell_items')
    .update(payload)
    .eq('id', id)
    .eq('agency_id', agencyId);

  if (error) {
    const code = (error as { code?: string }).code;
    if (code === PG_UNDEFINED_COLUMN) {
      const legacyPayload = stripUnifiedFields(payload);
      ({ error } = await supabase
        .from('upsell_items')
        .update(legacyPayload)
        .eq('id', id)
        .eq('agency_id', agencyId));
    }
  }

  if (error) {
    console.error('Error updating upsell item:', error);
    throw new Error('Failed to update upsell item.');
  }

  revalidatePath('/admin/upsell-items');
  redirect('/admin/upsell-items');
}

export async function deleteUpsellItem(id: string) {
  const supabase = await createAdminClient();
  const agencyId = await getCurrentAgencyId();

  // Optional: Delete image from storage if it exists
  const { data: itemToDelete } = await supabase
    .from('upsell_items')
    .select('image_url')
    .eq('id', id)
    .eq('agency_id', agencyId)
    .single();
  if (itemToDelete?.image_url) {
    const filePath = itemToDelete.image_url.split('public/')[1]; // Extract path after 'public/'
    if (filePath) {
      const { error: deleteError } = await supabase.storage.from('tours').remove([filePath]);
      if (deleteError) {
        console.warn('Failed to delete old upsell item image from storage:', deleteError);
      }
    }
  }

  const { error } = await supabase
    .from('upsell_items')
    .delete()
    .eq('id', id)
    .eq('agency_id', agencyId);

  if (error) {
    console.error('Error deleting upsell item:', error);
    throw new Error('Failed to delete upsell item.');
  }

  revalidatePath('/admin/upsell-items');
}
