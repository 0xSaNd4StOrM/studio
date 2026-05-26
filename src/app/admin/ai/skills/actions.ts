'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getCurrentAgency } from '@/lib/supabase/agencies';
import { checkAgencyAccess } from '@/lib/supabase/agency-users';
import {
  createCustomSkill,
  deleteCustomSkill,
  getSkillById,
  installSkill,
  listInstalledSkills,
  listSkillsForAgency,
  listPublicSkills,
  setAgencySkillEnabled,
  submitSkillForReview,
  uninstallSkill,
  updateSkill,
  type CreateSkillInput,
} from '@/lib/supabase/skills';
import { generateStructuredWithCopilot } from '@/lib/ai/copilot';
import type { InstalledSkill, Skill, SkillCategory, SkillToolName } from '@/types/skill';

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

const SKILL_TOOL_NAMES = new Set<SkillToolName>([
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
]);

const SKILL_CATEGORIES = new Set<SkillCategory>(['persona', 'sales', 'service', 'specialty']);

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function requireAgency(): Promise<{ id: string; name: string } | null> {
  const hasAccess = await checkAgencyAccess();
  if (!hasAccess) return null;
  const agency = await getCurrentAgency();
  if (!agency) return null;
  return { id: agency.id, name: agency.name };
}

// ─── Reads ───────────────────────────────────────────────────────────────────

export async function getInstalledSkillsForAdmin(): Promise<ActionResult<InstalledSkill[]>> {
  const agency = await requireAgency();
  if (!agency) return { ok: false, error: 'Unauthorized.' };
  const installed = await listInstalledSkills(agency.id);
  return { ok: true, data: installed };
}

export async function getStoreSkillsForAdmin(): Promise<ActionResult<Skill[]>> {
  const agency = await requireAgency();
  if (!agency) return { ok: false, error: 'Unauthorized.' };
  const skills = await listPublicSkills();
  return { ok: true, data: skills };
}

export async function getAvailableSkillsForAdmin(): Promise<ActionResult<Skill[]>> {
  // Public + own custom skills.
  const agency = await requireAgency();
  if (!agency) return { ok: false, error: 'Unauthorized.' };
  const skills = await listSkillsForAgency(agency.id);
  return { ok: true, data: skills };
}

export async function getSkillForAdmin(skillId: string): Promise<ActionResult<Skill>> {
  const agency = await requireAgency();
  if (!agency) return { ok: false, error: 'Unauthorized.' };
  const skill = await getSkillById(skillId);
  if (!skill) return { ok: false, error: 'Skill not found.' };
  // Custom skills are only readable by their author agency. Public approved
  // skills are readable by anyone.
  if (skill.createdByAgencyId && skill.createdByAgencyId !== agency.id) {
    if (!(skill.isPublic && skill.reviewStatus === 'approved')) {
      return { ok: false, error: 'Skill not found.' };
    }
  }
  return { ok: true, data: skill };
}

// ─── Installation toggles ────────────────────────────────────────────────────

export async function installSkillAction(skillId: string): Promise<ActionResult<null>> {
  const agency = await requireAgency();
  if (!agency) return { ok: false, error: 'Unauthorized.' };

  // Verify the skill is installable for this agency: public+approved, OR
  // owned by this agency. Reject anything else.
  const skill = await getSkillById(skillId);
  if (!skill) return { ok: false, error: 'Skill not found.' };
  const isPublicApproved = skill.isPublic && skill.reviewStatus === 'approved';
  const isOwn = skill.createdByAgencyId === agency.id;
  if (!isPublicApproved && !isOwn) {
    return { ok: false, error: 'You can only install public skills or your own custom skills.' };
  }

  try {
    await installSkill(agency.id, skillId);
    revalidatePath('/admin/ai/skills');
    revalidatePath('/admin/ai/skills/store');
    return { ok: true, data: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to install skill.',
    };
  }
}

