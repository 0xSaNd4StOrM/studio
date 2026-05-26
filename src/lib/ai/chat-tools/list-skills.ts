import { z } from 'zod';
import { listActiveSkills } from '@/lib/supabase/skills';
import type { ChatTool } from './types';
import { zodToJsonSchema } from './zod-to-schema';

const parameters = z
  .object({})
  .describe('No arguments — returns the active skill list for this agency.');

export const listSkillsTool: ChatTool = {
  name: 'listSkills',
  description:
    'List the skills currently active on this agent. Use when the visitor asks "what can you help with?" or you need to self-describe your capabilities.',
  parameters,
  jsonSchema: zodToJsonSchema(parameters),
  async handler(_rawArgs, ctx) {
    const skills = await listActiveSkills(ctx.agencyId);
    return {
      result: {
        count: skills.length,
        skills: skills.map((s) => ({
          slug: s.slug,
          name: s.name,
          description: s.description,
          category: s.category,
        })),
      },
    };
  },
};
