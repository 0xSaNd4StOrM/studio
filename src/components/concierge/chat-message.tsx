'use client';

import { cn } from '@/lib/utils';
import { Sparkles, AlertTriangle } from 'lucide-react';
import type { ChatHistoryMessage } from '@/hooks/use-chat-session';
import { tokenizeChatMessage } from '@/lib/chat-markdown';

interface ChatMessageProps {
  message: ChatHistoryMessage;
  agentName: string;
}

const TOOL_LABELS: Record<string, string> = {
  searchTours: 'Searched tours',
  getTourDetails: 'Loaded tour details',
  getPrice: 'Calculated price',
  checkAvailability: 'Checked availability',
  proposeDiscount: 'Asked about a discount',
  addToCart: 'Updated your cart',
  reviseItinerary: 'Revised the itinerary',
  handoffToHuman: 'Prepared a handoff',
  listSkills: 'Listed capabilities',
  linkToTour: 'Found a tour page',
  lookupBookings: 'Checked your bookings',
  getBookingPaymentStatus: 'Checked payment status',
  createPaymentLink: 'Prepared a payment link',
};

function MessageBody({ content, isUser }: { content: string; isUser: boolean }) {
  const tokens = tokenizeChatMessage(content);
  return (
    <>
      {tokens.map((tok, i) => {
        if (tok.type === 'text') {
          return <span key={i}>{tok.value}</span>;
        }
        return (
          <a
            key={i}
            href={tok.href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'font-medium underline underline-offset-2 transition-colors',
              isUser
                ? 'text-primary-foreground/90 hover:text-primary-foreground'
                : 'text-primary hover:text-primary/80'
            )}
          >
            {tok.label}
          </a>
        );
      })}
    </>
  );
}

export function ChatMessage({ message, agentName }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const hasError = message.meta?.error === true;

  // Suppress empty assistant placeholder bubbles entirely — the streaming
  // widget shows a thinking indicator while waiting for the first delta.
  if (
    !isUser &&
    !hasError &&
    !message.content &&
    (!message.toolCalls || message.toolCalls.length === 0)
  ) {
    return null;
  }

  return (
    <div className={cn('flex w-full min-w-0', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'group flex min-w-0 flex-col gap-1',
          // User bubbles right-align at 88%; assistant bubbles allow the
          // full row so the tool-call pill rail and long links wrap cleanly.
          isUser ? 'max-w-[88%] items-end' : 'max-w-full items-start'
        )}
      >
        {!isUser && (
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <Sparkles className="h-3 w-3" />
            <span>{agentName}</span>
          </div>
        )}

        {message.toolCalls && message.toolCalls.length > 0 && !isUser && (
          <div className="flex flex-wrap gap-1.5">
            {message.toolCalls.map((tc, i) => (
              <span
                key={`${tc.name}-${i}`}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
                  tc.ok
                    ? 'bg-primary/10 text-primary'
                    : 'bg-destructive/10 text-destructive'
                )}
              >
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
                {TOOL_LABELS[tc.name] ?? tc.name}
              </span>
            ))}
          </div>
        )}

        <div
          className={cn(
            'min-w-0 whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm',
            // overflow-wrap:anywhere breaks inside words too — handles raw
            // URLs and long unbroken strings without horizontal scroll.
            '[overflow-wrap:anywhere]',
            isUser
              ? 'rounded-br-md bg-primary text-primary-foreground'
              : 'rounded-bl-md bg-muted text-foreground',
            hasError && 'border border-destructive/40'
          )}
        >
          {hasError && (
            <span className="mr-1 inline-flex items-center text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" />
            </span>
          )}
          {message.content ? (
            <MessageBody content={message.content} isUser={isUser} />
          ) : (
            <span className="opacity-60 italic">…</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function ChatThinkingIndicator({ agentName }: { agentName: string }) {
  return (
    <div className="flex w-full justify-start">
      <div className="flex max-w-[88%] flex-col gap-1 items-start">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          <Sparkles className="h-3 w-3 animate-pulse" />
          <span>{agentName}</span>
        </div>
        <div className="rounded-2xl rounded-bl-md bg-muted px-4 py-3 shadow-sm">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/60 [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/60 [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/60" />
          </span>
        </div>
      </div>
    </div>
  );
}