export async function setSkillEnabledAction(
  agencySkillId: string,
  enabled: boolean
): Promise<ActionResult<null>> {
  const agency = await requireAgency();
  if (!agency) return { ok: false, error: 'Unauthorized.' };
  try {
    await setAgencySkillEnabled(agency.id, agencySkillId, enabled);
    revalidatePath('/admin/ai/skills');
    return { ok: true, data: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to toggle skill.',
    };
  }
}

export async function uninstallSkillAction(
  agencySkillId: string
): Promise<ActionResult<null>> {
  const agency = await requireAgency();
  if (!agency) return { ok: false, error: 'Unauthorized.' };
  try {
    await uninstallSkill(agency.id, agencySkillId);
    revalidatePath('/admin/ai/skills');
    revalidatePath('/admin/ai/skills/store');
    return { ok: true, data: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to uninstall skill.',
    };
  }
}

// ─── Custom skill CRUD ───────────────────────────────────────────────────────

export type CustomSkillFormInput = {
  name: string;
  description: string;
  category: SkillCategory;
  systemPromptFragment: string;
  toolsAllowed: SkillToolName[];
};

function validateCustomSkillInput(input: CustomSkillFormInput): string | null {
  if (!input.name?.trim() || input.name.trim().length < 3) {
    return 'Name must be at least 3 characters.';
  }
  if (input.name.length > 80) return 'Name is too long (max 80 chars).';
  if (!input.description?.trim() || input.description.trim().length < 10) {
    return 'Description must be at least 10 characters.';
  }
  if (!SKILL_CATEGORIES.has(input.category)) {
    return 'Invalid category.';
  }
  if (!input.systemPromptFragment?.trim() || input.systemPromptFragment.trim().length < 20) {
    return 'System prompt must be at least 20 characters.';
  }
  if (input.systemPromptFragment.length > 20000) {
    return 'System prompt is too long (max 20000 chars).';
  }
  if (!Array.isArray(input.toolsAllowed)) {
    return 'Tools must be a list.';
  }
  for (const t of input.toolsAllowed) {
    if (!SKILL_TOOL_NAMES.has(t)) {
      return `Unknown tool: ${String(t)}`;
    }
  }
  return null;
}

export async function createCustomSkillAction(
  input: CustomSkillFormInput
): Promise<ActionResult<Skill>> {
  const agency = await requireAgency();
  if (!agency) return { ok: false, error: 'Unauthorized.' };

  const validationError = validateCustomSkillInput(input);
  if (validationError) return { ok: false, error: validationError };

  // Slug is auto-generated from name + agency-id prefix to keep uniqueness
  // across the global skills table without colliding with seeded slugs.
  const baseSlug = slugify(input.name) || 'custom';
  const slug = `${agency.id.slice(0, 8)}-${baseSlug}`.slice(0, 80);

  const payload: CreateSkillInput = {
    slug,
    name: input.name.trim(),
    description: input.description.trim(),
    category: input.category,
    systemPromptFragment: input.systemPromptFragment.trim(),
    toolsAllowed: input.toolsAllowed,
  };

  try {
    const skill = await createCustomSkill(agency.id, payload);
    revalidatePath('/admin/ai/skills');
    return { ok: true, data: skill };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to create skill.',
    };
  }
}

export async function updateCustomSkillAction(
  skillId: string,
  input: CustomSkillFormInput
): Promise<ActionResult<Skill>> {
  const agency = await requireAgency();
  if (!agency) return { ok: false, error: 'Unauthorized.' };

  const validationError = validateCustomSkillInput(input);
  if (validationError) return { ok: false, error: validationError };

  try {
    const skill = await updateSkill(skillId, agency.id, {
      name: input.name.trim(),
      description: input.description.trim(),
      category: input.category,
      systemPromptFragment: input.systemPromptFragment.trim(),
      toolsAllowed: input.toolsAllowed,
    });
    revalidatePath('/admin/ai/skills');
    revalidatePath(`/admin/ai/skills/custom/${skillId}/edit`);
    return { ok: true, data: skill };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to update skill.',
    };
  }
}

