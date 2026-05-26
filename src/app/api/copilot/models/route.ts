import { NextResponse } from 'next/server';
import { checkAgencyAccess } from '@/lib/supabase/agency-users';
import { getCurrentAgencyId } from '@/lib/supabase/agencies';
import { fetchCopilotModels } from '@/lib/ai/copilot-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
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
    const models = await fetchCopilotModels(agencyId);
    return NextResponse.json({ models });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    return NextResponse.json({ error: 'models_failed', message }, { status: 502 });
  }
}
