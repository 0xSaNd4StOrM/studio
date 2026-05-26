import type { ChatSurface } from '@/types/ai-chat';
import type { Skill, SkillToolName } from '@/types/skill';
import type { AgencyAiConfig } from '@/types/ai-chat';

import { searchToursTool } from './search-tours';
import { getTourDetailsTool } from './get-tour-details';
import { getPriceTool } from './get-price';
import { checkAvailabilityTool } from './check-availability';
import { handoffToHumanTool } from './handoff-to-human';
import { listSkillsTool } from './list-skills';
import { linkToTourTool } from './link-to-tour';
import { reviseItineraryTool } from './revise-itinerary';
import { proposeDiscountTool } from './propose-discount';
import { addToCartTool } from './add-to-cart';
import { lookupBookingsTool } from './lookup-bookings';
import { getBookingPaymentStatusTool } from './get-booking-payment-status';
import { createPaymentLinkTool } from './create-payment-link';

import type { ChatTool } from './types';

// Always-on tools. Optionally surface-scoped (e.g. `reviseItinerary` only
// exists on the tailor-made chat) and optionally gated by an agency
// capability toggle (e.g. customer-support lookups). Skill restrictions
// never apply to these — they're the agent's baseline capabilities once
// the agency has enabled them.
type AlwaysOnEntry = {
  tool: ChatTool;
  surfaces?: ChatSurface[];
  enabled?: (config: AgencyAiConfig) => boolean;
};

const ALWAYS_ON: AlwaysOnEntry[] = [
  { tool: searchToursTool },
  { tool: getTourDetailsTool },
  { tool: getPriceTool },
  { tool: checkAvailabilityTool },
  { tool: handoffToHumanTool },
  { tool: listSkillsTool },
  { tool: linkToTourTool },
  { tool: reviseItineraryTool, surfaces: ['tailor-made'] },
  {
    tool: lookupBookingsTool,
    enabled: (config) => config.allowBookingLookup,
  },
  {
    tool: getBookingPaymentStatusTool,
    enabled: (config) => config.allowBookingLookup,
  },
  {
    tool: createPaymentLinkTool,
    enabled: (config) => config.allowPaymentLinks,
  },
];

// Tools that exist but require both a config-level capability AND a skill
// to explicitly allow them (e.g. `proposeDiscount` lands when an agency
// has discounts enabled AND has installed a negotiator skill).
const CAPABILITY_GATED: Array<{
  tool: ChatTool;
  enabled: (config: AgencyAiConfig) => boolean;
  surfaces?: ChatSurface[];
}> = [
  {
    tool: proposeDiscountTool,
    enabled: (config) => config.allowDiscounts && config.maxDiscountPct > 0,
  },
  {
    tool: addToCartTool,
    enabled: (config) => config.allowBookingCreation,
  },
];

export function buildToolRegistry(
  config: AgencyAiConfig,
  activeSkills: Skill[],
  surface: ChatSurface
): ChatTool[] {
  // Compute the union of tools that any active skill explicitly allows.
  // If at least one skill mentions a tool, it's reachable. If a skill has
  // toolsAllowed = [], it doesn't restrict — it's an additive contribution
  // (e.g. multilingual just shapes tone, doesn't gate).
  const allowedFromSkills = new Set<SkillToolName>();
  let anySkillContributesGates = false;
  for (const skill of activeSkills) {
    if (skill.toolsAllowed.length > 0) {
      anySkillContributesGates = true;
      for (const t of skill.toolsAllowed) allowedFromSkills.add(t);
    }
  }

  const tools: ChatTool[] = [];

  for (const entry of ALWAYS_ON) {
    if (entry.surfaces && !entry.surfaces.includes(surface)) continue;
    if (entry.enabled && !entry.enabled(config)) continue;
    tools.push(entry.tool);
  }

  for (const entry of CAPABILITY_GATED) {
    if (entry.surfaces && !entry.surfaces.includes(surface)) continue;
    if (!entry.enabled(config)) continue;
    // Capability-gated tools also need at least one active skill to allow
    // them — that's how skills "unlock" the negotiate/cart verbs.
    if (anySkillContributesGates && !allowedFromSkills.has(entry.tool.name)) continue;
    tools.push(entry.tool);
  }

  return tools;
}

// Convert the registry into the `tools` payload the Copilot/OpenAI chat
// completions endpoint expects:
//   [{ type: 'function', function: { name, description, parameters } }, ...]
export function toolsToOpenAiPayload(tools: ChatTool[]): unknown[] {
  return tools.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.jsonSchema,
    },
  }));
}

export type { ChatTool } from './types';