export async function deleteCustomSkillAction(
  skillId: string
): Promise<ActionResult<null>> {
  const agency = await requireAgency();
  if (!agency) return { ok: false, error: 'Unauthorized.' };
  try {
    await deleteCustomSkill(skillId, agency.id);
    revalidatePath('/admin/ai/skills');
    return { ok: true, data: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to delete skill.',
    };
  }
}

export async function submitSkillForReviewAction(
  skillId: string
): Promise<ActionResult<Skill>> {
  const agency = await requireAgency();
  if (!agency) return { ok: false, error: 'Unauthorized.' };
  try {
    const skill = await submitSkillForReview(skillId, agency.id);
    revalidatePath('/admin/ai/skills');
    return { ok: true, data: skill };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to submit for review.',
    };
  }
}

// ─── AI-drafted skill ────────────────────────────────────────────────────────

const ALLOWED_TOOL_NAMES = Array.from(SKILL_TOOL_NAMES) as [SkillToolName, ...SkillToolName[]];

const SkillDraftSchema = z.object({
  name: z.string().min(3).max(80),
  description: z.string().min(10).max(300),
  category: z.enum(['persona', 'sales', 'service', 'specialty']),
  systemPromptFragment: z.string().min(40).max(20000),
  toolsAllowed: z.array(z.enum(ALLOWED_TOOL_NAMES)).default([]),
});

export type DraftedSkill = z.infer<typeof SkillDraftSchema>;

export async function draftSkillWithAi(
  brief: string
): Promise<ActionResult<DraftedSkill>> {
  const agency = await requireAgency();
  if (!agency) return { ok: false, error: 'Unauthorized.' };
  if (!agency.name) return { ok: false, error: 'Agency context missing.' };

  const trimmedBrief = brief.trim();
  if (trimmedBrief.length < 10) {
    return {
      ok: false,
      error: 'Tell the AI a bit more about the skill (at least 10 characters).',
    };
  }
  if (trimmedBrief.length > 2000) {
    return { ok: false, error: 'Brief is too long (max 2000 chars).' };
  }

  const toolList = ALLOWED_TOOL_NAMES.join(', ');

  try {
    const drafted = await generateStructuredWithCopilot({
      // Reuses the same model preference as blog drafting — structured
      // creative output of similar shape.
      feature: 'blog-draft',
      schema: SkillDraftSchema,
      systemPrompt:
        'You are a skill author for an AI travel concierge. You receive a brief and produce a structured Skill object describing how the agent should behave. Return strict JSON only.',
      userPrompt: `Draft a new skill from this brief.

BRIEF (from the agency owner):
${trimmedBrief}

OUTPUT SCHEMA — every field is REQUIRED:
{
  "name": string,                       // 3-80 chars, marketing-friendly
  "description": string,                // 10-300 chars, one-line summary
  "category": "persona" | "sales" | "service" | "specialty",
  "systemPromptFragment": string,       // 40-20000 chars, the directive
  "toolsAllowed": string[]              // subset of: ${toolList}
}

RULES:
- The systemPromptFragment must be a directive written TO an AI assistant — start with "When …" or similar; tell it what to do, in what tone, and when.
- Pick toolsAllowed conservatively. Empty array is fine for persona-only skills.
- Category picks:
  - persona: shapes tone/voice
  - sales: drives bookings (negotiation, urgency, upsell)
  - service: helps the visitor or handles communication
  - specialty: domain expertise
- Don't repeat the agent name or platform-wide rules — those live elsewhere.
- Return ONLY the JSON object. No prose, no markdown fences.`,
      temperature: 0.5,
    });

    // Final guard: toolsAllowed may contain values the LLM made up; filter
    // to the whitelist server-side. The zod enum should catch this but
    // belt-and-braces.
    const safeTools = drafted.toolsAllowed.filter((t) => SKILL_TOOL_NAMES.has(t));

    return {
      ok: true,
      data: {
        ...drafted,
        toolsAllowed: safeTools,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? `AI drafter failed: ${error.message}`
          : 'AI drafter failed for unknown reason.',
    };
  }
}
