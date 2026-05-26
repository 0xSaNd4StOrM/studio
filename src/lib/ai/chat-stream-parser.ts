// Streaming OpenAI/Copilot chat-completions chunks → structured deltas.
//
// The upstream sends Server-Sent Events shaped like:
//   data: {"choices":[{"delta":{"content":"Sure"},...}]}
//   data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"...","function":{"name":"x","arguments":""}}]}}]}
//   data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"{\\""}}]}}]}
//   data: [DONE]
//
// We assemble:
//   - rolling `content` string (visible assistant text)
//   - rolling `toolCalls` array indexed by their `index` slot (id + name +
//     concatenated JSON arguments string)
// And emit deltas as they happen so the route handler can re-emit them
// downstream as SSE events.

export type StreamingToolCall = {
  index: number;
  id: string;
  name: string;
  argumentsRaw: string;
};

export type StreamEvent =
  | { type: 'content_delta'; chunk: string }
  | { type: 'tool_call_started'; call: { index: number; id: string; name: string } }
  | { type: 'finish'; reason: 'stop' | 'tool_calls' | 'length' | 'unknown' };

export type StreamAccumulator = {
  content: string;
  toolCalls: StreamingToolCall[];
  finishReason: 'stop' | 'tool_calls' | 'length' | 'unknown' | null;
};

/**
 * Read the body of a streaming chat-completions response, emit events as
 * they arrive, and return the fully-accumulated result.
 *
 * The `onEvent` callback fires for every meaningful change so the caller
 * can pipe deltas to the visitor in real-time.
 */
export async function consumeChatStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: StreamEvent) => void
): Promise<StreamAccumulator> {
  const reader = body.getReader();
  const decoder = new TextDecoder('utf-8');

  const acc: StreamAccumulator = {
    content: '',
    toolCalls: [],
    finishReason: null,
  };

  let buffer = '';
  const seenToolCallIds = new Set<string>();

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE messages are separated by blank lines. Process every full one.
    let separator = buffer.indexOf('\n\n');
    while (separator >= 0) {
      const rawMessage = buffer.slice(0, separator);
      buffer = buffer.slice(separator + 2);
      separator = buffer.indexOf('\n\n');
      processMessage(rawMessage, acc, onEvent, seenToolCallIds);
    }
  }

  // Flush any tail buffered without a trailing blank line.
  const tail = buffer.trim();
  if (tail) processMessage(tail, acc, onEvent, seenToolCallIds);

  return acc;
}

function processMessage(
  raw: string,
  acc: StreamAccumulator,
  onEvent: (event: StreamEvent) => void,
  seenToolCallIds: Set<string>
): void {
  // Each SSE message can have multiple lines (event:, data:, id:, retry:).
  // Copilot/OpenAI only uses `data:`. We concatenate all data: lines.
  const dataLines: string[] = [];
  for (const line of raw.split('\n')) {
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim());
    }
  }
  if (dataLines.length === 0) return;

  const payload = dataLines.join('\n').trim();
  if (!payload) return;
  if (payload === '[DONE]') return;

  let parsed: ChunkPayload;
  try {
    parsed = JSON.parse(payload) as ChunkPayload;
  } catch {
    return;
  }

  const choice = parsed.choices?.[0];
  if (!choice) return;

  const delta = choice.delta ?? {};

  // Text content delta.
  if (typeof delta.content === 'string' && delta.content.length > 0) {
    acc.content += delta.content;
    onEvent({ type: 'content_delta', chunk: delta.content });
  }

  // Tool call deltas. The upstream emits per-slot deltas keyed by `index`.
  // The first delta for a slot has { id, function.name }; subsequent ones
  // just stream `function.arguments` in chunks.
  if (Array.isArray(delta.tool_calls)) {
    for (const tc of delta.tool_calls) {
      const idx = typeof tc.index === 'number' ? tc.index : 0;
      let slot = acc.toolCalls.find((c) => c.index === idx);
      if (!slot) {
        slot = { index: idx, id: '', name: '', argumentsRaw: '' };
        acc.toolCalls.push(slot);
      }
      if (typeof tc.id === 'string' && tc.id) slot.id = tc.id;
      if (tc.function?.name) slot.name = tc.function.name;
      if (typeof tc.function?.arguments === 'string') {
        slot.argumentsRaw += tc.function.arguments;
      }
      // Fire `tool_call_started` once we know the slot's name and id.
      if (slot.id && slot.name && !seenToolCallIds.has(slot.id)) {
        seenToolCallIds.add(slot.id);
        onEvent({
          type: 'tool_call_started',
          call: { index: slot.index, id: slot.id, name: slot.name },
        });
      }
    }
  }

  // Finish reason: emit once per chunk that carries it.
  if (typeof choice.finish_reason === 'string') {
    const reason = normalizeFinishReason(choice.finish_reason);
    acc.finishReason = reason;
    onEvent({ type: 'finish', reason });
  }
}

function normalizeFinishReason(
  raw: string
): 'stop' | 'tool_calls' | 'length' | 'unknown' {
  if (raw === 'stop') return 'stop';
  if (raw === 'tool_calls') return 'tool_calls';
  if (raw === 'length') return 'length';
  return 'unknown';
}

type ChunkPayload = {
  choices?: Array<{
    delta?: {
      content?: string;
      tool_calls?: Array<{
        index?: number;
        id?: string;
        type?: string;
        function?: { name?: string; arguments?: string };
      }>;
    };
    finish_reason?: string | null;
  }>;
};
