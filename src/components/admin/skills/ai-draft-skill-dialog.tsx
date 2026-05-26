'use client';

import { useState, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  draftSkillWithAi,
  type DraftedSkill,
} from '@/app/admin/ai/skills/actions';
import { CategoryBadge } from './category-badge';

interface AiDraftSkillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (drafted: DraftedSkill) => void;
}

const SUGGESTED_BRIEFS = [
  'A skill that suggests honeymoon-style add-ons when visitors are couples planning a romantic trip.',
  'A skill that politely upsells private guides when the visitor has a party of 4 or more.',
  'A skill that recommends shorter day trips when the visitor mentions limited time or a tight schedule.',
];

export function AiDraftSkillDialog({
  open,
  onOpenChange,
  onApply,
}: AiDraftSkillDialogProps) {
  const { toast } = useToast();
  const [brief, setBrief] = useState('');
  const [drafted, setDrafted] = useState<DraftedSkill | null>(null);
  const [pending, startTransition] = useTransition();

  const reset = () => {
    setBrief('');
    setDrafted(null);
  };

  const handleClose = (next: boolean) => {
    onOpenChange(next);
    if (!next) reset();
  };

  const runDraft = () => {
    const trimmed = brief.trim();
    if (trimmed.length < 10) {
      toast({
        title: 'Tell me a bit more',
        description: 'Describe the skill in at least a sentence — the AI needs context.',
        variant: 'destructive',
      });
      return;
    }
    startTransition(async () => {
      const result = await draftSkillWithAi(trimmed);
      if (!result.ok) {
        toast({
          title: 'AI drafter failed',
          description: result.error,
          variant: 'destructive',
        });
        return;
      }
      setDrafted(result.data);
    });
  };

  const handleApply = () => {
    if (!drafted) return;
    onApply(drafted);
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Draft a skill with AI
          </DialogTitle>
          <DialogDescription>
            Describe the skill you want and the AI will draft it for you. Review and edit the
            result before saving.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Brief</label>
            <Textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value.slice(0, 2000))}
              placeholder="e.g. A skill that suggests dinner cruise add-ons when visitors plan a romantic evening in Aswan."
              rows={4}
              maxLength={2000}
              disabled={pending}
            />
            <p className="text-[11px] text-muted-foreground">
              {brief.trim().length}/2000. Be specific about WHEN the skill should kick in and WHAT
              it should do.
            </p>
          </div>

          {!drafted && !pending && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Quick ideas
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_BRIEFS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setBrief(s)}
                    disabled={pending}
                    className="rounded-full border bg-background px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                  >
                    {s.length > 60 ? `${s.slice(0, 60)}…` : s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {drafted && (
            <div className="space-y-3 rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-semibold">{drafted.name}</h4>
                <CategoryBadge category={drafted.category} />
              </div>
              <p className="text-xs text-muted-foreground">{drafted.description}</p>
              <div className="rounded-md bg-muted/50 p-3 text-xs">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  System prompt fragment
                </p>
                <p className="whitespace-pre-wrap font-mono leading-relaxed">
                  {drafted.systemPromptFragment}
                </p>
              </div>
              {drafted.toolsAllowed.length > 0 && (
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Tools
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {drafted.toolsAllowed.map((t) => (
                      <code
                        key={t}
                        className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]"
                      >
                        {t}
                      </code>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="ghost" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          {drafted ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={runDraft}
                disabled={pending}
              >
                {pending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1.5 h-4 w-4" />
                )}
                Regenerate
              </Button>
              <Button type="button" onClick={handleApply}>
                Apply to form
              </Button>
            </>
          ) : (
            <Button
              type="button"
              onClick={runDraft}
              disabled={pending || brief.trim().length < 10}
            >
              {pending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Drafting…
                </>
              ) : (
                <>
                  <Sparkles className="mr-1.5 h-4 w-4" />
                  Draft skill
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
