import { createServiceRoleClient } from '@/lib/supabase/server';
import type {
  AgencySkill,
  InstalledSkill,
  Skill,
  SkillCategory,
  SkillReviewStatus,
  SkillToolName,
} from '@/types/skill';

type SkillRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: SkillCategory;
  system_prompt_fragment: string;
  tools_allowed: unknown;
  ui_hints: Record<string, unknown> | null;
  is_public: boolean;
  created_by_agency_id: string | null;
  review_status: SkillReviewStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

type AgencySkillRow = {
  id: string;
  agency_id: string;
  skill_id: string;
  is_enabled: boolean;
  custom_config: Record<string, unknown> | null;
  installed_at: string;
};

function isToolName(value: unknown): value is SkillToolName {
  return (
    typeof value === 'string' &&
    [
      'searchTours',
      'getTourDetails',
      'getPrice',
      'checkAvailability',
      'proposeDiscount',
      'addToCart',
      'reviseItinerary',
      'handoffToHuman',
      'listSkills',
      'linkToTour',
      'lookupBookings',
      'getBookingPaymentStatus',
      'createPaymentLink',
    ].includes(value)
  );
}

function rowToSkill(row: SkillRow): Skill {
  const tools = Array.isArray(row.tools_allowed)
    ? row.tools_allowed.filter(isToolName)
    : [];
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    category: row.category,
    systemPromptFragment: row.system_prompt_fragment,
    toolsAllowed: tools,
    uiHints: (row.ui_hints ?? {}) as Skill['uiHints'],
    isPublic: row.is_public,
    createdByAgencyId: row.created_by_agency_id,
    reviewStatus: row.review_status,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToAgencySkill(row: AgencySkillRow): AgencySkill {
  return {
    id: row.id,
    agencyId: row.agency_id,
    skillId: row.skill_id,
    isEnabled: row.is_enabled,
    customConfig: (row.custom_config ?? {}) as Record<string, unknown>,
    installedAt: row.installed_at,
  };
}

// ─── Catalog reads ───────────────────────────────────────────────────────────

export async function listPublicSkills(): Promise<Skill[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .eq('is_public', true)
    .eq('review_status', 'approved')
    .order('name', { ascending: true });
  if (error) {
    console.error('Failed to list public skills:', error);
    return [];
  }
  return (data as SkillRow[]).map(rowToSkill);
}

export async function listSkillsForAgency(agencyId: string): Promise<Skill[]> {
  // Public + own custom skills.
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .or(
      `and(is_public.eq.true,review_status.eq.approved),created_by_agency_id.eq.${agencyId}`
    )
    .order('name', { ascending: true });
  if (error) {
    console.error('Failed to list skills for agency:', error);
    return [];
  }
  return (data as SkillRow[]).map(rowToSkill);
}

export async function getSkillById(id: string): Promise<Skill | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;
  return rowToSkill(data as SkillRow);
}

export async function getSkillBySlug(slug: string): Promise<Skill | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error || !data) return null;
  return rowToSkill(data as SkillRow);
}

// ─── Catalog writes (custom skills) ──────────────────────────────────────────

export type CreateSkillInput = {
  slug: string;
  name: string;
  description: string;
  category: SkillCategory;
  systemPromptFragment: string;
  toolsAllowed: SkillToolName[];
  uiHints?: Skill['uiHints'];
};

export async function createCustomSkill(
  agencyId: string,
  input: CreateSkillInput
): Promise<Skill> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('skills')
    .insert({
      slug: input.slug,
      name: input.name,
      description: input.description,
      category: input.category,
      system_prompt_fragment: input.systemPromptFragment,
      tools_allowed: input.toolsAllowed,
      ui_hints: input.uiHints ?? {},
      is_public: false,
      created_by_agency_id: agencyId,
      review_status: 'draft',
    })
    .select('*')
    .single();
  if (error) throw new Error(`Failed to create skill: ${error.message}`);
  return rowToSkill(data as SkillRow);
}

