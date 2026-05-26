'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSettings } from '@/components/providers/settings-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useChatSession, type ChatHistoryMessage } from '@/hooks/use-chat-session';
import { ChatMessage, ChatThinkingIndicator } from '@/components/concierge/chat-message';
import { ChatInput } from '@/components/concierge/chat-input';
import { sseFetch } from '@/lib/sse-fetch';
import { Sparkles, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ChatStreamEvent, ClientHint } from '@/types/ai-chat';
import type { TourOutput } from '@/types/tour-schemas';

interface TailorMadeChatPanelProps {
  agencyId: string;
  anchorId: string;
  itinerary: TourOutput;
  onItineraryRevised: (next: TourOutput) => void;
}

type WireMessage = { role: 'user' | 'assistant'; content: string };

const SUGGESTED_PROMPTS = [
  'Swap day 3 for something more relaxing.',
  'Can you make it cheaper without losing key sights?',
  'Add a sunset experience on the last day.',
  'Make the pace slower — fewer activities per day.',
];

export function TailorMadeChatPanel({
  agencyId,
  anchorId,
  itinerary,
  onItineraryRevised,
}: TailorMadeChatPanelProps) {
  const settings = useSettings();
  const agentName = settings?.aiConfigPublic?.agentName?.trim() || 'Concierge';

  const session = useChatSession({ kind: 'tailor-made', anchorHash: anchorId }, agencyId);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  // Keep the live itinerary in a ref so the latest version is always
  // posted to the server, even if the user types fast after a revision.
  const itineraryRef = useRef(itinerary);
  useEffect(() => {
    itineraryRef.current = itinerary;
  }, [itinerary]);

  // Autoscroll on new messages / streaming.
  useEffect(() => {
    if (!scrollerRef.current) return;
    scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
  }, [session.messages, pending]);

  const applyClientHints = useCallback(
    (hints: ClientHint[]) => {
      for (const hint of hints) {
        if (hint.type === 'replace_itinerary') {
          onItineraryRevised(hint.itinerary as TourOutput);
        }
      }
    },
    [onItineraryRevised]
  );

  const sendText = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || pending) return;
      setErrorMessage(null);
      setInput('');
      const userMsg = session.append({ role: 'user', content: trimmed });

      const wireMessages: WireMessage[] = [...session.messages, userMsg]
        .filter(
          (m): m is ChatHistoryMessage & { role: 'user' | 'assistant' } =>
            m.role === 'user' || m.role === 'assistant'
        )
        .map((m) => ({ role: m.role, content: m.content }));

      setPending(true);

      const placeholder = session.append({ role: 'assistant', content: '' });
      let textBuffer = '';
      const toolCallBuffer: Array<{ name: string; ok: boolean }> = [];
      let receivedAny = false;
      let sawError = false;

      const handleEvent = (event: ChatStreamEvent) => {
        receivedAny = true;
        switch (event.type) {
          case 'session':
            session.setServerSessionId(event.sessionId);
            break;
          case 'tool_call':
            toolCallBuffer.push({ name: event.name, ok: true });
            session.replace(placeholder.id, { toolCalls: [...toolCallBuffer] });
            break;
          case 'tool_result':
            for (let i = toolCallBuffer.length - 1; i >= 0; i--) {
              if (toolCallBuffer[i].name === event.name) {
                toolCallBuffer[i] = { name: event.name, ok: event.ok };
                break;
              }
            }
            session.replace(placeholder.id, { toolCalls: [...toolCallBuffer] });
            break;
          case 'delta':
            textBuffer += event.chunk;
            session.replace(placeholder.id, { content: textBuffer });
            break;
          case 'client_hint':
            applyClientHints([event.hint]);
            break;
          case 'done':
            session.replace(placeholder.id, {
              content: textBuffer.trim(),
              toolCalls: toolCallBuffer.length > 0 ? [...toolCallBuffer] : undefined,
            });
            break;
          case 'error':
            sawError = true;
            session.replace(placeholder.id, {
              content: event.message,
              meta: { error: true },
              toolCalls: toolCallBuffer.length > 0 ? [...toolCallBuffer] : undefined,
            });
            setErrorMessage(event.message);
            break;
        }
      };

      try {
        await sseFetch<ChatStreamEvent>(
          '/api/chat/tailor-made',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: session.serverSessionId ?? undefined,
              messages: wireMessages,
              itinerary: itineraryRef.current,
            }),
          },
          handleEvent
        );

        if (!receivedAny || (!textBuffer && !sawError)) {
          const fallback = 'Something went wrong. Please try again.';
          session.replace(placeholder.id, {
            content: fallback,
            meta: { error: true },
          });
          setErrorMessage(fallback);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Network error. Please try again.';
        session.replace(placeholder.id, {
          content: message,
          meta: { error: true },
          toolCalls: toolCallBuffer.length > 0 ? [...toolCallBuffer] : undefined,
        });
        setErrorMessage(message);
      } finally {
        setPending(false);
      }
    },
    [pending, session, applyClientHints]
  );

  const handleSend = useCallback(() => {
    void sendText(input);
  }, [input, sendText]);

  const handleClear = useCallback(() => {
    if (!confirm('Clear this conversation? The itinerary stays — only the chat history is cleared.')) return;
    session.clear();
    setErrorMessage(null);
  }, [session]);

  const last = session.messages[session.messages.length - 1];
  const placeholderEmpty =
    last && last.role === 'assistant' && !last.content && (!last.toolCalls || last.toolCalls.length === 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            Refine with AI
          </CardTitle>
          <CardDescription>
            Want changes? Ask {agentName} to swap days, adjust pace, change accommodation, or
            cut the budget. The itinerary above will update live.
          </CardDescription>
        </div>
        {session.messages.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={handleClear}
            aria-label="Clear chat"
            title="Clear chat"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Transcript */}
        <div
          ref={scrollerRef}
          className="max-h-[400px] min-h-[120px] min-w-0 overflow-y-auto overflow-x-hidden space-y-3 rounded-lg border bg-muted/20 p-3"
        >
          {session.messages.length === 0 && (
            <div className="space-y-3 py-2 text-center">
              <p className="text-sm text-muted-foreground">
                Try one of these to get started:
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => sendText(prompt)}
                    disabled={pending}
                    className="rounded-full border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-primary/10 hover:text-primary disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {session.messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} agentName={agentName} />
          ))}

          {pending && placeholderEmpty && <ChatThinkingIndicator agentName={agentName} />}
        </div>

        {/* Input */}
        <ChatInput
          value={input}
          onChange={setInput}
          onSend={handleSend}
          pending={pending}
          placeholder="Ask for changes to your itinerary…"
        />

        {errorMessage && (
          <p className="px-1 text-[11px] text-destructive">{errorMessage}</p>
        )}
        <p className="px-1 text-[10px] text-muted-foreground">
          Chat history stays on this device. Enter to send, Shift+Enter for a new line.
        </p>
      </CardContent>
    </Card>
  );
}
