import { createServiceRoleClient } from '@/lib/supabase/server';
import type { AgencyAiConfig, AgencyAiPublic, ChatDataAccess } from '@/types/ai-chat';

type AgencyAiConfigRow = {
  agency_id: string;
  agent_name: string;
  greeting: string;
  persona_prompt: string;
  knowledge_text: string;
  rules_text: string;
  allow_negotiation: boolean;
  allow_discounts: boolean;
  max_discount_pct: number;
  allow_booking_creation: boolean;
  show_concierge_widget: boolean;
  greeting_delay_seconds: number;
  data_access: Record<string, unknown> | null;
  allow_booking_lookup: boolean | null;
  allow_payment_links: boolean | null;
  updated_at: string;
};

const DEFAULT_DATA_ACCESS: ChatDataAccess = {
  public_catalog: true,
  prices: true,
  availability: true,
  admin_notes: false,
  review_text: false,
};

function rowToConfig(row: AgencyAiConfigRow): AgencyAiConfig {
  const da = row.data_access ?? {};
  return {
    agencyId: row.agency_id,
    agentName: row.agent_name,
    greeting: row.greeting,
    personaPrompt: row.persona_prompt,
    knowledgeText: row.knowledge_text,
    rulesText: row.rules_text,
    allowNegotiation: row.allow_negotiation,
    allowDiscounts: row.allow_discounts,
    maxDiscountPct: row.max_discount_pct,
    allowBookingCreation: row.allow_booking_creation,
    showConciergeWidget: row.show_concierge_widget,
    greetingDelaySeconds: row.greeting_delay_seconds,
    dataAccess: {
      public_catalog: Boolean((da as Record<string, unknown>).public_catalog ?? DEFAULT_DATA_ACCESS.public_catalog),
      prices: Boolean((da as Record<string, unknown>).prices ?? DEFAULT_DATA_ACCESS.prices),
      availability: Boolean((da as Record<string, unknown>).availability ?? DEFAULT_DATA_ACCESS.availability),
      admin_notes: Boolean((da as Record<string, unknown>).admin_notes ?? DEFAULT_DATA_ACCESS.admin_notes),
      review_text: Boolean((da as Record<string, unknown>).review_text ?? DEFAULT_DATA_ACCESS.review_text),
    },
    allowBookingLookup: row.allow_booking_lookup ?? true,
    allowPaymentLinks: row.allow_payment_links ?? true,
    updatedAt: row.updated_at,
  };
}

function defaultConfig(agencyId: string): AgencyAiConfig {
  return {
    agencyId,
    agentName: 'Concierge',
    greeting: 'Hi! How can I help you plan your trip?',
    personaPrompt: '',
    knowledgeText: '',
    rulesText: '',
    allowNegotiation: false,
    allowDiscounts: false,
    maxDiscountPct: 0,
    allowBookingCreation: false,
    showConciergeWidget: false,
    greetingDelaySeconds: 8,
    dataAccess: { ...DEFAULT_DATA_ACCESS },
    allowBookingLookup: true,
    allowPaymentLinks: true,
    updatedAt: new Date(0).toISOString(),
  };
}

export async function getAgencyAiConfig(agencyId: string): Promise<AgencyAiConfig> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('agency_ai_config')
    .select('*')
    .eq('agency_id', agencyId)
    .maybeSingle();
  if (error) {
    console.error('Failed to load agency AI config:', error);
    return defaultConfig(agencyId);
  }
  if (!data) return defaultConfig(agencyId);
  return rowToConfig(data as AgencyAiConfigRow);
}

export type AgencyAiConfigUpdate = Partial<{
  agentName: string;
  greeting: string;
  personaPrompt: string;
  knowledgeText: string;
  rulesText: string;
  allowNegotiation: boolean;
  allowDiscounts: boolean;
  maxDiscountPct: number;
  allowBookingCreation: boolean;
  showConciergeWidget: boolean;
  greetingDelaySeconds: number;
  dataAccess: ChatDataAccess;
  allowBookingLookup: boolean;
  allowPaymentLinks: boolean;
}>;

export async function upsertAgencyAiConfig(
  agencyId: string,
  patch: AgencyAiConfigUpdate
): Promise<AgencyAiConfig> {
  const supabase = createServiceRoleClient();
  const payload: Record<string, unknown> = {
    agency_id: agencyId,
    updated_at: new Date().toISOString(),
  };
  if (patch.agentName !== undefined) payload.agent_name = patch.agentName;
  if (patch.greeting !== undefined) payload.greeting = patch.greeting;
  if (patch.personaPrompt !== undefined) payload.persona_prompt = patch.personaPrompt;
  if (patch.knowledgeText !== undefined) payload.knowledge_text = patch.knowledgeText;
  if (patch.rulesText !== undefined) payload.rules_text = patch.rulesText;
  if (patch.allowNegotiation !== undefined) payload.allow_negotiation = patch.allowNegotiation;
  if (patch.allowDiscounts !== undefined) payload.allow_discounts = patch.allowDiscounts;
  if (patch.maxDiscountPct !== undefined) payload.max_discount_pct = patch.maxDiscountPct;
  if (patch.allowBookingCreation !== undefined) payload.allow_booking_creation = patch.allowBookingCreation;
  if (patch.showConciergeWidget !== undefined) payload.show_concierge_widget = patch.showConciergeWidget;
  if (patch.greetingDelaySeconds !== undefined) payload.greeting_delay_seconds = patch.greetingDelaySeconds;
  if (patch.dataAccess !== undefined) payload.data_access = patch.dataAccess;
  if (patch.allowBookingLookup !== undefined) payload.allow_booking_lookup = patch.allowBookingLookup;
  if (patch.allowPaymentLinks !== undefined) payload.allow_payment_links = patch.allowPaymentLinks;

  const { data, error } = await supabase
    .from('agency_ai_config')
    .upsert(payload, { onConflict: 'agency_id' })
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to save AI config: ${error.message}`);
  }
  return rowToConfig(data as AgencyAiConfigRow);
}

export async function getAgencyAiPublic(agencyId: string): Promise<AgencyAiPublic | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('agency_ai_public')
    .select('*')
    .eq('agency_id', agencyId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as {
    agent_name: string;
    greeting: string;
    show_concierge_widget: boolean;
    greeting_delay_seconds: number;
  };
  return {
    agentName: row.agent_name,
    greeting: row.greeting,
    showConciergeWidget: row.show_concierge_widget,
    greetingDelaySeconds: row.greeting_delay_seconds,
  };
}
