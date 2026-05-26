import { NextResponse } from 'next/server';
import { checkAgencyAccess } from '@/lib/supabase/agency-users';
import { getCurrentAgencyId } from '@/lib/supabase/agencies';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { clearCopilotBearerCache } from '@/lib/ai/copilot-auth';

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

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from('agencies')
    .update({
      copilot_github_token_encrypted: null,
      copilot_user_login: null,
      copilot_plan: null,
      copilot_connected_at: null,
    })
    .eq('id', agencyId);

  if (error) {
    return NextResponse.json(
      { error: 'disconnect_failed', message: error.message },
      { status: 500 }
    );
  }

  clearCopilotBearerCache(agencyId);
  return NextResponse.json({ status: 'ok' });
}
