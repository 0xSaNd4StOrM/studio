'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { StoreSkillCard } from '@/components/admin/skills/store-skill-card';
import type { Skill, SkillCategory } from '@/types/skill';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StoreClientProps {
  skills: Skill[];
  installedSkillIds: string[];
}

type CategoryFilter = 'all' | SkillCategory;

const CATEGORY_TABS: Array<{ value: CategoryFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'persona', label: 'Persona' },
  { value: 'sales', label: 'Sales' },
  { value: 'service', label: 'Service' },
  { value: 'specialty', label: 'Specialty' },
];

export function StoreClient({ skills, installedSkillIds }: StoreClientProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const installedSet = useMemo(() => new Set(installedSkillIds), [installedSkillIds]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return skills.filter((s) => {
      if (category !== 'all' && s.category !== category) return false;
      if (!q) return true;
      const hay = `${s.name} ${s.description} ${s.slug}`.toLowerCase();
      return hay.includes(q);
    });
  }, [skills, query, category]);

  return (
    <div className="space-y-5">
      {/* ── Filter rail ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search skills…"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORY_TABS.map((tab) => {
            const isActive = category === tab.value;
            return (
              <Button
                key={tab.value}
                type="button"
                size="sm"
                variant={isActive ? 'default' : 'outline'}
                onClick={() => setCategory(tab.value)}
                className={cn('h-8', isActive && 'pointer-events-none')}
              >
                {tab.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* ── Grid ────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm font-medium">No skills match</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try a different category or clear the search.
          </p>
          {(query || category !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-3"
              onClick={() => {
                setQuery('');
                setCategory('all');
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((skill) => (
            <StoreSkillCard
              key={skill.id}
              skill={skill}
              isInstalled={installedSet.has(skill.id)}
            />
          ))}
        </div>
      )}

      <div className="rounded-lg border bg-muted/30 p-4 text-xs text-muted-foreground">
        <p>
          Built your own? Custom skills you publish appear here after review. Start at{' '}
          <Link
            href="/admin/ai/skills/custom/new"
            className="font-medium text-primary underline underline-offset-4"
          >
            Create a custom skill
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
