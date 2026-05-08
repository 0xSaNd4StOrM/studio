import { createClient } from '@/lib/supabase/client';

export type HotelSelectRow = { id: string; name: string; slug: string };
export type RoomTypeSelectRow = {
  id: string;
  name: string;
  slug: string;
  hotelId: string;
  hotelName?: string;
};

/** Client-safe minimal hotel list used by admin form combobox. */
export async function getHotelsSelect(): Promise<HotelSelectRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('hotels')
    .select('id, name, slug')
    .order('name', { ascending: true });
  if (error) {
    console.error('Error fetching hotels (select):', error);
    return [];
  }
  return (data ?? []) as HotelSelectRow[];
}

/**
 * Client-safe minimal room-type list joined with hotel name. Used by the
 * admin upsell-item form so admins can attach an addon to a specific room.
 */
export async function getRoomTypesSelect(): Promise<RoomTypeSelectRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('room_types')
    .select('id, name, slug, hotel_id, hotels!inner(name)')
    .order('name', { ascending: true });
  if (error) {
    console.error('Error fetching room types (select):', error);
    return [];
  }
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    hotelId: String(row.hotel_id),
    hotelName:
      typeof row.hotels === 'object' && row.hotels !== null
        ? String((row.hotels as { name?: string }).name ?? '')
        : undefined,
  }));
}
