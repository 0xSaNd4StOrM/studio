'use server';

import { getCurrentAgency } from '@/lib/supabase/agencies';
import { checkAgencyAccess } from '@/lib/supabase/agency-users';

export type CopilotStatus = {
  connected: boolean;
  login: string | null;
  plan: string | null;
  connectedAt: string | null;
  preferences: Record<string, string>;
};

export async function getCopilotStatusForAdmin(): Promise<CopilotStatus | null> {
  const hasAccess = await checkAgencyAccess();
  if (!hasAccess) return null;

  const agency = await getCurrentAgency();
  if (!agency) return null;

  return {
    connected: agency.aiEnabled,
    login: agency.copilotUserLogin ?? null,
    plan: agency.copilotPlan ?? null,
    connectedAt: agency.copilotConnectedAt ?? null,
    preferences: agency.copilotModelPreferences ?? {},
  };
}
