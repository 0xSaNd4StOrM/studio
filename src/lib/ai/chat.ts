import {
  COPILOT_REQUEST_HEADERS,
  clearCopilotBearerCache,
  getCopilotEndpointForAgency,
} from '@/lib/ai/copilot-auth';
import { modelsForFeature } from '@/lib/ai/models';
import { getAgencyAiConfig } from '@/lib/supabase/agency-ai-config';
import { listActiveSkills } from '@/lib/supabase/skills';
import { recordAuditEvent } from '@/lib/supabase/chat-sessions';
import { buildSystemPrompt } from '@/lib/ai/chat-system-prompt';
import { buildToolRegistry, toolsToOpenAiPayload, type ChatTool } from '@/lib/ai/chat-tools';
import { consumeChatStream, type StreamAccumulator } from '@/lib/ai/chat-stream-parser';
import type { ChatMessage, ChatSurface, ClientHint } from '@/types/ai-chat';

const MAX_TOOL_ROUNDS = 6;

// Events the gateway emits during a turn so the route handler can stream
// them to the visitor. These ride on top of the upstream Copilot stream.
export type GatewayEvent =
  | { type: 'tool_call'; name: string }
  | { type: 'tool_result'; name: string; ok: boolean }
  | { type: 'delta'; chunk: string }
  | { type: 'client_hint'; hint: ClientHint };

export type RunChatTurnInput = {
  agencyId: string;
  agencyName: string;
  sessionId: string;
  surface: ChatSurface;
  // Visitor + assistant message history (excluding the system prompt — we
  // build that fresh every turn from the agency config + active skills).
  messages: ChatMessage[];
  pageHint?: { path?: string; tourSlug?: string } | null;
  itinerary?: unknown | null;
  contextSummary?: string | null;
  // Optional model override; defaults to whatever the agency picked for
  // the 'chat' AI feature (or its DEFAULT_MODEL_FOR_FEATURE entry).
  models?: string[];
  // Streaming callback. Fired as tool calls fire and assistant tokens
  // arrive. Synchronous from the gateway's perspective — the caller is
  // expected to pipe these to the visitor.
  onEvent?: (event: GatewayEvent) => void;
};

export type RunChatTurnResult = {
  assistantText: string;
  model: string;
  clientHints: ClientHint[];
  toolCalls: Array<{ name: string; args: Record<string, unknown>; result: unknown }>;
};

type OpenAiToolCall = {
  id: string;
  type?: 'function';
  function: { name: string; arguments: string };
};

type OpenAiMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: OpenAiToolCall[];
  tool_call_id?: string;
  name?: string;
};

function safeJsonParse(text: string): Record<string, unknown> {
  if (!text || !text.trim()) return {};
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function toOpenAiMessages(messages: ChatMessage[], systemPrompt: string): OpenAiMessage[] {
  const out: OpenAiMessage[] = [{ role: 'system', content: systemPrompt }];
  for (const m of messages) {
    if (m.role === 'tool') {
      out.push({
        role: 'tool',
        content: m.content,
        tool_call_id: m.toolCallId,
        name: m.name,
      });
      continue;
    }
    if (m.role === 'assistant' && m.toolCalls && m.toolCalls.length > 0) {
      out.push({
        role: 'assistant',
        content: m.content || null,
        tool_calls: m.toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function',
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.arguments ?? {}),
          },
        })),
      });
      continue;
    }
    if (m.role === 'system' || m.role === 'user' || m.role === 'assistant') {
      out.push({ role: m.role, content: m.content });
    }
  }
  return out;
}

type RoundOutcome = StreamAccumulator;

/**
 * Run one streaming round-trip against Copilot. Pipes content deltas to the
 * caller's `onDelta` callback as they arrive; returns the accumulated
 * content + tool calls when the stream finishes.
 */
