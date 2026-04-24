'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/agency-users';
import { getCurrentAgencyId } from '@/lib/supabase/agencies';
import { toCamelCase } from '@/lib/utils';
import type { Hotel, HotelBooking, RoomInventory, RoomType } from '@/types';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getPublicTargetLocale } from '@/lib/translation/get-locale';
import { translateObject, translateObjects } from '@/lib/translation/translate-object';

const HOTEL_TRANSLATABLE_FIELDS = ['name', 'description'] as const;
const ROOM_TYPE_TRANSLATABLE_FIELDS = [
  'name',
  'description',
  'view',
  'cancellationPolicy',
  'amenities[]',
  'services[]',
  'highlights[]',
] as const;

type SkipOpt = { skipTranslation?: boolean };

async function maybeTranslateHotels(hotels: Hotel[], skip?: boolean): Promise<Hotel[]> {
  if (skip) return hotels;
  const target = await getPublicTargetLocale();
  if (target === 'en') return hotels;
  return translateObjects(hotels, HOTEL_TRANSLATABLE_FIELDS, target);
}

async function maybeTranslateHotel(hotel: Hotel | null, skip?: boolean): Promise<Hotel | null> {
  if (!hotel || skip) return hotel;
  const target = await getPublicTargetLocale();
  if (target === 'en') return hotel;
  return translateObject(hotel, HOTEL_TRANSLATABLE_FIELDS, target);
}

async function maybeTranslateRoomTypes(rooms: RoomType[], skip?: boolean): Promise<RoomType[]> {
  if (skip) return rooms;
  const target = await getPublicTargetLocale();
  if (target === 'en') return rooms;
  return translateObjects(rooms, ROOM_TYPE_TRANSLATABLE_FIELDS, target);
}

async function maybeTranslateRoomType(
  room: RoomType | null,
  skip?: boolean
): Promise<RoomType | null> {
  if (!room || skip) return room;
  const target = await getPublicTargetLocale();
  if (target === 'en') return room;
  return translateObject(room, ROOM_TYPE_TRANSLATABLE_FIELDS, target);
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function uploadRoomImages(params: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  hotelId: string;
  roomSlug: string;
  files: File[];
}) {
  const imageUrls: string[] = [];

  for (const file of params.files) {
    if (!file?.name || !file.size) continue;
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-');
    const filePath = `public/hotels/${params.hotelId}/rooms/${params.roomSlug}/${Date.now()}-${safeFileName}`;

    const { error: uploadError } = await params.supabase.storage
      .from('tours')
      .upload(filePath, file, {
        contentType: file.type || undefined,
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: urlData } = params.supabase.storage.from('tours').getPublicUrl(filePath);
    imageUrls.push(urlData.publicUrl);
  }

  return imageUrls;
}

export async function getHotels(options: SkipOpt = {}): Promise<Hotel[]> {
  const supabase = await createClient();
  const agencyId = await getCurrentAgencyId();

  const { data, error } = await supabase
    .from('hotels')
    .select('*')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  const hotels = (data || []).map((row) => toCamelCase(row) as Hotel);
  return maybeTranslateHotels(hotels, options.skipTranslation);
}

export async function getPublicHotels(options: SkipOpt = {}): Promise<Hotel[]> {
  const supabase = await createClient();
  const agencyId = await getCurrentAgencyId();

  const { data, error } = await supabase
    .from('hotels')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  const hotels = (data || []).map((row) => toCamelCase(row) as Hotel);
  return maybeTranslateHotels(hotels, options.skipTranslation);
}

export async function getHotelBySlug(slug: string, options: SkipOpt = {}): Promise<Hotel | null> {
  const supabase = await createClient();
  const agencyId = await getCurrentAgencyId();

  const { data, error } = await supabase
    .from('hotels')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) return null;
  return maybeTranslateHotel(toCamelCase(data) as Hotel, options.skipTranslation);
}

export async function getPublicHotelBySlug(
  slug: string,
  options: SkipOpt = {}
): Promise<Hotel | null> {
  const supabase = await createClient();
  const agencyId = await getCurrentAgencyId();

  const { data, error } = await supabase
    .from('hotels')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) return null;
  return maybeTranslateHotel(toCamelCase(data) as Hotel, options.skipTranslation);
}

