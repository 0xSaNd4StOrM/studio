import { headers } from 'next/headers';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getHotels, getRoomTypesByHotelId } from '@/lib/supabase/hotels';
import { listIcalFeeds } from '@/lib/supabase/ical-feeds';
import { ChannelsClient } from './channels-client';

export const dynamic = 'force-dynamic';

export default async function ChannelSyncPage() {
  const hotels = await getHotels({ skipTranslation: true });
  const activeHotel = hotels[0] ?? null;

  const [roomTypes, feeds] = await Promise.all([
    activeHotel ? getRoomTypesByHotelId(activeHotel.id, { skipTranslation: true }) : Promise.resolve([]),
    listIcalFeeds().catch(() => []),
  ]);

  // Build absolute base URL for export links from the request host.
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? '';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  const baseUrl = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_APP_URL ?? '');

  if (!activeHotel) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Channel Sync</h1>
        <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
          Create a hotel profile first.{' '}
          <Link className="underline" href="/admin/hotels/setup">
            Set up hotel
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ChannelsClient
      baseUrl={baseUrl}
      rooms={roomTypes.map((r) => ({ id: r.id, name: r.name }))}
      feeds={feeds.map((f) => ({
        id: f.id,
        roomTypeId: f.roomTypeId,
        roomTypeName: f.roomTypeName,
        url: f.url,
        label: f.label,
        exportToken: f.exportToken,
        isActive: f.isActive,
        lastSyncedAt: f.lastSyncedAt,
        lastStatus: f.lastStatus,
        lastEventCount: f.lastEventCount,
      }))}
    />
  );
}
