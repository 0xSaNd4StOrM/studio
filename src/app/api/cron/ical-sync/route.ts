import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { listActiveImportFeeds, syncIcalFeed } from '@/lib/supabase/ical-feeds';

/**
 * GET|POST /api/cron/ical-sync
 *
 * Secret-protected cron endpoint that pulls every active external iCal feed
 * and blocks local inventory for the imported date ranges (decrement-units
 * strategy). Mirrors the auth convention of /api/cron/cart-recovery.
 *
 * Auth: the request must present the `CRON_SECRET` either as the
 *       `x-cron-secret` header OR as a `?secret=` query param (so schedulers
 *       that can't set custom headers — e.g. some pg_cron/Vercel setups — still
 *       work). Returns 503 if `CRON_SECRET` is unset (fail closed), 401 on
 *       mismatch. Both GET and POST are accepted for maximum scheduler
 *       compatibility.
 *
 * Operator: wire a scheduler (Supabase pg_cron / cron-job.org / Vercel Cron) to
 * hit this URL every 15–30 minutes. See docs/cron-ical-sync.md. Hotels can also
 * trigger an immediate sync from Admin → Channel Sync → “Sync now”.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handle(request: Request): Promise<Response> {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    return NextResponse.json({ ok: false, error: 'cron_unconfigured' }, { status: 503 });
  }
  const headerSecret = request.headers.get('x-cron-secret')?.trim();
  const querySecret = new URL(request.url).searchParams.get('secret')?.trim();
  const provided = headerSecret || querySecret;
  if (provided !== cronSecret) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const feeds = await listActiveImportFeeds();
  if (feeds.length === 0) {
    return NextResponse.json({
      ok: true,
      processed: 0,
      note: 'No active import feeds. Add channel feeds in Admin → Channel Sync.',
    });
  }

  const supabase = createServiceRoleClient();
  const nowIso = new Date().toISOString();

  const results = [];
  let imported = 0;
  let failed = 0;
  for (const feed of feeds) {
    const result = await syncIcalFeed(supabase, feed, nowIso);
    results.push(result);
    if (result.ok) imported += result.imported;
    else failed += 1;
  }

  return NextResponse.json({
    ok: true,
    processed: feeds.length,
    imported,
    failed,
    results,
  });
}

export async function POST(request: Request): Promise<Response> {
  return handle(request);
}

export async function GET(request: Request): Promise<Response> {
  return handle(request);
}
