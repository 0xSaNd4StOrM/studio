// Minimal SSE-over-fetch helper. Native EventSource only supports GET; we
// POST a JSON body, so we read the response body manually and parse the
// SSE format (`event: name\ndata: <json>\n\n`).
//
// Usage:
//   for await (const evt of sseFetch<MyEvent>('/api/...', { ... })) {
//     handle(evt);
//   }
// or:
//   await sseFetch(url, opts, (evt) => handle(evt));

export type SseFetchOptions = {
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
};

export async function sseFetch<TEvent>(
  url: string,
  options: SseFetchOptions,
  onEvent: (event: TEvent) => void
): Promise<void> {
  const response = await fetch(url, {
    method: options.method ?? 'POST',
    headers: {
      Accept: 'text/event-stream',
      ...(options.headers ?? {}),
    },
    body: options.body,
    signal: options.signal,
  });

  if (!response.ok) {
    // Try to surface a structured error from the body before throwing.
    let detail = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      if (body && typeof body === 'object') {
        const message =
          (body.message as string | undefined) ?? (body.error as string | undefined);
        if (message) detail = message;
      }
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  if (!response.body) {
    throw new Error('Empty response body.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let separator = buffer.indexOf('\n\n');
    while (separator >= 0) {
      const rawMessage = buffer.slice(0, separator);
      buffer = buffer.slice(separator + 2);
      separator = buffer.indexOf('\n\n');
      processMessage<TEvent>(rawMessage, onEvent);
    }
  }

  const tail = buffer.trim();
  if (tail) processMessage<TEvent>(tail, onEvent);
}

function processMessage<TEvent>(raw: string, onEvent: (event: TEvent) => void): void {
  const dataLines: string[] = [];
  for (const line of raw.split('\n')) {
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim());
    }
  }
  if (dataLines.length === 0) return;
  const payload = dataLines.join('\n').trim();
  if (!payload || payload === '[DONE]') return;
  try {
    const parsed = JSON.parse(payload) as TEvent;
    onEvent(parsed);
  } catch {
    // Skip malformed chunks; the loop continues.
  }
}
