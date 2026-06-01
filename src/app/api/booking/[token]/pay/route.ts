import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getAgencyAiConfig } from '@/lib/supabase/agency-ai-config';
import { buildKashierHppUrl } from '@/lib/kashier';
import { fetchUsdToEgp, usdToEgp } from '@/lib/fx';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/booking/[token]/pay
 *
 * Mints a fresh Kashier checkout URL for the pending booking behind this
 * share token, then 302-redirects to it. The share token IS the auth — if
 * you have the link, you're presumed to be the visitor or someone they
 * shared it with (likely paying for them).
 */
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ token: string }> }
): Promise<Response> {
  const { token } = await ctx.params;
  if (!token || !/^[a-f0-9]{32,64}$/i.test(token)) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 404 });
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('bookings')
    .select(
      'id, agency_id, customer_email, customer_name, phone_number, total_price, status, share_expires_at'
    )
    .eq('share_token', token)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const row = data as {
    id: string;
    agency_id: string;
    customer_email: string;
    customer_name: string;
    phone_number: string | null;
    total_price: number;
    status: 'Confirmed' | 'Pending' | 'Cancelled';
    share_expires_at: string | null;
  };

  if (row.share_expires_at) {
    const expires = new Date(row.share_expires_at).getTime();
    if (Number.isFinite(expires) && expires <= Date.now()) {
      return NextResponse.json({ error: 'expired' }, { status: 404 });
    }
  }

  if (row.status === 'Confirmed') {
    return NextResponse.redirect(new URL(`/booking/${token}`, _request.url));
  }
  if (row.status === 'Cancelled') {
    return NextResponse.json({ error: 'cancelled' }, { status: 410 });
  }

  // Agency-level toggle. If the agency hasn't enabled payment links, this
  // route mirrors the chat tool — refuse cleanly with a redirect back to
  // the share page (which will surface agency contact info).
  const config = await getAgencyAiConfig(row.agency_id);
  if (!config.allowPaymentLinks) {
    return NextResponse.redirect(new URL(`/booking/${token}`, _request.url));
  }

  const rate = await fetchUsdToEgp();
  const amountEgp = usdToEgp(row.total_price, rate);

  try {
    const paymentUrl = await buildKashierHppUrl({
      merchantOrderId: row.id,
      amount: amountEgp,
      customer: {
        name: row.customer_name,
        email: row.customer_email,
        mobile: row.phone_number ?? undefined,
      },
    });
    return NextResponse.redirect(paymentUrl);
  } catch (err) {
    // Kashier creds missing — send the visitor back to the share page.
    const message = err instanceof Error ? err.message : 'kashier_unconfigured';
    console.error('Pay-via-share failed:', message);
    return NextResponse.redirect(new URL(`/booking/${token}`, _request.url));
  }
}
