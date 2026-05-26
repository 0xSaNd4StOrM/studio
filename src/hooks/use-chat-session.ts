'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type ChatRole = 'user' | 'assistant' | 'system' | 'tool';

export type ChatHistoryMessage = {
  id: string;
  role: ChatRole;
  content: string;
  // Tool-call breadcrumbs the server echoed back. Used to render small
  // "looked up tours" / "checked price" hints inline.
  toolCalls?: Array<{ name: string; ok: boolean }>;
  // Free-form client-side metadata (e.g. errors, retry hints).
  meta?: Record<string, unknown>;
  createdAt: number;
};

export type ChatSessionScope =
  | { kind: 'concierge' }
  | { kind: 'tailor-made'; anchorHash: string };

type StoredSession = {
  conversationId: string | null;
  serverSessionId: string | null;
  startedAt: number;
  lastActiveAt: number;
  messages: ChatHistoryMessage[];
  dismissedGreeting?: boolean;
};

const STORAGE_PREFIX = 'tcn:chat';

function scopeKey(scope: ChatSessionScope, agencyId: string): string {
  if (scope.kind === 'concierge') {
    return `${STORAGE_PREFIX}:concierge:${agencyId}`;
  }
  return `${STORAGE_PREFIX}:tailor-made:${agencyId}:${scope.anchorHash}`;
}

function readSession(key: string): StoredSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed || !Array.isArray(parsed.messages)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeSession(key: string, session: StoredSession): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(session));
  } catch {
    // Quota or disabled storage — give up silently.
  }
}

function newMessageId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `m_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

export type UseChatSessionResult = {
  /** Messages in order, oldest first. */
  messages: ChatHistoryMessage[];
  /** Server-issued session id (null until the first successful turn). */
  serverSessionId: string | null;
  /** Whether the greeting bubble was dismissed in this session. */
  dismissedGreeting: boolean;
  /** Append a message (and persist). Returns the appended row. */
  append: (msg: Omit<ChatHistoryMessage, 'id' | 'createdAt'> & { id?: string }) => ChatHistoryMessage;
  /** Replace a message by id (for streaming partials in a future sprint). */
  replace: (id: string, patch: Partial<ChatHistoryMessage>) => void;
  /** Record the server's session id after the first response. */
  setServerSessionId: (id: string) => void;
  /** Mark the greeting bubble dismissed (persists for this tab). */
  dismissGreeting: () => void;
  /** Drop everything and start fresh. */
  clear: () => void;
};

/**
 * Tab-scoped chat session backed by sessionStorage. The full transcript
 * lives in the browser; the server only sees what we send on each turn.
 * On tab close, the conversation evaporates by design — matches the
 * privacy expectation of "anonymous chat with a brand".
 */
export function useChatSession(
  scope: ChatSessionScope,
  agencyId: string | null
): UseChatSessionResult {
  const storageKey = useMemo(
    () => (agencyId ? scopeKey(scope, agencyId) : null),
    [scope, agencyId]
  );

  const [messages, setMessages] = useState<ChatHistoryMessage[]>([]);
  const [serverSessionId, setServerSessionIdState] = useState<string | null>(null);
  const [dismissedGreeting, setDismissedGreeting] = useState<boolean>(false);
  const hydratedRef = useRef(false);

  // Hydrate from sessionStorage once we have the storage key.
  useEffect(() => {
    if (!storageKey) return;
    const stored = readSession(storageKey);
    if (stored) {
      setMessages(stored.messages);
      setServerSessionIdState(stored.serverSessionId);
      setDismissedGreeting(Boolean(stored.dismissedGreeting));
    }
    hydratedRef.current = true;
  }, [storageKey]);

  // Persist on change (debounced via microtask — these writes are small).
  useEffect(() => {
    if (!storageKey || !hydratedRef.current) return;
    const session: StoredSession = {
      conversationId: null,
      serverSessionId,
      startedAt: messages[0]?.createdAt ?? Date.now(),
      lastActiveAt: messages[messages.length - 1]?.createdAt ?? Date.now(),
      messages,
      dismissedGreeting,
    };
    writeSession(storageKey, session);
  }, [storageKey, messages, serverSessionId, dismissedGreeting]);

  const append = useCallback<UseChatSessionResult['append']>((msg) => {
    const row: ChatHistoryMessage = {
      id: msg.id ?? newMessageId(),
      role: msg.role,
      content: msg.content,
      toolCalls: msg.toolCalls,
      meta: msg.meta,
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, row]);
    return row;
  }, []);

  const replace = useCallback<UseChatSessionResult['replace']>((id, patch) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  const setServerSessionId = useCallback((id: string) => {
    setServerSessionIdState((current) => (current === id ? current : id));
  }, []);

  const dismissGreeting = useCallback(() => {
    setDismissedGreeting(true);
  }, []);

  const clear = useCallback(() => {
    setMessages([]);
    setServerSessionIdState(null);
    setDismissedGreeting(false);
    if (storageKey && typeof window !== 'undefined') {
      try {
        window.sessionStorage.removeItem(storageKey);
      } catch {
        /* ignore */
      }
    }
  }, [storageKey]);

  return {
    messages,
    serverSessionId,
    dismissedGreeting,
    append,
    replace,
    setServerSessionId,
    dismissGreeting,
    clear,
  };
}
