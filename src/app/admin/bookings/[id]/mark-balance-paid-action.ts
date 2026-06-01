'use server';

import { markBalancePaid } from '@/lib/supabase/bookings';
import { revalidatePath } from 'next/cache';

export async function markBalancePaidAction(bookingId: string): Promise<void> {
  await markBalancePaid(bookingId);
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath('/admin/bookings');
  revalidatePath('/admin/hotels/ops');
}
