'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { installSkillAction } from './actions';

interface InstallSkillButtonProps {
  skillId: string;
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  label?: string;
}

export function InstallSkillButton({
  skillId,
  size = 'sm',
  className,
  label = 'Install',
}: InstallSkillButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();

  const handleClick = () => {
    start(async () => {
      const result = await installSkillAction(skillId);
      if (!result.ok) {
        toast({
          title: 'Failed to install',
          description: result.error,
          variant: 'destructive',
        });
        return;
      }
      toast({ title: 'Skill installed' });
      router.refresh();
    });
  };

  return (
    <Button
      type="button"
      size={size}
      className={className}
      onClick={handleClick}
      disabled={pending}
    >
      {pending ? (
        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
      ) : (
        <Plus className="mr-1.5 h-4 w-4" />
      )}
      {label}
    </Button>
  );
}
