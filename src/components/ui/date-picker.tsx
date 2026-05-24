'use client';

import * as React from 'react';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { format, parse, isValid } from 'date-fns';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface DatePickerProps {
  /** ISO `YYYY-MM-DD` string OR Date OR undefined for empty. */
  value?: string | Date | null;
  /** Receives an ISO `YYYY-MM-DD` string (or empty string for cleared). */
  onChange?: (value: string) => void;
  /** Optional placeholder when no date is selected. */
  placeholder?: string;
  /** Disable past dates. Default false. */
  disablePast?: boolean;
  /** Disable future dates. Default false. */
  disableFuture?: boolean;
  /** Show a clear (×) button when a value is set. Default true. */
  clearable?: boolean;
  /** Tailwind className for the trigger. */
  className?: string;
  /** Disable the input. */
  disabled?: boolean;
  /** HTML id for accessibility (label binding). */
  id?: string;
  /** Format token. Default "PPP" (e.g. "Mar 15, 2026"). */
  displayFormat?: string;
}

const ISO_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function toDate(value: string | Date | null | undefined): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return isValid(value) ? value : undefined;
  if (typeof value === 'string') {
    if (ISO_REGEX.test(value)) {
      const d = parse(value, 'yyyy-MM-dd', new Date());
      return isValid(d) ? d : undefined;
    }
    const d = new Date(value);
    return isValid(d) ? d : undefined;
  }
  return undefined;
}

function toIso(d: Date | undefined): string {
  if (!d) return '';
  return format(d, 'yyyy-MM-dd');
}

/**
 * DatePicker — single shared admin date picker.
 *
 * Renders a Popover-anchored shadcn Calendar instead of relying on the
 * browser's native `<input type="date">`, which renders inconsistently
 * across OSes (looks different on Mac, Windows, mobile Chrome, Safari)
 * and ignores our theme.
 *
 * Accepts either an ISO date string ("yyyy-MM-dd") or a Date for `value`.
 * Always emits an ISO string on change so backend form payloads stay
 * compatible with whatever the previous native `<input type="date">` was
 * sending — drop-in replacement.
 */
export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  disablePast = false,
  disableFuture = false,
  clearable = true,
  className,
  disabled,
  id,
  displayFormat = 'PPP',
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = toDate(value);

  const disabledMatcher = React.useMemo(() => {
    if (!disablePast && !disableFuture) return undefined;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return (d: Date) => {
      if (disablePast && d < today) return true;
      if (disableFuture && d > today) return true;
      return false;
    };
  }, [disablePast, disableFuture]);

  const handleSelect = (next: Date | undefined) => {
    if (!next) return;
    onChange?.(toIso(next));
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            !selected && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          <span className="flex-1 truncate">
            {selected ? format(selected, displayFormat) : placeholder}
          </span>
          {clearable && selected && (
            <button
              type="button"
              onClick={handleClear}
              className="ml-2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Clear date"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          disabled={disabledMatcher}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
