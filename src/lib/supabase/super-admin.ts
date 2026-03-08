'use server';

import { createClient } from '@/lib/supabase/server';

export type PlatformStats = {
  totalAgencies: number;
  activeAgencies: number;
  suspendedAgencies: number;
  newThisMonth: number;
  totalBookings: number;
  totalRevenue: number;
};

export type AgencyHealthRow = {
  agencyId: string;
  totalBookings: number;
  revenueThisMonth: number;
  lastBookingDate: string | null;
  lastAdminLoginAt: string | null;
};

export async function getPlatformStats(): Promise<PlatformStats> {
  const supabase = await createClient();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [agenciesRes, bookingsRes, newAgenciesRes] = await Promise.all([
    supabase.from('agencies').select('status'),
    supabase.from('bookings').select('total_price'),
    supabase.from('agencies').select('id').gte('created_at', startOfMonth),
  ]);

  const agencies = agenciesRes.data || [];
  const bookings = bookingsRes.data || [];
  const newAgencies = newAgenciesRes.data || [];

  return {
    totalAgencies: agencies.length,
    activeAgencies: agencies.filter((a) => a.status === 'active').length,
    suspendedAgencies: agencies.filter((a) => a.status === 'suspended').length,
    newThisMonth: newAgencies.length,
    totalBookings: bookings.length,
    totalRevenue: bookings.reduce((sum, b) => sum + (Number(b.total_price) || 0), 0),
  };
}

export async function getAgencyHealthData(): Promise<Record<string, AgencyHealthRow>> {
  const supabase = await createClient();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [bookingsRes, agenciesRes] = await Promise.all([
    supabase.from('bookings').select('agency_id, total_price, created_at'),
    supabase.from('agencies').select('id, last_admin_login_at'),
  ]);

  const bookings = bookingsRes.data || [];
  const agencies = agenciesRes.data || [];

  const healthMap: Record<string, AgencyHealthRow> = {};

  // Initialize all agencies
  for (const agency of agencies) {
    healthMap[agency.id] = {
      agencyId: agency.id,
      totalBookings: 0,
      revenueThisMonth: 0,
      lastBookingDate: null,
      lastAdminLoginAt: agency.last_admin_login_at || null,
    };
  }

  // Aggregate booking data per agency
  for (const b of bookings) {
    const row = healthMap[b.agency_id];
    if (!row) continue;

    row.totalBookings += 1;

    if (b.created_at >= startOfMonth) {
      row.revenueThisMonth += Number(b.total_price) || 0;
    }

    if (!row.lastBookingDate || b.created_at > row.lastBookingDate) {
      row.lastBookingDate = b.created_at;
    }
  }

  return healthMap;
}

export type RevenueDataPoint = { name: string; total: number };

export async function getGlobalRevenueData(days: number): Promise<RevenueDataPoint[]> {
  const supabase = await createClient();

  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - days);

  const { data: bookings } = await supabase
    .from('bookings')
    .select('total_price, created_at')
    .gte('created_at', startDate.toISOString());

  const allBookings = bookings || [];

  // Build daily buckets
  const dailyMap: Record<string, number> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    dailyMap[key] = 0;
  }

  for (const b of allBookings) {
    const d = new Date(b.created_at);
    const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (dailyMap[key] !== undefined) {
      dailyMap[key] += Number(b.total_price) || 0;
    }
  }

  return Object.entries(dailyMap).map(([name, total]) => ({ name, total }));
}

export async function recordAdminLogin(agencyId: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from('agencies')
    .update({ last_admin_login_at: new Date().toISOString() })
    .eq('id', agencyId);
}
