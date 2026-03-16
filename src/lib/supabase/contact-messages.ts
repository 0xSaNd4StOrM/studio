'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/agency-users';
import type { ContactMessage, ContactMessageStatus } from '@/types';
import { revalidatePath } from 'next/cache';
import { toCamelCase } from '@/lib/utils';
import { getCurrentAgencyId } from '@/lib/supabase/agencies';

export async function createContactMessage(input: {
  name: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  message: string;
}): Promise<void> {
  const supabase = await createClient();
  const agencyId = await getCurrentAgencyId();

  const { error } = await supabase.from('contact_messages').insert({
    name: input.name,
    email: input.email,
    phone: input.phone ?? null,
    subject: input.subject ?? null,
    message: input.message,
    status: 'new',
    agency_id: agencyId,
  });

  if (error) {
    throw new Error('Failed to create contact message.');
  }

  revalidatePath('/admin/contact-messages');
}

export async function createCustomerFromMessage(message: ContactMessage): Promise<void> {
  const supabase = await createAdminClient();
  const agencyId = await getCurrentAgencyId();

  const { error } = await supabase.from('customers').insert({
    agency_id: agencyId,
    email: message.email,
    name: message.name,
    phone: message.phone,
    source: 'Contact',
    status: 'active',
    total_bookings: 0,
    total_spent: 0,
    created_at: new Date().toISOString(),
    last_active: new Date().toISOString(),
  });

  if (error) {
    // If it's a conflict (already exists), we might want to just ignore or update.
    // For now, let's assume if it fails it's because of unique constraint or other issue.
    if (error.code === '23505') {
      // unique_violation
      console.log('Customer already exists');
      return;
    }
    console.error('Error creating customer from message:', error);
    throw new Error('Failed to create customer from message.');
  }

  revalidatePath('/admin/customers');
  revalidatePath('/admin/contact-messages');
}

export async function getContactMessages(): Promise<ContactMessage[]> {
  const supabase = await createClient();
  const agencyId = await getCurrentAgencyId();

  const { data, error } = await supabase
    .from('contact_messages')
    .select('*')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return (data as unknown[]).map((row) => toCamelCase(row)) as ContactMessage[];
}

export async function updateContactMessageStatus(
  id: string,
  status: ContactMessageStatus
): Promise<void> {
  const supabase = await createAdminClient();
  const agencyId = await getCurrentAgencyId();

  const { error } = await supabase
    .from('contact_messages')
    .update({ status })
    .eq('id', id)
    .eq('agency_id', agencyId);

  if (error) {
    throw new Error('Failed to update contact message status.');
  }

  revalidatePath('/admin/contact-messages');
}
