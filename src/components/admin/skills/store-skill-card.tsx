'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { installSkillAction } from '@/app/admin/ai/skills/actions';
import { Check, Loader2, Plus } from 'lucide-react';
import type { Skill } from '@/types/skill';
import { CategoryBadge } from './category-badge';
import { SKILL_TOOL_OPTIONS_BY_NAME } from './skill-tool-options';

interface StoreSkillCardProps {
  skill: Skill;
  isInstalled: boolean;
}

export function StoreSkillCard({ skill, isInstalled }: StoreSkillCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startInstall] = useTransition();

  const handleInstall = () => {
    startInstall(async () => {
      const result = await installSkillAction(skill.id);
      if (!result.ok) {
        toast({
          title: 'Failed to install',
          description: result.error,
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: 'Skill installed',
        description: `${skill.name} is now active on your AI Concierge.`,
      });
      router.refresh();
    });
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="space-y-2 pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-tight">{skill.name}</CardTitle>
          <CategoryBadge category={skill.category} />
        </div>
        <CardDescription className="line-clamp-3 min-h-[60px]">
          {skill.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-3">
        {skill.toolsAllowed.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Tools used
            </p>
            <div className="flex flex-wrap gap-1.5">
              {skill.toolsAllowed.map((tool) => {
                const opt = SKILL_TOOL_OPTIONS_BY_NAME.get(tool);
                return (
                  <span
                    key={tool}
                    className="inline-flex items-center rounded-md border bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium"
                    title={opt?.description ?? tool}
                  >
                    {opt?.label ?? tool}
                  </span>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-xs italic text-muted-foreground">
            Persona-only — shapes tone without unlocking new tools.
          </p>
        )}
      </CardContent>
      <CardFooter>
        {isInstalled ? (
          <Button variant="outline" size="sm" disabled className="w-full">
            <Check className="mr-1.5 h-4 w-4" />
            Installed
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            className="w-full"
            onClick={handleInstall}
            disabled={pending}
          >
            {pending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-1.5 h-4 w-4" />
            )}
            Install
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
