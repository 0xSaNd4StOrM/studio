import type { Agency } from '@/types';

export const AI_FEATURES = [
  'tour-generation',
  'cart-suggestions',
  'blog-draft',
  'tour-draft',
  'advanced-plan',
  'seo-assist',
  'chat',
] as const;
export type AiFeature = (typeof AI_FEATURES)[number];

export interface ModelOption {
  id: string;
  label: string;
  tier: 'free' | 'premium';
  goodFor: AiFeature[];
}

// Static fallback list. At runtime, the connect card replaces this with the
// real model list returned by Copilot's /models endpoint for the agency's
// account — so the dropdown always reflects what's actually callable. This
// static list is only used before that fetch completes (and as the gateway's
// fallback if the user hasn't picked anything yet).
export const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: 'gpt-5-mini',
    label: 'GPT-5 Mini',
    tier: 'free',
    goodFor: ['cart-suggestions', 'seo-assist', 'tour-generation', 'tour-draft', 'blog-draft', 'advanced-plan'],
  },
  {
    id: 'gpt-4.1',
    label: 'GPT-4.1',
    tier: 'free',
    goodFor: ['tour-draft', 'blog-draft', 'advanced-plan', 'tour-generation'],
  },
];

export const DEFAULT_MODEL_FOR_FEATURE: Record<AiFeature, string> = {
  'tour-generation': 'gpt-4.1',
  'cart-suggestions': 'gpt-5-mini',
  'blog-draft': 'gpt-4.1',
  'tour-draft': 'gpt-4.1',
  'advanced-plan': 'gpt-4.1',
  'seo-assist': 'gpt-5-mini',
  // Chat needs fast time-to-first-token; gpt-5-mini is the snappier of the
  // two confirmed-working models. Admins can override per-feature in settings.
  chat: 'gpt-5-mini',
};

export const FEATURE_LABELS: Record<AiFeature, string> = {
  'tour-generation': 'Tour generation',
  'cart-suggestions': 'Cart suggestions',
  'blog-draft': 'Blog drafts',
  'tour-draft': 'Tour bootstrap',
  'advanced-plan': 'Advanced plans',
  'seo-assist': 'SEO metadata',
  chat: 'AI Concierge chat',
};

export function isAiFeature(value: unknown): value is AiFeature {
  return typeof value === 'string' && (AI_FEATURES as readonly string[]).includes(value);
}

export function isAvailableModel(modelId: unknown): modelId is string {
  return typeof modelId === 'string' && AVAILABLE_MODELS.some((m) => m.id === modelId);
}

export function resolveModelForAgency(
  agency: Pick<Agency, 'copilotModelPreferences'> | null | undefined,
  feature: AiFeature
): string {
  const prefs = agency?.copilotModelPreferences ?? {};
  const chosen = prefs[feature];
  // Trust whatever the agency picked in settings — that list comes straight
  // from Copilot's /models endpoint, so it's known callable. Only fall back
  // to defaults when nothing is set.
  if (typeof chosen === 'string' && chosen.length > 0) return chosen;
  return DEFAULT_MODEL_FOR_FEATURE[feature];
}

export function modelsForFeature(feature: AiFeature, chosen?: string): string[] {
  const primary =
    typeof chosen === 'string' && chosen.length > 0 ? chosen : DEFAULT_MODEL_FOR_FEATURE[feature];
  // Single low-risk fallback to the universally-available gpt-5-mini. We
  // avoid longer fallback chains so a misconfigured model id doesn't burn
  // 4 sequential 30s requests before surfacing the error.
  const fallback = primary === 'gpt-5-mini' ? 'gpt-4.1' : 'gpt-5-mini';
  return [primary, fallback];
}
