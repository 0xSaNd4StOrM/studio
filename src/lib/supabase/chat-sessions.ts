import { createHash } from 'node:crypto';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type {
  ChatAuditEvent,
  ChatAuditEventType,
  ChatSession,
  ChatSurface,
} from '@/types/ai-chat';

type ChatSessionRow = {
  id: string;
  agency_id: string;
  surface: ChatSurface;
  ip_hash: string | null;
  user_agent: string | null;
  message_count: number;
  last_message_at: string | null;
  created_at: string;
};

function rowToSession(row: ChatSessionRow): ChatSession {
  return {
    id: row.id,
    agencyId: row.agency_id,
    surface: row.surface,
    ipHash: row.ip_hash,
    userAgent: row.user_agent,
    messageCount: row.message_count,
    lastMessageAt: row.last_message_at,
    createdAt: row.created_at,
  };
}

/**
 * Stable per-day hash of an IP. Same IP → same hash within a UTC day,
 * different hash across days. Used for rate limiting without storing the
 * raw IP at rest.
 */
export function hashIp(ip: string): string {
  const dailySalt = new Date().toISOString().slice(0, 10);
  return createHash('sha256').update(`${ip}|${dailySalt}`).digest('hex');
}

export async function getOrCreateChatSession(params: {
  sessionId?: string;
  agencyId: string;
  surface: ChatSurface;
  ipHash: string | null;
  userAgent: string | null;
}): Promise<ChatSession> {
  const supabase = createServiceRoleClient();

  if (params.sessionId) {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', params.sessionId)
      .eq('agency_id', params.agencyId)
      .maybeSingle();
    if (!error && data) return rowToSession(data as ChatSessionRow);
    // Fall through to create — the supplied sessionId was unknown or
    // belonged to another agency. We never trust a client-supplied id.
  }

  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({
      agency_id: params.agencyId,
      surface: params.surface,
      ip_hash: params.ipHash,
      user_agent: params.userAgent,
    })
    .select('*')
    .single();
  if (error) throw new Error(`Failed to create chat session: ${error.message}`);
  return rowToSession(data as ChatSessionRow);
}

export async function bumpChatSession(sessionId: string): Promise<void> {
  const supabase = createServiceRoleClient();
  // Use raw SQL-ish update for the increment.
  const { data: current, error: readErr } = await supabase
    .from('chat_sessions')
    .select('message_count')
    .eq('id', sessionId)
    .maybeSingle();
  if (readErr || !current) return;
  const nextCount = ((current as { message_count?: number }).message_count ?? 0) + 1;
  await supabase
    .from('chat_sessions')
    .update({
      message_count: nextCount,
      last_message_at: new Date().toISOString(),
    })
    .eq('id', sessionId);
}

// ─── Audit logging ───────────────────────────────────────────────────────────

export type AuditPayload = {
  sessionId: string;
  agencyId: string;
  eventType: ChatAuditEventType;
  toolName?: string;
  args?: Record<string, unknown>;
  resultSummary?: string;
};

export async function recordAuditEvent(payload: AuditPayload): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from('chat_audit_events').insert({
    session_id: payload.sessionId,
    agency_id: payload.agencyId,
    event_type: payload.eventType,
    tool_name: payload.toolName ?? null,
    args: payload.args ?? null,
    result_summary: payload.resultSummary ?? null,
  });
  if (error) {
    // Audit failures must never break the chat. Log and continue.
    console.error('chat_audit_events insert failed:', error.message);
  }
}

export async function listRecentAuditEvents(
  agencyId: string,
  limit = 100
): Promise<ChatAuditEvent[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('chat_audit_events')
    .select('*')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('Failed to load audit events:', error);
    return [];
  }
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    sessionId: row.session_id as string,
    agencyId: row.agency_id as string,
    eventType: row.event_type as ChatAuditEventType,
    toolName: (row.tool_name as string | null) ?? null,
    args: (row.args as Record<string, unknown> | null) ?? null,
    resultSummary: (row.result_summary as string | null) ?? null,
    createdAt: row.created_at as string,
  }));
}

export type NegotiationAuditRow = {
  id: string;
  sessionId: string;
  agencyId: string;
  tourId: string | null;
  tourName: string | null;
  requestedPct: number;
  capPct: number;
  grantedPct: number | null;
  promoCode: string | null;
  reason: string | null;
  createdAt: string;
};

export async function listRecentNegotiations(
  agencyId: string,
  limit = 100
): Promise<NegotiationAuditRow[]> {
  const supabase = createServiceRoleClient();
  // Pull negotiations with the linked promo code + tour name for display.
  const { data, error } = await supabase
    .from('chat_negotiation_audits')
    .select(
      'id, session_id, agency_id, tour_id, requested_pct, cap_pct, granted_pct, reason, created_at, promo_codes(code), tours(name)'
    )
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('Failed to load negotiation audit:', error);
    return [];
  }
  return (data ?? []).map((row: Record<string, unknown>) => {
    const promo = row.promo_codes as { code?: string } | null;
    const tour = row.tours as { name?: string } | null;
    return {
      id: row.id as string,
      sessionId: row.session_id as string,
      agencyId: row.agency_id as string,
      tourId: (row.tour_id as string | null) ?? null,
      tourName: tour?.name ?? null,
      requestedPct: row.requested_pct as number,
      capPct: row.cap_pct as number,
      grantedPct: (row.granted_pct as number | null) ?? null,
      promoCode: promo?.code ?? null,
      reason: (row.reason as string | null) ?? null,
      createdAt: row.created_at as string,
    };
  });
}
