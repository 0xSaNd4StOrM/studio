import { NextResponse } from 'next/server';
import { checkAgencyAccess } from '@/lib/supabase/agency-users';
import { getCurrentAgencyId } from '@/lib/supabase/agencies';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { isAiFeature, isAvailableModel } from '@/lib/ai/models';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PreferencesBody = {
  feature?: unknown;
  model?: unknown;
};

export async function POST(request: Request): Promise<Response> {
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

  let body: PreferencesBody;
  try {
    body = (await request.json()) as PreferencesBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!isAiFeature(body.feature)) {
    return NextResponse.json({ error: 'invalid_feature' }, { status: 400 });
  }
  if (!isAvailableModel(body.model)) {
    return NextResponse.json({ error: 'invalid_model' }, { status: 400 });
  }

  const feature = body.feature;
  const model = body.model;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('agencies')
    .select('copilot_model_preferences')
    .eq('id', agencyId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: 'load_failed', message: error.message }, { status: 500 });
  }

  const current =
    data?.copilot_model_preferences && typeof data.copilot_model_preferences === 'object'
      ? (data.copilot_model_preferences as Record<string, unknown>)
      : {};
  const updated = { ...current, [feature]: model };

  const { error: updateError } = await supabase
    .from('agencies')
    .update({ copilot_model_preferences: updated })
    .eq('id', agencyId);

  if (updateError) {
    return NextResponse.json(
      { error: 'save_failed', message: updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ status: 'ok', preferences: updated });
}
