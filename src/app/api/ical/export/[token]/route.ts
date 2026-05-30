import { getExportData } from '@/lib/supabase/ical-feeds';
import { buildIcs } from '@/lib/ical';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/ical/export/<token>
 *
 * Public, tokenized iCal feed of a room type's DIRECT bookings. Hotels paste
 * this URL into Booking.com / Airbnb / Google so those channels block the
 * dates this property has already sold directly. The token is an unguessable
 * UUID; only date ranges are exposed (no guest PII).
 */
function icsStamp(): string {
  // RFC 5545 UTC timestamp: YYYYMMDDТHHMMSSZ
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ token: string }> }
): Promise<Response> {
  const { token } = await ctx.params;
  const cleanToken = (token || '').trim();
  if (!/^[0-9a-f-]{8,}$/i.test(cleanToken)) {
    return new Response('Not found', { status: 404 });
  }

  const data = await getExportData(cleanToken).catch(() => null);
  if (!data) {
    return new Response('Not found', { status: 404 });
  }

  const ics = buildIcs({
    events: data.events,
    calName: `${data.agencyName} — ${data.roomTypeName}`,
    dtstamp: icsStamp(),
  });

  return new Response(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="availability-${cleanToken.slice(0, 8)}.ics"`,
      'Cache-Control': 'public, max-age=300',
    },
  });
}
