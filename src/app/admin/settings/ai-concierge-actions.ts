'use server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { getCurrentAgency } from '@/lib/supabase/agencies';
import { checkAgencyAccess } from '@/lib/supabase/agency-users';
import {
  getAgencyAiConfig,
  upsertAgencyAiConfig,
  type AgencyAiConfigUpdate,
} from '@/lib/supabase/agency-ai-config';
import {
  getSkillBySlug,
  installSkill,
  listInstalledSkills,
} from '@/lib/supabase/skills';
import type { AgencyAiConfig } from '@/types/ai-chat';

// Skills auto-installed on first AI Concierge admin visit. Slugs only —
// they refer to the public seeded rows (see Sprint α migration).
const BOOTSTRAP_SKILL_SLUGS = ['friendly-concierge', 'egypt-specialist'] as const;

export type AiConciergeStatus =
  | {
      ok: true;
      copilotConnected: boolean;
      config: AgencyAiConfig;
    }
  | {
      ok: false;
      reason: 'unauthorized' | 'agency_not_found';
    };

export async function getAiConciergeStatus(): Promise<AiConciergeStatus> {
  const hasAccess = await checkAgencyAccess();
  if (!hasAccess) return { ok: false, reason: 'unauthorized' };

  const agency = await getCurrentAgency();
  if (!agency) return { ok: false, reason: 'agency_not_found' };

  // Run a best-effort bootstrap on first visit. Idempotent — once the
  // config row exists or any skills are installed, this becomes a no-op.
  if (agency.aiEnabled) {
    await maybeBootstrapAiDefaults(agency.id);
  }

  const config = await getAgencyAiConfig(agency.id);
  return {
    ok: true,
    copilotConnected: Boolean(agency.aiEnabled),
    config,
  };
}

/**
 * First-visit bootstrap: when an agency has just connected Copilot and
 * lands on the AI Concierge page, give them sensible defaults so the
 * widget is usable without poking 7 toggles. Skipped if either the
 * config row OR any installed skill already exists.
 */
async function maybeBootstrapAiDefaults(agencyId: string): Promise<void> {
  const supabase = createServiceRoleClient();

  // Cheap presence check — if either signal indicates the agency has
  // touched the AI setup, leave their work alone.
  const [{ data: existingConfig }, installed] = await Promise.all([
    supabase
      .from('agency_ai_config')
      .select('agency_id')
      .eq('agency_id', agencyId)
      .maybeSingle(),
    listInstalledSkills(agencyId),
  ]);

  if (existingConfig) return; // they already saved something
  if (installed.length > 0) return; // they already installed at least one skill

  // 1) Seed the config row with sensible defaults.
  try {
    await upsertAgencyAiConfig(agencyId, {
      showConciergeWidget: true,
      allowBookingCreation: true,
      allowNegotiation: false,
      allowDiscounts: false,
      maxDiscountPct: 0,
      greetingDelaySeconds: 8,
    });
  } catch (error) {
    // Bootstrap is best-effort — never block the admin page.
    console.error('AI bootstrap (config) failed:', error);
  }

  // 2) Install the two starter skills if they're available.
  for (const slug of BOOTSTRAP_SKILL_SLUGS) {
    try {
      const skill = await getSkillBySlug(slug);
      if (!skill) continue;
      await installSkill(agencyId, skill.id);
    } catch (error) {
      console.error(`AI bootstrap (install ${slug}) failed:`, error);
    }
  }
}

export type UpdateAiConciergeResult =
  | { ok: true; config: AgencyAiConfig }
  | { ok: false; error: string };

const ALLOWED_KEYS: ReadonlyArray<keyof AgencyAiConfigUpdate> = [
  'agentName',
  'greeting',
  'personaPrompt',
  'knowledgeText',
  'rulesText',
  'allowNegotiation',
  'allowDiscounts',
  'maxDiscountPct',
  'allowBookingCreation',
  'showConciergeWidget',
  'greetingDelaySeconds',
  'dataAccess',
  'allowBookingLookup',
  'allowPaymentLinks',
];

export async function updateAiConciergeConfig(
  patch: AgencyAiConfigUpdate
): Promise<UpdateAiConciergeResult> {
  const hasAccess = await checkAgencyAccess();
  if (!hasAccess) return { ok: false, error: 'Unauthorized.' };

  const agency = await getCurrentAgency();
  if (!agency) return { ok: false, error: 'Agency context not found.' };

  // Whitelist input — silently drop unknown keys.
  const sanitized: AgencyAiConfigUpdate = {};
  for (const key of ALLOWED_KEYS) {
    const value = patch[key];
    if (value === undefined) continue;
    // Narrow per-field with the same idea as the supabase helper; we trust
    // the patch keys but coerce/cap as appropriate.
    if (key === 'maxDiscountPct') {
      const n = typeof value === 'number' ? value : Number(value);
      if (!Number.isFinite(n)) continue;
      sanitized.maxDiscountPct = Math.min(100, Math.max(0, Math.round(n)));
    } else if (key === 'greetingDelaySeconds') {
      const n = typeof value === 'number' ? value : Number(value);
      if (!Number.isFinite(n)) continue;
      sanitized.greetingDelaySeconds = Math.min(120, Math.max(0, Math.round(n)));
    } else if (key === 'agentName' || key === 'greeting') {
      const s = typeof value === 'string' ? value.trim() : '';
      if (!s) continue;
      sanitized[key] = s.slice(0, 120);
    } else if (key === 'personaPrompt' || key === 'knowledgeText' || key === 'rulesText') {
      const s = typeof value === 'string' ? value : '';
      sanitized[key] = s.slice(0, 8000);
    } else if (
      key === 'allowNegotiation' ||
      key === 'allowDiscounts' ||
      key === 'allowBookingCreation' ||
      key === 'showConciergeWidget' ||
      key === 'allowBookingLookup' ||
      key === 'allowPaymentLinks'
    ) {
      sanitized[key] = Boolean(value);
    } else if (key === 'dataAccess') {
      if (value && typeof value === 'object') {
        const da = value as Record<string, unknown>;
        sanitized.dataAccess = {
          public_catalog: Boolean(da.public_catalog ?? true),
          prices: Boolean(da.prices ?? true),
          availability: Boolean(da.availability ?? true),
          admin_notes: Boolean(da.admin_notes ?? false),
          review_text: Boolean(da.review_text ?? false),
        };
      }
    }
  }

  try {
    const config = await upsertAgencyAiConfig(agency.id, sanitized);
    return { ok: true, config };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to save AI config.',
    };
  }
}
