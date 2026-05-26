// Three-tier rate limit for the chat endpoints.
//
//   - Per session: best-effort in-memory counter. Resets when the Node
//     process restarts; that's fine because session ids are server-issued
//     and the worst case is a forgiving limit after a deploy.
//   - Per IP-hash: same shape. Hash is per-day (see `hashIp`) so this
//     counter resets daily even without process restarts.
//   - Per agency: counted from `chat_audit_events.message_in` rows in
//     Supabase, so it's accurate across processes. The query is cheap
//     thanks to the `(agency_id, created_at)` index.
//
// This is intentionally not bulletproof against a determined attacker
// across multi-instance deployments. For that we'd need Redis or a DB
// counter row; deferred until the SaaS hits real abuse traffic.

import { createServiceRoleClient } from '@/lib/supabase/server';

const SESSION_WINDOW_MS = 15 * 60 * 1000;
const SESSION_MAX = 30;

const IP_WINDOW_MS = 60 * 60 * 1000;
const IP_MAX = 120;

const AGENCY_WINDOW_HOURS = 24;
const AGENCY_MAX = 5000;

type Counter = { count: number; windowStart: number };

const sessionCounters = new Map<string, Counter>();
const ipCounters = new Map<string, Counter>();

export type RateLimitResult =
  | { ok: true }
  | { ok: false; reason: 'session_quota' | 'ip_quota' | 'agency_quota'; retryAfterSeconds: number };

function incrementInMemory(
  map: Map<string, Counter>,
  key: string,
  max: number,
  windowMs: number
): { ok: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const counter = map.get(key);
  if (!counter || now - counter.windowStart >= windowMs) {
    map.set(key, { count: 1, windowStart: now });
    return { ok: true, retryAfterSeconds: 0 };
  }
  if (counter.count + 1 > max) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((counter.windowStart + windowMs - now) / 1000)
      ),
    };
  }
  counter.count += 1;
  return { ok: true, retryAfterSeconds: 0 };
}

async function checkAgencyQuota(agencyId: string): Promise<{
  ok: boolean;
  retryAfterSeconds: number;
}> {
  const supabase = createServiceRoleClient();
  const since = new Date(Date.now() - AGENCY_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from('chat_audit_events')
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', agencyId)
    .eq('event_type', 'message_in')
    .gte('created_at', since);

  if (error) {
    // Fail-open: a quota lookup failure shouldn't block the chat. The
    // session/IP limits still protect against runaway abuse.
    console.error('Agency quota check failed:', error.message);
    return { ok: true, retryAfterSeconds: 0 };
  }

  const used = count ?? 0;
  if (used >= AGENCY_MAX) {
    return {
      ok: false,
      // Daily-style reset: tell the client to retry in ~an hour. We don't
      // know the exact window-start so a flat retry hint is fine.
      retryAfterSeconds: 60 * 60,
    };
  }
  return { ok: true, retryAfterSeconds: 0 };
}

export async function checkChatRateLimits(input: {
  sessionId: string;
  ipHash: string | null;
  agencyId: string;
}): Promise<RateLimitResult> {
  // Cheap checks first — fail fast before hitting the DB.
  const sessionCheck = incrementInMemory(
    sessionCounters,
    input.sessionId,
    SESSION_MAX,
    SESSION_WINDOW_MS
  );
  if (!sessionCheck.ok) {
    return {
      ok: false,
      reason: 'session_quota',
      retryAfterSeconds: sessionCheck.retryAfterSeconds,
    };
  }

  if (input.ipHash) {
    const ipCheck = incrementInMemory(ipCounters, input.ipHash, IP_MAX, IP_WINDOW_MS);
    if (!ipCheck.ok) {
      return {
        ok: false,
        reason: 'ip_quota',
        retryAfterSeconds: ipCheck.retryAfterSeconds,
      };
    }
  }

  const agencyCheck = await checkAgencyQuota(input.agencyId);
  if (!agencyCheck.ok) {
    return {
      ok: false,
      reason: 'agency_quota',
      retryAfterSeconds: agencyCheck.retryAfterSeconds,
    };
  }

  return { ok: true };
}

export const RATE_LIMIT_MESSAGES: Record<
  Exclude<RateLimitResult, { ok: true }>['reason'],
  string
> = {
  session_quota: 'Too many messages in this chat session. Please wait a few minutes.',
  ip_quota: "You've sent a lot of messages today. Try again in a bit.",
  agency_quota:
    'This agency has reached its daily AI quota. Please continue on WhatsApp or come back tomorrow.',
};

// ─── Per-session lookup attempt cap ─────────────────────────────────────────
// Booking lookups are higher-risk than ordinary chat turns (they touch PII)
// so we cap them per session on top of the general chat limits.
const LOOKUP_MAX_PER_SESSION = 5;
const lookupCounters = new Map<string, number>();

export function bumpLookupAttempt(sessionId: string): {
  ok: boolean;
  remaining: number;
} {
  const used = lookupCounters.get(sessionId) ?? 0;
  if (used >= LOOKUP_MAX_PER_SESSION) {
    return { ok: false, remaining: 0 };
  }
  lookupCounters.set(sessionId, used + 1);
  return { ok: true, remaining: LOOKUP_MAX_PER_SESSION - (used + 1) };
}