export async function getRoomTypesByHotelId(
  hotelId: string,
  options: SkipOpt = {}
): Promise<RoomType[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('room_types')
    .select('*')
    .eq('hotel_id', hotelId)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  const rooms = (data || []).map((row) => toCamelCase(row) as RoomType);
  return maybeTranslateRoomTypes(rooms, options.skipTranslation);
}

export async function getPublicRoomTypesByHotelId(
  hotelId: string,
  options: SkipOpt = {}
): Promise<RoomType[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('room_types')
    .select('*')
    .eq('hotel_id', hotelId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  const rooms = (data || []).map((row) => toCamelCase(row) as RoomType);
  return maybeTranslateRoomTypes(rooms, options.skipTranslation);
}

export async function getRoomTypeBySlug(params: {
  hotelId: string;
  roomSlug: string;
  skipTranslation?: boolean;
}): Promise<RoomType | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('room_types')
    .select('*')
    .eq('hotel_id', params.hotelId)
    .eq('slug', params.roomSlug)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) return null;
  return maybeTranslateRoomType(toCamelCase(data) as RoomType, params.skipTranslation);
}

export async function getRoomInventory(params: {
  roomTypeId: string;
  from: string;
  to: string;
}): Promise<RoomInventory[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('room_inventory')
    .select('*')
    .eq('room_type_id', params.roomTypeId)
    .gte('date', params.from)
    .lt('date', params.to)
    .order('date', { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []).map((row) => toCamelCase(row) as RoomInventory);
}

export async function getHotelBookings(): Promise<HotelBooking[]> {
  const supabase = await createClient();
  const agencyId = await getCurrentAgencyId();

  const { data, error } = await supabase
    .from('hotel_bookings')
    .select('*')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []).map((row) => toCamelCase(row) as HotelBooking);
}

export async function addRoomType(input: {
  hotelId: string;
  name: string;
  slug?: string;
  description?: string;
  maxAdults: number;
  maxChildren: number;
  sizeSqm?: number | null;
  view?: string | null;
  bathrooms?: number | null;
  floor?: number | null;
  basePricePerNight?: number | null;
  currency?: string | null;
  defaultUnits?: number | null;
  smokingAllowed?: boolean;
  refundable?: boolean;
  breakfastIncluded?: boolean;
  petsAllowed?: boolean;
  extraBedAllowed?: boolean;
  extraBedFee?: number | null;
  cancellationPolicy?: string | null;
  beds?: Record<string, unknown>;
  amenities?: string[];
  services?: string[];
  highlights?: string[];
  accessibility?: Record<string, unknown>;
  images?: Array<File | string>;
  isFeatured?: boolean;
  isActive: boolean;
}) {
  const supabase = await createAdminClient();
  const slugBase = slugify(input.slug?.trim() || input.name);
  const base = slugBase || `room-${crypto.randomUUID().slice(0, 8)}`;

  const fileUploads = (input.images || []).filter(
    (img): img is File => typeof img === 'object' && 'name' in img && 'size' in img
  );
  const existingUrls = (input.images || []).filter((img): img is string => typeof img === 'string');

  const attemptInsert = async (slug: string) => {
    const uploadedUrls = await uploadRoomImages({
      supabase,
      hotelId: input.hotelId,
      roomSlug: slug,
      files: fileUploads,
    });

    return supabase.from('room_types').insert({
      hotel_id: input.hotelId,
      name: input.name,
      slug,
      description: input.description?.trim() || null,
      max_adults: input.maxAdults,
      max_children: input.maxChildren,
      beds: input.beds ?? {},
      amenities: input.amenities ?? [],
      services: input.services ?? [],
      highlights: input.highlights ?? [],
      size_sqm: input.sizeSqm ?? null,
      view: input.view?.trim() || null,
      bathrooms: input.bathrooms ?? null,
      floor: input.floor ?? null,
      base_price_per_night: input.basePricePerNight ?? null,
      currency: input.currency?.trim() || null,
      default_units: input.defaultUnits ?? null,
      smoking_allowed: input.smokingAllowed ?? false,
      refundable: input.refundable ?? true,
      breakfast_included: input.breakfastIncluded ?? false,
      pets_allowed: input.petsAllowed ?? false,
      extra_bed_allowed: input.extraBedAllowed ?? false,
      extra_bed_fee: input.extraBedFee ?? null,
      cancellation_policy: input.cancellationPolicy?.trim() || null,
      accessibility: input.accessibility ?? {},
      images: [...existingUrls, ...uploadedUrls],
      is_featured: input.isFeatured ?? false,
      is_active: input.isActive,
    });
  };

  let result = await attemptInsert(base);
  if (result.error && result.error.code === '23505') {
    result = await attemptInsert(`${base}-${crypto.randomUUID().slice(0, 4)}`);
  }

  if (result.error) {
    throw result.error;
  }

  revalidatePath('/admin/hotels/rooms');
  revalidatePath('/hotels');
  redirect('/admin/hotels/rooms');
}

