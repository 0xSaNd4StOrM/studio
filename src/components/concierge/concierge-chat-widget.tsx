'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Bot, MessageSquare, X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useChatSession, type ChatHistoryMessage } from '@/hooks/use-chat-session';
import { ChatMessage, ChatThinkingIndicator } from './chat-message';
import { ChatInput } from './chat-input';
import type { ChatStreamEvent, ClientHint } from '@/types/ai-chat';
import { sseFetch } from '@/lib/sse-fetch';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import type { Tour } from '@/types';

const MOBILE_PURCHASE_CTA_ROUTES = new Set(['/cart', '/checkout']);

type WireMessage = {
  role: 'user' | 'assistant';
  content: string;
};

interface ConciergeChatWidgetProps {
  agencyId: string;
  agentName: string;
  greeting: string;
  greetingDelaySeconds: number;
  hasWhatsApp: boolean;
}

export function ConciergeChatWidget({
  agencyId,
  agentName,
  greeting,
  greetingDelaySeconds,
  hasWhatsApp,
}: ConciergeChatWidgetProps) {
  const pathname = usePathname();
  const isPurchaseRoute = MOBILE_PURCHASE_CTA_ROUTES.has(pathname);
  const cart = useCart();
  const { toast } = useToast();

  const session = useChatSession({ kind: 'concierge' }, agencyId);
  const [open, setOpen] = useState(false);
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastWhatsappLink, setLastWhatsappLink] = useState<string | null>(null);
  const [lastPromo, setLastPromo] = useState<{ code: string; percentOff: number } | null>(null);
  const [lastPayment, setLastPayment] = useState<{
    bookingId: string;
    paymentUrl: string;
    total: number;
    currency: string;
  } | null>(null);
  const [lastBooking, setLastBooking] = useState<{
    bookingId: string;
    shareUrl: string;
    status: 'Confirmed' | 'Pending' | 'Cancelled';
    total: number;
    currency: string;
  } | null>(null);

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const greetingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-show the greeting bubble once per tab, after a delay.
  useEffect(() => {
    if (open || session.dismissedGreeting) return;
    if (session.messages.length > 0) return;
    const ms = Math.max(0, greetingDelaySeconds) * 1000;
    greetingTimerRef.current = setTimeout(() => setBubbleVisible(true), ms);
    return () => {
      if (greetingTimerRef.current) clearTimeout(greetingTimerRef.current);
    };
  }, [open, session.dismissedGreeting, session.messages.length, greetingDelaySeconds]);

  // Auto-scroll on new messages or pending state.
  useEffect(() => {
    if (!scrollerRef.current) return;
    scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
  }, [session.messages, pending, open]);

  // Focus the input when the panel opens.
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [open]);

  const handleOpen = useCallback(() => {
    setBubbleVisible(false);
    session.dismissGreeting();
    setOpen(true);
  }, [session]);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  const handleDismissBubble = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setBubbleVisible(false);
      session.dismissGreeting();
    },
    [session]
  );

  const applyClientHints = useCallback(
    (hints: ClientHint[]) => {
      for (const hint of hints) {
        switch (hint.type) {
          case 'handoff_whatsapp': {
            const link = `https://wa.me/${hint.phone}?text=${encodeURIComponent(hint.message)}`;
            setLastWhatsappLink(link);
            break;
          }
          case 'apply_promo': {
            setLastPromo({ code: hint.code, percentOff: hint.percentOff });
            // Try to apply immediately. If the cart is empty, validation
            // will fail; we still surface the code for the visitor to
            // paste at checkout, so don't toast on failure.
            cart.applyPromoCode(hint.code).catch(() => {
              /* code is shown in the chat regardless */
            });
            break;
          }
          case 'add_to_cart': {
            const tour = hint.tour as Tour | null;
            if (!tour) break;
            const date = hint.date ? new Date(hint.date) : undefined;
            cart.addToCart(
              tour,
              'tour',
              hint.adults,
              hint.children,
              date,
              1,
              hint.packageId,
              hint.packageName
            );
            toast({
              title: 'Added to cart',
              description: `${tour.name} — ${hint.adults} adult${hint.adults === 1 ? '' : 's'}${hint.children > 0 ? `, ${hint.children} child${hint.children === 1 ? '' : 'ren'}` : ''}`,
            });
            break;
          }
          case 'apply_payment': {
            setLastPayment({
              bookingId: hint.bookingId,
              paymentUrl: hint.paymentUrl,
              total: hint.total,
              currency: hint.currency,
            });
            break;
          }
          case 'view_booking': {
            setLastBooking({
              bookingId: hint.bookingId,
              shareUrl: hint.shareUrl,
              status: hint.status,
              total: hint.total,
              currency: hint.currency,
            });
            break;
          }
          case 'highlight_tour':
          case 'replace_itinerary':
            // Highlight is concierge-only nicety; replace_itinerary is for
            // the tailor-made surface. Neither is meaningful for this
            // floating widget today.
            break;
        }
      }
    },
    [cart, toast]
  );

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || pending) return;

    setErrorMessage(null);
    setInput('');
    const userMsg = session.append({ role: 'user', content: text });

    // Build the wire payload from the on-screen transcript (user + assistant).
    const wireMessages: WireMessage[] = [...session.messages, userMsg]
      .filter((m): m is ChatHistoryMessage & { role: 'user' | 'assistant' } =>
        m.role === 'user' || m.role === 'assistant'
      )
      .map((m) => ({ role: m.role, content: m.content }));

    setPending(true);

    // Create an empty assistant placeholder. Server events progressively
    // fill in `content` (deltas) and `toolCalls` (tool breadcrumbs).
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
          // Mark as pending (ok=true tentatively); will flip on tool_result.
          toolCallBuffer.push({ name: event.name, ok: true });
          session.replace(placeholder.id, { toolCalls: [...toolCallBuffer] });
          break;
        case 'tool_result': {
          // Update the LAST pending row for this tool name.
          for (let i = toolCallBuffer.length - 1; i >= 0; i--) {
            if (toolCallBuffer[i].name === event.name) {
              toolCallBuffer[i] = { name: event.name, ok: event.ok };
              break;
            }
          }
          session.replace(placeholder.id, { toolCalls: [...toolCallBuffer] });
          break;
        }
        case 'delta':
          textBuffer += event.chunk;
          session.replace(placeholder.id, { content: textBuffer });
          break;
        case 'client_hint':
          applyClientHints([event.hint]);
          break;
        case 'done':
          // Final tidy-up: trim whitespace.
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
        '/api/chat/concierge',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: session.serverSessionId ?? undefined,
            messages: wireMessages,
            pageHint: { path: pathname },
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
  }, [input, pending, session, pathname, applyClientHints]);

  const containerOffsetClass = useMemo(() => {
    if (isPurchaseRoute) {
      return hasWhatsApp ? 'bottom-40' : 'bottom-24';
    }
    return hasWhatsApp ? 'bottom-24 sm:bottom-24 lg:bottom-24' : 'bottom-5 lg:bottom-6';
  }, [isPurchaseRoute, hasWhatsApp]);

  return (
    <>
      {/* ── Greeting bubble (auto-shows once per tab) ────────────────── */}
      {!open && bubbleVisible && (
        <button
          type="button"
          onClick={handleOpen}
          className={cn(
            'group fixed right-4 z-50 max-w-[280px] rounded-2xl border bg-background p-3 pr-9 text-left shadow-xl ring-1 ring-primary/10 transition-all sm:right-6',
            'animate-in fade-in slide-in-from-bottom-2',
            containerOffsetClass,
            'mb-[72px] lg:mb-[80px]'
          )}
          aria-label="Open chat"
        >
          <div className="flex items-start gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-foreground">{agentName}</p>
              <p className="text-xs leading-snug text-muted-foreground">{greeting}</p>
            </div>
          </div>
          <span
            role="button"
            tabIndex={0}
            onClick={handleDismissBubble}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') handleDismissBubble(e as unknown as React.MouseEvent);
            }}
            className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        </button>
      )}

      {/* ── Floating launcher button ─────────────────────────────────── */}
      {!open && (
        <button
          type="button"
          onClick={handleOpen}
          aria-label={`Chat with ${agentName}`}
          className={cn(
            'fixed right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl transition-transform hover:scale-105 active:scale-95 sm:right-6',
            containerOffsetClass
          )}
        >
          <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-30 animate-ping" />
          <MessageSquare className="relative h-6 w-6" />
        </button>
      )}

      {/* ── Chat panel ───────────────────────────────────────────────── */}
      {open && (
        <div
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 flex flex-col overflow-hidden rounded-t-2xl border-t bg-background shadow-2xl sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[400px] sm:max-w-[calc(100vw-2rem)] sm:rounded-2xl sm:border',
            'h-[85vh] sm:h-[600px] max-h-[700px]',
            // Respect iOS home indicator + Android system bars on mobile.
            'pb-[env(safe-area-inset-bottom)] sm:pb-0',
            'animate-in fade-in slide-in-from-bottom-4 duration-200'
          )}
          role="dialog"
          aria-label={`Chat with ${agentName}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold leading-tight">{agentName}</p>
                <p className="truncate text-[11px] text-muted-foreground">AI travel concierge</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {session.messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    if (confirm('Start a new conversation? Current chat will be cleared.')) {
                      session.clear();
                      setLastWhatsappLink(null);
                      setLastPromo(null);
                      setLastPayment(null);
                      setLastBooking(null);
                      setErrorMessage(null);
                    }
                  }}
                  aria-label="Start fresh"
                  title="Start fresh"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleClose}
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={scrollerRef}
            className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-3"
          >
            {session.messages.length === 0 && (
              <div className="flex h-full items-center justify-center px-4 text-center">
                <div className="space-y-2">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Bot className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium">{greeting}</p>
                  <p className="text-xs text-muted-foreground">
                    Ask about destinations, prices, availability — anything tour-related.
                  </p>
                </div>
              </div>
            )}

            {session.messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} agentName={agentName} />
            ))}

            {pending &&
              (() => {
                // Only show the bouncing dots while we haven't started
                // streaming yet — once a delta or tool_call arrives, the
                // message bubble takes over.
                const last = session.messages[session.messages.length - 1];
                const placeholderEmpty =
                  last &&
                  last.role === 'assistant' &&
                  !last.content &&
                  (!last.toolCalls || last.toolCalls.length === 0);
                if (!placeholderEmpty) return null;
                return <ChatThinkingIndicator agentName={agentName} />;
              })()}
          </div>

          {/* Booking the AI just looked up */}
          {lastBooking && (
            <div
              className={cn(
                'border-t px-4 py-2.5',
                lastBooking.status === 'Confirmed'
                  ? 'bg-emerald-50 dark:bg-emerald-950/30'
                  : lastBooking.status === 'Pending'
                    ? 'bg-amber-50 dark:bg-amber-950/30'
                    : 'bg-muted/40'
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 text-xs">
                  <p
                    className={cn(
                      'font-medium',
                      lastBooking.status === 'Confirmed'
                        ? 'text-emerald-900 dark:text-emerald-200'
                        : lastBooking.status === 'Pending'
                          ? 'text-amber-900 dark:text-amber-200'
                          : 'text-foreground'
                    )}
                  >
                    Your booking · {lastBooking.status}
                  </p>
                  <p className="text-muted-foreground">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: lastBooking.currency,
                      maximumFractionDigits: 0,
                    }).format(lastBooking.total)}
                    {' · ref '}
                    <code className="font-mono text-[10px]">
                      {lastBooking.bookingId.slice(0, 8)}
                    </code>
                  </p>
                </div>
                <a
                  href={lastBooking.shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-full border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                >
                  View →
                </a>
              </div>
            </div>
          )}

          {/* Pending-payment link minted in this conversation */}
          {lastPayment && (
            <div className="border-t bg-primary/5 px-4 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 text-xs">
                  <p className="font-medium text-foreground">
                    Payment ready
                  </p>
                  <p className="text-muted-foreground">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: lastPayment.currency,
                      maximumFractionDigits: 0,
                    }).format(lastPayment.total)}
                    {' · '}booking{' '}
                    <code className="font-mono text-[10px]">
                      {lastPayment.bookingId.slice(0, 8)}
                    </code>
                  </p>
                </div>
                <a
                  href={lastPayment.paymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Pay now →
                </a>
              </div>
            </div>
          )}

          {/* Promo code minted in this conversation */}
          {lastPromo && (
            <div className="border-t bg-emerald-50 dark:bg-emerald-950/30 px-4 py-2 text-center text-xs">
              <p className="font-medium text-emerald-900 dark:text-emerald-200">
                {lastPromo.percentOff}% off applied with code{' '}
                <code className="rounded bg-emerald-200/60 px-1.5 py-0.5 font-mono dark:bg-emerald-900/60">
                  {lastPromo.code}
                </code>
              </p>
              <p className="text-[10px] text-emerald-800/70 dark:text-emerald-300/70">
                Single-use, expires in 24h.
              </p>
            </div>
          )}

          {/* Handoff hint */}
          {lastWhatsappLink && (
            <div className="border-t bg-muted/40 px-4 py-2">
              <a
                href={lastWhatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center text-xs font-medium text-primary hover:underline"
              >
                Continue this conversation on WhatsApp →
              </a>
            </div>
          )}

          {/* Input */}
          <div className="border-t p-3">
            <ChatInput
              ref={inputRef}
              value={input}
              onChange={setInput}
              onSend={sendMessage}
              pending={pending}
            />
            {errorMessage && (
              <p className="mt-1.5 px-1 text-[11px] text-destructive">{errorMessage}</p>
            )}
            <p className="mt-1 px-1 text-[10px] text-muted-foreground">
              Messages stay on this device. Press Enter to send, Shift+Enter for a new line.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
