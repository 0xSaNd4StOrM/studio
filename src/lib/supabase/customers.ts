'use server';
import { createClient } from './server';
import { createAdminClient } from '@/lib/supabase/agency-users';
import type { Customer } from '@/types';
import { getCurrentAgencyId } from '@/lib/supabase/agencies';

type DbCustomer = {
  id: string;
  email: string;
  name: string | null;
  source: string | null;
  total_bookings: number | null;
  total_spent: number | null;
  created_at: string | null;
  last_active: string | null;
  status: string | null;
  avatar_url: string | null;
  phone: string | null;
  nationality: string | null;
};

function toCustomer(row: DbCustomer): Customer {
  return {
    id: row.id,
    email: row.email,
    name: row.name ?? row.email,
    source: (row.source as Customer['source']) ?? 'Booking',
    totalBookings: row.total_bookings ?? 0,
    totalSpent: row.total_spent ?? 0,
    createdAt: row.created_at ?? new Date().toISOString(),
    bookings: [],
    lastActive: row.last_active ?? undefined,
    status: (row.status as 'active' | 'inactive') ?? 'active',
    avatarUrl: row.avatar_url ?? undefined,
    phone: row.phone ?? undefined,
    nationality: row.nationality ?? undefined,
  };
}

export async function getCustomers(): Promise<Customer[]> {
  try {
    const supabase = await createClient();
    const agencyId = await getCurrentAgencyId();

    const { data, error } = await supabase
      .from('customers')
      .select(
        'id, email, name, source, total_bookings, total_spent, created_at, last_active, status, avatar_url, phone, nationality'
      )
      .eq('agency_id', agencyId);

    if (error) {
      console.error('Error fetching customers (Supabase):', error);
      return [];
    }

    return (data as DbCustomer[]).map(toCustomer);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Unexpected error fetching customers:', message);
    return [];
  }
}

export async function syncCustomersFromBookings() {
  const supabase = await createAdminClient();
  const agencyId = await getCurrentAgencyId();

  // fetch all bookings
  const { data: bookings } = await supabase
    .from('bookings')
    .select('customer_email, customer_name, phone_number, nationality, total_price, created_at')
    .eq('agency_id', agencyId);

  if (!bookings || bookings.length === 0) return;

  // Aggregate
  const customerMap = new Map();

  for (const b of bookings) {
    const email = b.customer_email.toLowerCase();
    if (!customerMap.has(email)) {
      customerMap.set(email, {
        email: b.customer_email,
        name: b.customer_name,
        phone: b.phone_number,
        nationality: b.nationality,
        total_bookings: 0,
        total_spent: 0,
        last_active: b.created_at,
        created_at: b.created_at,
      });
    }

    const c = customerMap.get(email);
    c.total_bookings += 1;
    c.total_spent += b.total_price || 0;
    if (new Date(b.created_at) > new Date(c.last_active)) {
      c.last_active = b.created_at;
      // Update details to latest
      c.name = b.customer_name;
      c.phone = b.phone_number;
      c.nationality = b.nationality;
    }
    if (new Date(b.created_at) < new Date(c.created_at)) {
      c.created_at = b.created_at;
    }
  }

  // Upsert all
  const upsertData = Array.from(customerMap.values()).map((c) => ({
    agency_id: agencyId,
    email: c.email,
    name: c.name,
    phone: c.phone,
    nationality: c.nationality,
    total_bookings: c.total_bookings,
    total_spent: c.total_spent,
    last_active: c.last_active,
    created_at: c.created_at,
    source: 'Booking',
    status: 'active',
  }));

  const { error } = await supabase
    .from('customers')
    .upsert(upsertData, { onConflict: 'email, agency_id' });

  if (error) {
    console.error('Error syncing customers:', error);
  }
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  const supabase = await createClient();
  const agencyId = await getCurrentAgencyId();

  try {
    const { data, error } = await supabase
      .from('customers')
      .select(
        'id, email, name, source, total_bookings, total_spent, created_at, last_active, status, avatar_url, phone, nationality'
      )
      .eq('id', id)
      .eq('agency_id', agencyId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching customer by id:', error);
      return null;
    }

    if (!data) return null;

    const customer = toCustomer(data as DbCustomer);

    // Fetch bookings for this customer
    const { data: bookingsData, error: bookingsError } = await supabase
      .from('bookings')
      .select(
        `
        *,
        booking_items (
          *,
          tours (
            name,
            slug
          )
        )
      `
      )
      .eq('customer_email', customer.email)
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false });

    if (!bookingsError && bookingsData) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      customer.bookings = bookingsData.map((b: any) => ({
        id: b.id,
        customerName: b.customer_name,
        customerEmail: b.customer_email,
        phoneNumber: b.phone_number,
        nationality: b.nationality,
        bookingDate: b.created_at, // using created_at as booking date
        totalPrice: b.total_price,
        status: b.status,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        bookingItems: b.booking_items.map((item: any) => ({
          id: item.id,
          bookingId: item.booking_id,
          tourId: item.tour_id,
          upsellItemId: item.upsell_item_id,
          adults: item.adults,
          children: item.children,
          price: item.price,
          tours: item.tours,
        })),
      }));
    }

    return customer;
  } catch (err) {
    console.error('Unexpected error fetching customer by id:', err);
    return null;
  }
}