export async function getRoomTypeById(id: string): Promise<RoomType | null> {
  const supabase = await createClient();

  const { data, error } = await supabase.from('room_types').select('*').eq('id', id).maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) return null;
  return toCamelCase(data) as RoomType;
}

export async function updateRoomType(input: {
  id: string;
  hotelId: string;
  name: string;
  slug: string;
  description?: string;
  maxAdults: number;
  maxChildren: number;
  sizeSqm?: number | null;
  view?: string | null;
  bathrooms?: number | null;
  floor?: number | null;
  basePricePerNight?: number | null;
  currency?: string | null;
  defaultUnits?: number | null;
  smokingAllowed?: boolean;
  refundable?: boolean;
  breakfastIncluded?: boolean;
  petsAllowed?: boolean;
  extraBedAllowed?: boolean;
  extraBedFee?: number | null;
  cancellationPolicy?: string | null;
  beds?: Record<string, unknown>;
  amenities?: string[];
  services?: string[];
  highlights?: string[];
  accessibility?: Record<string, unknown>;
  images?: Array<File | string>;
  isFeatured?: boolean;
  isActive: boolean;
}) {
  const supabase = await createAdminClient();
  const slugBase = slugify(input.slug?.trim() || input.name);
  const slug = slugBase || `room-${crypto.randomUUID().slice(0, 8)}`;

  const fileUploads = (input.images || []).filter(
    (img): img is File => typeof img === 'object' && 'name' in img && 'size' in img
  );
  const existingUrls = (input.images || []).filter((img): img is string => typeof img === 'string');

  const uploadedUrls = await uploadRoomImages({
    supabase,
    hotelId: input.hotelId,
    roomSlug: slug,
    files: fileUploads,
  });

  const { error } = await supabase
    .from('room_types')
    .update({
      name: input.name,
      slug,
      description: input.description?.trim() || null,
      max_adults: input.maxAdults,
      max_children: input.maxChildren,
      beds: input.beds ?? {},
      amenities: input.amenities ?? [],
      services: input.services ?? [],
      highlights: input.highlights ?? [],
      size_sqm: input.sizeSqm ?? null,
      view: input.view?.trim() || null,
      bathrooms: input.bathrooms ?? null,
      floor: input.floor ?? null,
      base_price_per_night: input.basePricePerNight ?? null,
      currency: input.currency?.trim() || null,
      default_units: input.defaultUnits ?? null,
      smoking_allowed: input.smokingAllowed ?? false,
      refundable: input.refundable ?? true,
      breakfast_included: input.breakfastIncluded ?? false,
      pets_allowed: input.petsAllowed ?? false,
      extra_bed_allowed: input.extraBedAllowed ?? false,
      extra_bed_fee: input.extraBedFee ?? null,
      cancellation_policy: input.cancellationPolicy?.trim() || null,
      accessibility: input.accessibility ?? {},
      images: [...existingUrls, ...uploadedUrls],
      is_featured: input.isFeatured ?? false,
      is_active: input.isActive,
    })
    .eq('id', input.id)
    .eq('hotel_id', input.hotelId);

  if (error) {
    throw error;
  }

  revalidatePath('/admin/hotels/rooms');
  revalidatePath('/admin/hotels/availability');
  revalidatePath('/hotels');
  redirect('/admin/hotels/rooms');
}

