'use client';

import { forwardRef, useEffect, useRef } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  value: string;
  onChange: (next: string) => void;
  onSend: () => void;
  disabled?: boolean;
  pending?: boolean;
  placeholder?: string;
  className?: string;
}

const MAX_LENGTH = 1000;

export const ChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(
  function ChatInput(
    { value, onChange, onSend, disabled = false, pending = false, placeholder, className },
    ref
  ) {
    const localRef = useRef<HTMLTextAreaElement | null>(null);

    useEffect(() => {
      const el = localRef.current;
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
    }, [value]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!pending && value.trim()) onSend();
      }
    };

    const trimmed = value.trim();
    const canSend = !pending && !disabled && trimmed.length > 0;

    return (
      <div
        className={cn(
          'flex items-end gap-2 rounded-2xl border bg-background p-2 shadow-sm focus-within:ring-2 focus-within:ring-primary/40',
          className
        )}
      >
        <Textarea
          ref={(node) => {
            localRef.current = node;
            if (typeof ref === 'function') ref(node);
            else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
          }}
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, MAX_LENGTH))}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
          placeholder={placeholder ?? 'Ask anything about our tours…'}
          className="min-h-9 resize-none border-none bg-transparent p-1.5 text-sm shadow-none focus-visible:ring-0"
        />
        <Button
          type="button"
          size="icon"
          onClick={onSend}
          disabled={!canSend}
          className="h-9 w-9 shrink-0 rounded-full"
          aria-label="Send"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    );
  }
);
