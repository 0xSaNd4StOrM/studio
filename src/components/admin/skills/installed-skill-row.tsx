'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  setSkillEnabledAction,
  uninstallSkillAction,
} from '@/app/admin/ai/skills/actions';
import type { InstalledSkill } from '@/types/skill';
import { CategoryBadge } from './category-badge';
import { Loader2, Pencil, Trash2 } from 'lucide-react';

interface InstalledSkillRowProps {
  installed: InstalledSkill;
  isCustom: boolean;
}

export function InstalledSkillRow({ installed, isCustom }: InstalledSkillRowProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [pendingToggle, startToggle] = useTransition();
  const [pendingUninstall, startUninstall] = useTransition();

  const { skill, isEnabled, id: agencySkillId } = installed;

  const handleToggle = (next: boolean) => {
    startToggle(async () => {
      const result = await setSkillEnabledAction(agencySkillId, next);
      if (!result.ok) {
        toast({
          title: 'Failed to toggle skill',
          description: result.error,
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: next ? 'Skill enabled' : 'Skill disabled',
      });
      router.refresh();
    });
  };

  const handleUninstall = () => {
    if (!confirm(`Uninstall "${skill.name}"? You can reinstall it from the store anytime.`)) return;
    startUninstall(async () => {
      const result = await uninstallSkillAction(agencySkillId);
      if (!result.ok) {
        toast({
          title: 'Failed to uninstall',
          description: result.error,
          variant: 'destructive',
        });
        return;
      }
      toast({ title: 'Skill uninstalled' });
      router.refresh();
    });
  };

  return (
    <div className="flex items-start gap-4 rounded-lg border bg-card p-4 shadow-sm transition-colors hover:bg-muted/30">
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold leading-tight">{skill.name}</h3>
          <CategoryBadge category={skill.category} />
          {isCustom && (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              Custom
            </span>
          )}
          {isCustom && skill.reviewStatus === 'pending' && (
            <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
              Pending review
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">{skill.description}</p>
        {skill.toolsAllowed.length > 0 && (
          <p className="text-[11px] text-muted-foreground">
            Tools: <span className="font-mono">{skill.toolsAllowed.join(', ')}</span>
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="flex items-center gap-2 pr-2 border-r">
          <span className="text-xs text-muted-foreground">{isEnabled ? 'On' : 'Off'}</span>
          <Switch
            checked={isEnabled}
            onCheckedChange={handleToggle}
            disabled={pendingToggle}
            aria-label={isEnabled ? 'Disable skill' : 'Enable skill'}
          />
        </div>
        {isCustom && (
          <Button asChild variant="ghost" size="icon" className="h-8 w-8" title="Edit">
            <Link href={`/admin/ai/skills/custom/${skill.id}/edit`}>
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Edit</span>
            </Link>
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={handleUninstall}
          disabled={pendingUninstall}
          title="Uninstall"
        >
          {pendingUninstall ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          <span className="sr-only">Uninstall</span>
        </Button>
      </div>
    </div>
  );
}
