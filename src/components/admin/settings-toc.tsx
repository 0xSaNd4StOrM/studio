'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface SettingsSection {
  id: string;
  label: string;
  group: string;
  /** Extra search keywords (synonyms). */
  keywords?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

/**
 * Canonical inventory of settings sections.
 *
 * Each `id` must match an element with the same `id` rendered inside the
 * settings form. The TOC is a thin wayfinding layer over the existing
 * monolithic form — agencies can scroll-to or filter to the section
 * they care about without scrolling through 2,700+ lines.
 */
export const SETTINGS_SECTIONS: SettingsSection[] = [
  // Setup
  { id: 'business', label: 'Business configuration', group: 'Setup', keywords: 'modules hotels tours blog single mode' },
  { id: 'language', label: 'Admin interface language', group: 'Setup', keywords: 'i18n locale dashboard' },
  { id: 'security', label: 'Security', group: 'Setup', keywords: 'password account' },

  // Branding
  { id: 'general', label: 'General', group: 'Branding', keywords: 'agency name tagline contact email phone' },
  { id: 'about', label: 'About & address', group: 'Branding', keywords: 'description location' },
  { id: 'navigation', label: 'Navigation', group: 'Branding', keywords: 'links menu header' },
  { id: 'images', label: 'Page images', group: 'Branding', keywords: 'hero photo logo banner' },
  { id: 'social', label: 'Social media', group: 'Branding', keywords: 'facebook twitter instagram linkedin' },
  { id: 'theme', label: 'Theme', group: 'Branding', keywords: 'color font appearance dark light radius' },

  // Content
  { id: 'legal', label: 'Legal pages', group: 'Content', keywords: 'terms privacy policy security environmental' },
  { id: 'seo', label: 'SEO & metadata', group: 'Content', keywords: 'meta description keywords og image twitter' },

  // Operations
  { id: 'email', label: 'Email notifications', group: 'Operations', keywords: 'resend sender from booking confirmation' },
  { id: 'copilot', label: 'AI & Copilot', group: 'Setup', keywords: 'ai copilot github model gpt claude' },

  // Payments
  { id: 'payments', label: 'Payment methods', group: 'Payments', keywords: 'cash online checkout' },
  { id: 'kashier', label: 'Kashier credentials', group: 'Payments', keywords: 'merchant api key card online' },
  { id: 'currency', label: 'Currency', group: 'Payments', keywords: 'usd eur egp default display' },
];

interface SettingsTocProps {
  className?: string;
}

/**
 * SettingsToc — sticky left-rail navigation for the settings page.
 *
 * - Lists every section grouped by category
 * - Search filters by label + keywords (synonyms)
 * - Highlights the section currently in view via IntersectionObserver
 * - Mobile: collapses to a single search + dropdown via the parent
 *   wrapping logic (this component itself stays vertical)
 */
export function SettingsToc({ className }: SettingsTocProps) {
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SETTINGS_SECTIONS;
    return SETTINGS_SECTIONS.filter((s) => {
      const hay = `${s.label} ${s.keywords ?? ''} ${s.group}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query]);

  const grouped = useMemo(() => {
    const map = new Map<string, SettingsSection[]>();
    for (const s of filtered) {
      const list = map.get(s.group) ?? [];
      list.push(s);
      map.set(s.group, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  // IntersectionObserver tracks which section is currently in view.
  useEffect(() => {
    const elements = SETTINGS_SECTIONS.map(({ id }) =>
      document.getElementById(id)
    ).filter((el): el is HTMLElement => Boolean(el));
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the most-visible section as active.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-25% 0px -55% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const handleClick = (id: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveId(id);
  };

  return (
    <nav aria-label="Settings sections" className={cn('space-y-3', className)}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter settings…"
          className="h-9 pl-8 text-sm"
          aria-label="Filter settings sections"
        />
      </div>

      {grouped.length === 0 ? (
        <p className="px-2 py-4 text-xs text-muted-foreground">No matching sections.</p>
      ) : (
        <ul className="space-y-3">
          {grouped.map(([group, sections]) => (
            <li key={group}>
              <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group}
              </p>
              <ul className="space-y-0.5">
                {sections.map((s) => {
                  const isActive = activeId === s.id;
                  return (
                    <li key={s.id}>
                      <a
                        href={`#${s.id}`}
                        onClick={handleClick(s.id)}
                        aria-current={isActive ? 'true' : undefined}
                        className={cn(
                          'block rounded-md px-2 py-1.5 text-sm transition-colors',
                          isActive
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        {s.label}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
