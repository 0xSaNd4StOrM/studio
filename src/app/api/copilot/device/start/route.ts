import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { checkAgencyAccess } from '@/lib/supabase/agency-users';
import { getCurrentAgencyId } from '@/lib/supabase/agencies';
import { requestDeviceCode } from '@/lib/ai/copilot-auth';
import { putDeviceSession } from '@/lib/ai/copilot-device-sessions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(): Promise<Response> {
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

  try {
    const deviceCode = await requestDeviceCode();
    const sessionId = randomUUID();
    putDeviceSession(sessionId, {
      agencyId,
      deviceCode: deviceCode.device_code,
      userCode: deviceCode.user_code,
      verificationUri: deviceCode.verification_uri,
      interval: deviceCode.interval,
      expiresAt: Date.now() + deviceCode.expires_in * 1000,
    });
    return NextResponse.json({
      sessionId,
      userCode: deviceCode.user_code,
      verificationUri: deviceCode.verification_uri,
      expiresIn: deviceCode.expires_in,
      interval: deviceCode.interval,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    return NextResponse.json({ error: 'device_code_failed', message }, { status: 502 });
  }
}
