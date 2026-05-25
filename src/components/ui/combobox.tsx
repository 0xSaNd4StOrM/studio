'use client';

import * as React from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export type ComboboxOption = {
  value: string;
  label: string;
};

interface ComboboxProps {
  options: ComboboxOption[];
  selected: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
  /**
   * When the option list is small enough, render every option inline as a
   * toggleable chip. Otherwise show a search input + collapsible chip list.
   * Default 12.
   */
  inlineThreshold?: number;
}

/**
 * Combobox — inline multi-select.
 *
 * Replaces the previous popover/search variant which felt cramped on
 * mobile. Now renders all options as chip buttons in line with the form,
 * so:
 *
 *   - Touch targets are full-size (44px row height equivalent).
 *   - No floating layer to misalign or trap focus.
 *   - The full set of options is visible at a glance.
 *
 * When the option list exceeds `inlineThreshold` (12 by default), a
 * search input is shown above the chip grid so users can filter without
 * scrolling a huge wall of chips.
 */
export function Combobox({
  options,
  selected,
  onChange,
  placeholder = 'Select one or more',
  className,
  inlineThreshold = 12,
}: ComboboxProps) {
  const [query, setQuery] = React.useState('');
  const isLargeList = options.length > inlineThreshold;

  // Defensive coercion. If a caller hands us a non-array value (a string
  // from a corrupted record, or an undefined that got `|| []`-defaulted
  // to something falsy-but-not-array), we MUST NOT treat it as iterable
  // characters. Spreading a string in `handleToggle` would explode "Luxor"
  // into ["L","u","x","o","r"] and compound on every save — that's the
  // exact bug we fixed in v1 of this component.
  const safeSelected = React.useMemo<string[]>(
    () => (Array.isArray(selected) ? selected : []),
    [selected]
  );

  const visible = React.useMemo(() => {
    if (!query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const handleToggle = (value: string) => {
    if (safeSelected.includes(value)) {
      onChange(safeSelected.filter((s) => s !== value));
    } else {
      onChange([...safeSelected, value]);
    }
  };

  const clearAll = () => onChange([]);

  return (
    <div className={cn('space-y-2', className)}>
      {isLargeList && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Filter ${options.length} options…`}
            className="h-9 pl-9"
            aria-label="Filter options"
          />
        </div>
      )}

      {options.length === 0 ? (
        <p className="rounded-md border border-dashed border-input bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground">
          No options available.
        </p>
      ) : (
        <div
          role="group"
          aria-label={placeholder}
          className={cn(
            'flex flex-wrap gap-1.5 rounded-md border border-input bg-background p-2',
            isLargeList && 'max-h-56 overflow-y-auto'
          )}
        >
          {visible.length === 0 ? (
            <p className="w-full px-2 py-3 text-center text-xs text-muted-foreground">
              No matches for &quot;{query}&quot;.
            </p>
          ) : (
            visible.map((option) => {
              const isSelected = safeSelected.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => handleToggle(option.value)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                    isSelected
                      ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'border-input bg-background text-foreground hover:bg-muted'
                  )}
                >
                  {isSelected ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 rotate-[-90deg] opacity-0" />
                  )}
                  {option.label}
                </button>
              );
            })
          )}
        </div>
      )}

      {safeSelected.length > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {safeSelected.length} selected
            {safeSelected.length > 1 && ` of ${options.length}`}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-7 px-2 text-xs"
          >
            <X className="mr-1 h-3 w-3" />
            Clear all
          </Button>
        </div>
      )}

      {safeSelected.length === 0 && (
        <p className="text-xs text-muted-foreground">{placeholder}</p>
      )}
    </div>
  );
}