async function streamCopilotRound(
  agencyId: string,
  body: {
    model: string;
    messages: OpenAiMessage[];
    tools?: unknown[];
    tool_choice?: 'auto' | 'none';
    temperature?: number;
  },
  onContentDelta: (chunk: string) => void
): Promise<RoundOutcome> {
  const endpoint = await getCopilotEndpointForAgency(agencyId);
  const response = await fetch(`${endpoint.apiBase}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${endpoint.bearer}`,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...COPILOT_REQUEST_HEADERS,
    },
    body: JSON.stringify({ ...body, stream: true }),
  });

  if (response.status === 401 || response.status === 403) {
    clearCopilotBearerCache(agencyId);
    const raw = await response.text();
    throw new Error(
      `Copilot auth rejected (${body.model}) - ${raw || `HTTP ${response.status}`}`
    );
  }
  if (!response.ok) {
    const raw = await response.text();
    throw new Error(
      `Copilot chat failed (${body.model}) - ${raw || `HTTP ${response.status}`}`
    );
  }
  if (!response.body) {
    throw new Error(`Copilot returned no stream body (${body.model}).`);
  }

  return consumeChatStream(response.body, (event) => {
    if (event.type === 'content_delta') {
      onContentDelta(event.chunk);
    }
  });
}

async function attemptTurnWithModel(
  model: string,
  input: RunChatTurnInput,
  tools: ChatTool[],
  systemPrompt: string
): Promise<RunChatTurnResult> {
  const toolByName = new Map(tools.map((t) => [t.name, t]));
  const toolPayload = toolsToOpenAiPayload(tools);

  // Working copy of the conversation as the LLM sees it (system + history +
  // any tool round-trips that happen during this turn).
  const working: OpenAiMessage[] = toOpenAiMessages(input.messages, systemPrompt);

  const aggregatedHints: ClientHint[] = [];
  const aggregatedCalls: RunChatTurnResult['toolCalls'] = [];

  // Accumulates assistant text across all rounds so the final
  // `assistantText` returned to the caller matches what the visitor saw
  // streamed. Each round forwards content deltas live to `onEvent`.
  let assistantTextAccumulator = '';

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const onContentDelta = (chunk: string) => {
      assistantTextAccumulator += chunk;
      input.onEvent?.({ type: 'delta', chunk });
    };

    const outcome = await streamCopilotRound(
      input.agencyId,
      {
        model,
        messages: working,
        tools: toolPayload.length > 0 ? toolPayload : undefined,
        tool_choice: toolPayload.length > 0 ? 'auto' : undefined,
        temperature: 0.5,
      },
      onContentDelta
    );

    const toolCalls = outcome.toolCalls.filter((tc) => tc.id && tc.name);

    // No tool calls → this is the final assistant message.
    if (toolCalls.length === 0) {
      return {
        assistantText: assistantTextAccumulator.trim(),
        model,
        clientHints: aggregatedHints,
        toolCalls: aggregatedCalls,
      };
    }

    // Tools were called — push the assistant turn (with the text it did
    // emit + tool_calls) into the working transcript so the model sees
    // them when we feed back results.
    working.push({
      role: 'assistant',
      content: outcome.content || null,
      tool_calls: toolCalls.map((tc) => ({
        id: tc.id,
        type: 'function',
        function: { name: tc.name, arguments: tc.argumentsRaw },
      })),
    });

    // Execute each tool call, streaming progress to the caller.
    for (const call of toolCalls) {
      input.onEvent?.({ type: 'tool_call', name: call.name });

      const tool = toolByName.get(call.name as ChatTool['name']);
      const rawArgs = safeJsonParse(call.argumentsRaw);

      if (!tool) {
        await recordAuditEvent({
          sessionId: input.sessionId,
          agencyId: input.agencyId,
          eventType: 'error',
          toolName: call.name,
          args: rawArgs,
          resultSummary: `Unknown tool: ${call.name}`,
        });
        input.onEvent?.({ type: 'tool_result', name: call.name, ok: false });
        working.push({
          role: 'tool',
          content: JSON.stringify({ error: 'unknown_tool', name: call.name }),
          tool_call_id: call.id,
          name: call.name,
        });
        aggregatedCalls.push({
          name: call.name,
          args: rawArgs,
          result: { error: 'unknown_tool' },
        });
        continue;
      }

      let toolResult: unknown;
      let toolHint: ClientHint | undefined;
      let toolOk = true;
      try {
        const parsed = tool.parameters.safeParse(rawArgs);
        if (!parsed.success) {
          toolOk = false;
          toolResult = {
            error: 'invalid_arguments',
            issues: parsed.error.issues.slice(0, 5).map((i) => ({
              path: i.path.join('.'),
              message: i.message,
            })),
          };
        } else {
          const out = await tool.handler(parsed.data, {
            agencyId: input.agencyId,
            sessionId: input.sessionId,
            surface: input.surface,
          });
          toolResult = out.result;
          toolHint = out.clientHint;
          if (
            toolResult &&
            typeof toolResult === 'object' &&
            'error' in (toolResult as Record<string, unknown>)
          ) {
            toolOk = false;
          }
        }
      } catch (err) {
        toolOk = false;
        toolResult = {
          error: 'tool_threw',
          message: err instanceof Error ? err.message : String(err),
        };
      }

      await recordAuditEvent({
        sessionId: input.sessionId,
        agencyId: input.agencyId,
        eventType: 'tool_call',
        toolName: call.name,
        args: rawArgs,
        resultSummary: toolOk ? 'ok' : 'error',
      });

      if (toolHint) {
        aggregatedHints.push(toolHint);
        input.onEvent?.({ type: 'client_hint', hint: toolHint });
      }
      aggregatedCalls.push({ name: call.name, args: rawArgs, result: toolResult });
      input.onEvent?.({ type: 'tool_result', name: call.name, ok: toolOk });

      working.push({
        role: 'tool',
        content: JSON.stringify(toolResult),
        tool_call_id: call.id,
        name: call.name,
      });
    }

    // Loop continues so the model can incorporate the tool results.
  }

  // Hit the tool-round cap. Force one more completion with tools disabled
  // so the model is compelled to summarize for the visitor. Stream it.
  await streamCopilotRound(
    input.agencyId,
    {
      model,
      messages: working,
      tool_choice: 'none',
      temperature: 0.5,
    },
    (chunk) => {
      assistantTextAccumulator += chunk;
      input.onEvent?.({ type: 'delta', chunk });
    }
  );

  return {
    assistantText:
      assistantTextAccumulator.trim() ||
      "I've gathered what I can — would you like me to connect you to a human teammate to finish this?",
    model,
    clientHints: aggregatedHints,
    toolCalls: aggregatedCalls,
  };
}