export async function createHotelProfile(input: {
  name: string;
  slug?: string;
  description?: string;
  city?: string;
  country?: string;
  address?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  timezone?: string;
  starRating?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  checkInTime?: string;
  checkOutTime?: string;
  isActive: boolean;
}) {
  const supabase = await createAdminClient();
  const agencyId = await getCurrentAgencyId();

  const { data: existing, error: existingError } = await supabase
    .from('hotels')
    .select('id')
    .eq('agency_id', agencyId)
    .limit(1);

  if (existingError) {
    throw existingError;
  }

  if (existing && existing.length > 0) {
    redirect('/admin/hotels');
  }

  const slugBase = slugify(input.slug?.trim() || input.name);
  const base = slugBase || `hotel-${crypto.randomUUID().slice(0, 8)}`;

  const attemptInsert = async (slug: string) => {
    return supabase.from('hotels').insert({
      agency_id: agencyId,
      slug,
      name: input.name,
      description: input.description?.trim() || null,
      city: input.city?.trim() || null,
      country: input.country?.trim() || null,
      address: input.address?.trim() || null,
      contact_email: input.contactEmail?.trim() || null,
      contact_phone: input.contactPhone?.trim() || null,
      website: input.website?.trim() || null,
      timezone: input.timezone?.trim() || null,
      star_rating: input.starRating ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      check_in_time: input.checkInTime?.trim() || null,
      check_out_time: input.checkOutTime?.trim() || null,
      policies: {},
      images: [],
      is_active: input.isActive,
    });
  };

  let result = await attemptInsert(base);
  if (result.error && result.error.code === '23505') {
    result = await attemptInsert(`${base}-${crypto.randomUUID().slice(0, 4)}`);
  }

  if (result.error) {
    throw result.error;
  }

  revalidatePath('/admin/hotels');
  revalidatePath('/admin/hotels/rooms');
  revalidatePath('/admin/hotels/availability');
  redirect('/admin/hotels');
}

export async function updateHotelProfile(input: {
  id: string;
  name: string;
  slug: string;
  description?: string;
  city?: string;
  country?: string;
  address?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  timezone?: string;
  starRating?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  checkInTime?: string;
  checkOutTime?: string;
  isActive: boolean;
}) {
  const supabase = await createAdminClient();
  const agencyId = await getCurrentAgencyId();

  const slugBase = slugify(input.slug?.trim() || input.name);
  const slug = slugBase || `hotel-${crypto.randomUUID().slice(0, 8)}`;

  const { error } = await supabase
    .from('hotels')
    .update({
      slug,
      name: input.name,
      description: input.description?.trim() || null,
      city: input.city?.trim() || null,
      country: input.country?.trim() || null,
      address: input.address?.trim() || null,
      contact_email: input.contactEmail?.trim() || null,
      contact_phone: input.contactPhone?.trim() || null,
      website: input.website?.trim() || null,
      timezone: input.timezone?.trim() || null,
      star_rating: input.starRating ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      check_in_time: input.checkInTime?.trim() || null,
      check_out_time: input.checkOutTime?.trim() || null,
      is_active: input.isActive,
    })
    .eq('id', input.id)
    .eq('agency_id', agencyId);

  if (error) {
    throw error;
  }

  revalidatePath('/admin/hotels');
  revalidatePath('/admin/hotels/rooms');
  revalidatePath('/admin/hotels/availability');
  revalidatePath('/hotels');
  redirect('/admin/hotels');
}

export async function upsertRoomInventoryRange(input: {
  roomTypeId: string;
  from: string;
  to: string;
  availableUnits: number;
  pricePerNight: number;
  stopSell: boolean;
}) {
  const supabase = await createAdminClient();

  const fromDate = new Date(`${input.from}T00:00:00Z`);
  const toDate = new Date(`${input.to}T00:00:00Z`);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    throw new Error('Invalid date range.');
  }
  if (toDate < fromDate) {
    throw new Error('End date must be after start date.');
  }

  const rows: Array<Record<string, unknown>> = [];
  for (let d = new Date(fromDate); d <= toDate; d.setUTCDate(d.getUTCDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);
    rows.push({
      room_type_id: input.roomTypeId,
      date: dateStr,
      available_units: input.availableUnits,
      price_per_night: input.pricePerNight,
      stop_sell: input.stopSell,
    });
  }

  const { error } = await supabase
    .from('room_inventory')
    .upsert(rows, { onConflict: 'room_type_id,date' });

  if (error) {
    throw error;
  }

  revalidatePath('/admin/hotels/availability');
  redirect(
    `/admin/hotels/availability?roomTypeId=${encodeURIComponent(input.roomTypeId)}&from=${encodeURIComponent(
      input.from
    )}&to=${encodeURIComponent(input.to)}`
  );
}
