import { z } from 'zod';
import { getCurrentAgency } from '@/lib/supabase/agencies';
import {
  getOrCreateChatSession,
  bumpChatSession,
  hashIp,
} from '@/lib/supabase/chat-sessions';
import { runChatTurn, type GatewayEvent } from '@/lib/ai/chat';
import {
  RATE_LIMIT_MESSAGES,
  checkChatRateLimits,
} from '@/lib/ai/chat-rate-limit';
import { redactPii } from '@/lib/ai/redact-pii';
import type { ChatMessage, ChatStreamEvent } from '@/types/ai-chat';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_HISTORY_MESSAGES = 60;

const bodySchema = z.object({
  sessionId: z.string().uuid().optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant', 'system', 'tool']),
        content: z.string(),
        toolCallId: z.string().optional(),
        name: z.string().optional(),
        toolCalls: z
          .array(
            z.object({
              id: z.string(),
              name: z.string(),
              arguments: z.record(z.unknown()),
            })
          )
          .optional(),
      })
    )
    .min(1)
    .max(MAX_HISTORY_MESSAGES),
  pageHint: z
    .object({
      path: z.string().optional(),
      tourSlug: z.string().optional(),
    })
    .optional()
    .nullable(),
  contextSummary: z.string().max(4000).optional().nullable(),
});

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

function sseEncode(event: ChatStreamEvent): Uint8Array {
  // SSE format: `event: name\ndata: <json>\n\n`. We tag the event name so
  // the client can route easily; the data payload contains the structured
  // fields for that event variant.
  const line = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
  return new TextEncoder().encode(line);
}

function jsonError(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(request: Request): Promise<Response> {
  // Parse + validate.
  let parsed: z.infer<typeof bodySchema>;
  try {
    const raw = await request.json();
    parsed = bodySchema.parse(raw);
  } catch (error) {
    return jsonError(400, {
      error: 'invalid_request',
      message: error instanceof Error ? error.message : 'invalid body',
    });
  }

  const agency = await getCurrentAgency();
  if (!agency) {
    return jsonError(400, { error: 'agency_unresolved' });
  }
  if (!agency.aiEnabled) {
    return jsonError(403, { error: 'ai_disabled' });
  }

  const ipHash = hashIp(getClientIp(request));
  const userAgent = request.headers.get('user-agent');
  const session = await getOrCreateChatSession({
    sessionId: parsed.sessionId,
    agencyId: agency.id,
    surface: 'concierge',
    ipHash,
    userAgent,
  });

  // Rate limit before doing any LLM work — protects the agency's Copilot
  // quota and gives the visitor a clear "slow down" response.
  const limit = await checkChatRateLimits({
    sessionId: session.id,
    ipHash,
    agencyId: agency.id,
  });
  if (!limit.ok) {
    return new Response(
      JSON.stringify({
        error: limit.reason,
        message: RATE_LIMIT_MESSAGES[limit.reason],
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(limit.retryAfterSeconds),
        },
      }
    );
  }

  // Redact PII from inbound visitor messages so card numbers etc. never
  // reach Copilot. We only touch user-role messages; assistant/tool
  // messages came from us or the tool layer.
  const sanitizedMessages: ChatMessage[] = (parsed.messages as ChatMessage[]).map((m) =>
    m.role === 'user' ? { ...m, content: redactPii(m.content) } : m
  );

  // SSE response. We open the stream synchronously and produce events as
  // they arrive from the gateway. The browser receives them with low
  // latency thanks to `text/event-stream` semantics.
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const safeEnqueue = (event: ChatStreamEvent) => {
        if (closed) return;
        try {
          controller.enqueue(sseEncode(event));
        } catch {
          // The client disconnected mid-stream — stop emitting.
          closed = true;
        }
      };

      safeEnqueue({ type: 'session', sessionId: session.id });

      const forward = (event: GatewayEvent) => {
        switch (event.type) {
          case 'tool_call':
            safeEnqueue({ type: 'tool_call', name: event.name });
            break;
          case 'tool_result':
            safeEnqueue({ type: 'tool_result', name: event.name, ok: event.ok });
            break;
          case 'delta':
            safeEnqueue({ type: 'delta', chunk: event.chunk });
            break;
          case 'client_hint':
            safeEnqueue({ type: 'client_hint', hint: event.hint });
            break;
        }
      };

      try {
        const result = await runChatTurn({
          agencyId: agency.id,
          agencyName: agency.name,
          sessionId: session.id,
          surface: 'concierge',
          messages: sanitizedMessages,
          pageHint: parsed.pageHint ?? null,
          contextSummary: parsed.contextSummary ?? null,
          onEvent: forward,
        });
        await bumpChatSession(session.id);
        safeEnqueue({ type: 'done', model: result.model });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown error';
        safeEnqueue({ type: 'error', message });
      } finally {
        if (!closed) {
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Disable nginx/Vercel buffering on the path.
      'X-Accel-Buffering': 'no',
    },
  });
}
