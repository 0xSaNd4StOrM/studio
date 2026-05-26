// Parses an uploaded `.md` skill file into the fields the editor form
// expects. Format is a deliberately tiny subset of YAML frontmatter —
// no library, no surprises.
//
//   ---
//   name: My Skill
//   description: Short summary shown in the store.
//   category: sales            (one of: persona | sales | service | specialty)
//   tools: [proposeDiscount, addToCart]
//   ---
//
//   System prompt fragment goes here. Multi-paragraph is fine.
//
// Behavior:
//   - Frontmatter MUST start at the very first character of the file
//     and end with `---` on its own line. Otherwise the whole file
//     becomes the prompt body and other fields stay user-editable.
//   - Unknown frontmatter keys are silently ignored.
//   - Invalid category / tools are collected as `warnings` so the UI
//     can show them — the rest of the parse still succeeds.

import type { SkillCategory, SkillToolName } from '@/types/skill';

const VALID_CATEGORIES: ReadonlySet<SkillCategory> = new Set([
  'persona',
  'sales',
  'service',
  'specialty',
]);

const VALID_TOOLS: ReadonlySet<SkillToolName> = new Set([
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

export type ParsedSkillMarkdown = {
  name?: string;
  description?: string;
  category?: SkillCategory;
  toolsAllowed?: SkillToolName[];
  systemPromptFragment: string;
  /** Non-fatal issues to surface in the UI (e.g. unknown tool ignored). */
  warnings: string[];
};

function stripQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function parseInlineList(value: string): string[] {
  // Accepts `[a, b, c]` or comma-separated bare values.
  let inner = value;
  if (value.startsWith('[') && value.endsWith(']')) {
    inner = value.slice(1, -1);
  }
  return inner
    .split(',')
    .map((part) => stripQuotes(part.trim()))
    .filter((part) => part.length > 0);
}

function applyFrontmatterLine(line: string, result: ParsedSkillMarkdown): void {
  const colon = line.indexOf(':');
  if (colon < 0) return;
  const key = line.slice(0, colon).trim().toLowerCase();
  const value = line.slice(colon + 1).trim();
  if (!key || !value) return;

  switch (key) {
    case 'name':
      result.name = stripQuotes(value).slice(0, 80);
      break;
    case 'description':
      result.description = stripQuotes(value).slice(0, 300);
      break;
    case 'category': {
      const candidate = stripQuotes(value).toLowerCase() as SkillCategory;
      if (VALID_CATEGORIES.has(candidate)) {
        result.category = candidate;
      } else {
        result.warnings.push(`Unknown category "${value}" — left as the form's current value.`);
      }
      break;
    }
    case 'tools': {
      const items = parseInlineList(value);
      const valid: SkillToolName[] = [];
      for (const item of items) {
        if (VALID_TOOLS.has(item as SkillToolName)) {
          valid.push(item as SkillToolName);
        } else {
          result.warnings.push(`Unknown tool "${item}" — ignored.`);
        }
      }
      result.toolsAllowed = Array.from(new Set(valid));
      break;
    }
    default:
      // Unknown key — silently ignored.
      break;
  }
}

export function parseSkillMarkdown(raw: string): ParsedSkillMarkdown {
  const text = raw.replace(/^﻿/, ''); // strip BOM
  const result: ParsedSkillMarkdown = {
    systemPromptFragment: '',
    warnings: [],
  };

  // Detect frontmatter: must start with `---\n` and contain a closing
  // `---` on its own line.
  if (text.startsWith('---\n') || text.startsWith('---\r\n')) {
    const start = text.startsWith('---\r\n') ? 5 : 4;
    const remainder = text.slice(start);
    const closeIndex = remainder.search(/^---\s*$/m);
    if (closeIndex >= 0) {
      const fmBlock = remainder.slice(0, closeIndex);
      const body = remainder.slice(closeIndex).replace(/^---\s*\r?\n?/, '');

      for (const line of fmBlock.split('\n')) {
        const trimmed = line.replace(/\r$/, '').trim();
        if (!trimmed) continue;
        applyFrontmatterLine(trimmed, result);
      }
      result.systemPromptFragment = body.trim().slice(0, 20000);
      return result;
    }
  }

  // No frontmatter — whole file becomes the prompt body.
  result.systemPromptFragment = text.trim().slice(0, 20000);
  return result;
}