export async function runChatTurn(input: RunChatTurnInput): Promise<RunChatTurnResult> {
  const [config, activeSkills] = await Promise.all([
    getAgencyAiConfig(input.agencyId),
    listActiveSkills(input.agencyId),
  ]);

  const tools = buildToolRegistry(config, activeSkills, input.surface);
  const systemPrompt = buildSystemPrompt({
    agencyName: input.agencyName,
    config,
    activeSkills,
    surface: input.surface,
    pageHint: input.pageHint,
    itinerary: input.itinerary,
    contextSummary: input.contextSummary,
  });

  // Audit the inbound visitor turn for debugging.
  const lastUser = [...input.messages].reverse().find((m) => m.role === 'user');
  if (lastUser) {
    await recordAuditEvent({
      sessionId: input.sessionId,
      agencyId: input.agencyId,
      eventType: 'message_in',
      resultSummary: lastUser.content.slice(0, 200),
    });
  }

  const candidateModels =
    input.models && input.models.length > 0
      ? input.models
      : modelsForFeature('chat');

  const failures: string[] = [];
  for (const model of candidateModels) {
    try {
      const result = await attemptTurnWithModel(model, input, tools, systemPrompt);
      await recordAuditEvent({
        sessionId: input.sessionId,
        agencyId: input.agencyId,
        eventType: 'message_out',
        resultSummary: `model=${result.model} chars=${result.assistantText.length}`,
      });
      return result;
    } catch (err) {
      failures.push(`${model}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  await recordAuditEvent({
    sessionId: input.sessionId,
    agencyId: input.agencyId,
    eventType: 'error',
    resultSummary: failures.join(' | '),
  });
  throw new Error(`All chat models failed. ${failures.join(' | ')}`);
}
