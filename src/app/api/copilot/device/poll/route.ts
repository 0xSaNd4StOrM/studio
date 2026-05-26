import { NextResponse } from 'next/server';
import { checkAgencyAccess } from '@/lib/supabase/agency-users';
import { getCurrentAgencyId } from '@/lib/supabase/agencies';
import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  clearCopilotBearerCache,
  exchangeForCopilotBearer,
  fetchGitHubUser,
  pollAccessToken,
} from '@/lib/ai/copilot-auth';
import {
  deleteDeviceSession,
  getDeviceSession,
} from '@/lib/ai/copilot-device-sessions';
import { encryptToken } from '@/lib/ai/crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const hasAccess = await checkAgencyAccess();
  if (!hasAccess) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let agencyId: string;
  try {
    agencyId = await getCurrentAgencyId();
  } catch {
    return NextResponse.json({ error: 'agency_unresolved' }, { status: 400 });
  }

  const url = new URL(request.url);
  const sessionId = url.searchParams.get('id');
  if (!sessionId) {
    return NextResponse.json({ error: 'missing_session' }, { status: 400 });
  }

  const session = getDeviceSession(sessionId);
  if (!session) {
    return NextResponse.json({ status: 'error', code: 'expired_session' }, { status: 404 });
  }
  if (session.agencyId !== agencyId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const result = await pollAccessToken(session.deviceCode);

  if (result.status === 'pending') {
    return NextResponse.json({ status: 'pending' });
  }
  if (result.status === 'slow_down') {
    return NextResponse.json({ status: 'pending', interval: result.interval });
  }
  if (result.status === 'error') {
    deleteDeviceSession(sessionId);
    return NextResponse.json({ status: 'error', code: result.code, message: result.description });
  }

  // status === 'success'
  const githubToken = result.accessToken;

  try {
    const [bearer, user] = await Promise.all([
      exchangeForCopilotBearer(githubToken),
      fetchGitHubUser(githubToken),
    ]);

    const planFromCopilot = typeof bearer.raw.sku === 'string' ? bearer.raw.sku : null;

    const encrypted = encryptToken(githubToken);
    const supabase = createServiceRoleClient();
    const { error } = await supabase
      .from('agencies')
      .update({
        copilot_github_token_encrypted: encrypted,
        copilot_user_login: user.login,
        copilot_plan: planFromCopilot,
        copilot_connected_at: new Date().toISOString(),
      })
      .eq('id', agencyId);

    if (error) {
      throw new Error(`Failed to persist Copilot token: ${error.message}`);
    }

    clearCopilotBearerCache(agencyId);
    deleteDeviceSession(sessionId);

    return NextResponse.json({
      status: 'connected',
      login: user.login,
      plan: planFromCopilot,
    });
  } catch (error) {
    deleteDeviceSession(sessionId);
    const message = error instanceof Error ? error.message : 'unknown error';
    return NextResponse.json(
      { status: 'error', code: 'copilot_exchange_failed', message },
      { status: 502 }
    );
  }
}
