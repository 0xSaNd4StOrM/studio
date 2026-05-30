'use server';

import { revalidatePath } from 'next/cache';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/agency-users';
import { getCurrentAgencyId } from '@/lib/supabase/agencies';
import {
  addIcalFeed,
  deleteIcalFeed,
  getOrCreateExportToken,
  listActiveImportFeedsForAgency,
  syncIcalFeed,
  type IcalSyncResult,
} from '@/lib/supabase/ical-feeds';

export async function createExportTokenAction(formData: FormData): Promise<void> {
  const roomTypeId = String(formData.get('roomTypeId') || '').trim();
  if (!roomTypeId) return;
  await getOrCreateExportToken(roomTypeId);
  revalidatePath('/admin/hotels/channels');
}

export async function addFeedAction(formData: FormData): Promise<void> {
  const roomTypeId = String(formData.get('roomTypeId') || '').trim();
  const url = String(formData.get('url') || '').trim();
  const label = String(formData.get('label') || '').trim();
  await addIcalFeed({ roomTypeId, url, label: label || undefined });
  revalidatePath('/admin/hotels/channels');
}

export async function deleteFeedAction(formData: FormData): Promise<void> {
  const feedId = String(formData.get('feedId') || '').trim();
  if (!feedId) return;
  await deleteIcalFeed(feedId);
  revalidatePath('/admin/hotels/channels');
}

export type SyncNowResult = { ok: boolean; imported: number; failed: number; message: string };

export async function syncNowAction(): Promise<SyncNowResult> {
  // Verify the caller is a member of the current agency (throws otherwise).
  await createAdminClient();
  const agencyId = await getCurrentAgencyId();

  const feeds = await listActiveImportFeedsForAgency(agencyId);
  if (feeds.length === 0) {
    return { ok: true, imported: 0, failed: 0, message: 'No active import feeds to sync.' };
  }

  const supabase = createServiceRoleClient();
  const nowIso = new Date().toISOString();
  const results: IcalSyncResult[] = [];
  for (const feed of feeds) {
    results.push(await syncIcalFeed(supabase, feed, nowIso));
  }

  const imported = results.reduce((sum, r) => sum + r.imported, 0);
  const failed = results.filter((r) => !r.ok).length;

  revalidatePath('/admin/hotels/channels');
  revalidatePath('/admin/hotels/ops');
  revalidatePath('/admin/hotels/availability');

  return {
    ok: failed === 0,
    imported,
    failed,
    message:
      failed === 0
        ? `Synced ${feeds.length} feed(s): ${imported} date range(s) blocked.`
        : `Synced with ${failed} error(s); ${imported} date range(s) blocked.`,
  };
}