export async function updateSkill(
  skillId: string,
  agencyId: string,
  patch: Partial<CreateSkillInput>
): Promise<Skill> {
  const supabase = createServiceRoleClient();
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.slug !== undefined) payload.slug = patch.slug;
  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.description !== undefined) payload.description = patch.description;
  if (patch.category !== undefined) payload.category = patch.category;
  if (patch.systemPromptFragment !== undefined)
    payload.system_prompt_fragment = patch.systemPromptFragment;
  if (patch.toolsAllowed !== undefined) payload.tools_allowed = patch.toolsAllowed;
  if (patch.uiHints !== undefined) payload.ui_hints = patch.uiHints;

  const { data, error } = await supabase
    .from('skills')
    .update(payload)
    .eq('id', skillId)
    .eq('created_by_agency_id', agencyId)
    .select('*')
    .single();
  if (error) throw new Error(`Failed to update skill: ${error.message}`);
  return rowToSkill(data as SkillRow);
}

export async function deleteCustomSkill(skillId: string, agencyId: string): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from('skills')
    .delete()
    .eq('id', skillId)
    .eq('created_by_agency_id', agencyId);
  if (error) throw new Error(`Failed to delete skill: ${error.message}`);
}

export async function submitSkillForReview(
  skillId: string,
  agencyId: string
): Promise<Skill> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('skills')
    .update({
      is_public: true,
      review_status: 'pending',
      updated_at: new Date().toISOString(),
    })
    .eq('id', skillId)
    .eq('created_by_agency_id', agencyId)
    .select('*')
    .single();
  if (error) throw new Error(`Failed to submit for review: ${error.message}`);
  return rowToSkill(data as SkillRow);
}

// ─── Per-agency attachments ──────────────────────────────────────────────────

export async function listInstalledSkills(agencyId: string): Promise<InstalledSkill[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('agency_skills')
    .select('*, skill:skills(*)')
    .eq('agency_id', agencyId)
    .order('installed_at', { ascending: true });
  if (error) {
    console.error('Failed to list installed skills:', error);
    return [];
  }
  const rows = (data ?? []) as Array<AgencySkillRow & { skill: SkillRow }>;
  return rows
    .filter((row) => row.skill)
    .map((row) => ({
      ...rowToAgencySkill(row),
      skill: rowToSkill(row.skill),
    }));
}

export async function listActiveSkills(agencyId: string): Promise<Skill[]> {
  // Only the enabled ones — used by the chat gateway when assembling the
  // system prompt and the tool registry.
  const installed = await listInstalledSkills(agencyId);
  return installed.filter((row) => row.isEnabled).map((row) => row.skill);
}

export async function installSkill(
  agencyId: string,
  skillId: string
): Promise<AgencySkill> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('agency_skills')
    .upsert(
      {
        agency_id: agencyId,
        skill_id: skillId,
        is_enabled: true,
        installed_at: new Date().toISOString(),
      },
      { onConflict: 'agency_id,skill_id' }
    )
    .select('*')
    .single();
  if (error) throw new Error(`Failed to install skill: ${error.message}`);
  return rowToAgencySkill(data as AgencySkillRow);
}

export async function setAgencySkillEnabled(
  agencyId: string,
  agencySkillId: string,
  isEnabled: boolean
): Promise<AgencySkill> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('agency_skills')
    .update({ is_enabled: isEnabled })
    .eq('id', agencySkillId)
    .eq('agency_id', agencyId)
    .select('*')
    .single();
  if (error) throw new Error(`Failed to toggle skill: ${error.message}`);
  return rowToAgencySkill(data as AgencySkillRow);
}

export async function uninstallSkill(
  agencyId: string,
  agencySkillId: string
): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from('agency_skills')
    .delete()
    .eq('id', agencySkillId)
    .eq('agency_id', agencyId);
  if (error) throw new Error(`Failed to uninstall skill: ${error.message}`);
}
