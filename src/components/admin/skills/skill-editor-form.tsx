'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  createCustomSkillAction,
  deleteCustomSkillAction,
  submitSkillForReviewAction,
  updateCustomSkillAction,
  type CustomSkillFormInput,
} from '@/app/admin/ai/skills/actions';
import { SKILL_TOOL_OPTIONS } from './skill-tool-options';
import { MarkdownUploadDialog } from './markdown-upload-dialog';
import { AiDraftSkillDialog } from './ai-draft-skill-dialog';
import type { ParsedSkillMarkdown } from '@/lib/skills/parse-markdown';
import type { DraftedSkill } from '@/app/admin/ai/skills/actions';
import type { Skill, SkillCategory, SkillToolName } from '@/types/skill';
import { FileUp, Loader2, Send, Sparkles, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface SkillEditorFormProps {
  /** When set, the form edits an existing custom skill. Otherwise it creates. */
  skill?: Skill;
}

type FormState = {
  name: string;
  description: string;
  category: SkillCategory;
  systemPromptFragment: string;
  toolsAllowed: SkillToolName[];
};

const CATEGORY_OPTIONS: Array<{ value: SkillCategory; label: string; hint: string }> = [
  { value: 'persona', label: 'Persona', hint: 'Shapes the assistant\'s tone or voice.' },
  { value: 'sales', label: 'Sales', hint: 'Drives bookings — negotiation, upsell, closing.' },
  { value: 'service', label: 'Service', hint: 'Improves how the assistant communicates and helps.' },
  { value: 'specialty', label: 'Specialty', hint: 'Domain expertise (Egypt, family travel, sustainability, …).' },
];

function buildInitialForm(skill?: Skill): FormState {
  if (skill) {
    return {
      name: skill.name,
      description: skill.description,
      category: skill.category,
      systemPromptFragment: skill.systemPromptFragment,
      toolsAllowed: [...skill.toolsAllowed],
    };
  }
  return {
    name: '',
    description: '',
    category: 'specialty',
    systemPromptFragment: '',
    toolsAllowed: [],
  };
}

export function SkillEditorForm({ skill }: SkillEditorFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const isEdit = Boolean(skill);
  const [form, setForm] = useState<FormState>(() => buildInitialForm(skill));
  const [saving, startSave] = useTransition();
  const [publishing, startPublish] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [mdUploadOpen, setMdUploadOpen] = useState(false);
  const [aiDraftOpen, setAiDraftOpen] = useState(false);

  const applyMarkdown = (parsed: ParsedSkillMarkdown) => {
    setForm((prev) => ({
      name: parsed.name ?? prev.name,
      description: parsed.description ?? prev.description,
      category: parsed.category ?? prev.category,
      systemPromptFragment: parsed.systemPromptFragment || prev.systemPromptFragment,
      toolsAllowed: parsed.toolsAllowed ?? prev.toolsAllowed,
    }));
    if (parsed.warnings.length > 0) {
      toast({
        title: 'Imported with warnings',
        description: parsed.warnings.join(' '),
      });
    } else {
      toast({ title: 'Imported from Markdown', description: 'Review and save when ready.' });
    }
  };

  const applyAiDraft = (drafted: DraftedSkill) => {
    setForm({
      name: drafted.name,
      description: drafted.description,
      category: drafted.category,
      systemPromptFragment: drafted.systemPromptFragment,
      toolsAllowed: [...drafted.toolsAllowed],
    });
    toast({
      title: 'AI draft applied',
      description: 'Review the fields and tweak before saving.',
    });
  };

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleTool = (tool: SkillToolName, on: boolean) => {
    setForm((prev) => ({
      ...prev,
      toolsAllowed: on
        ? Array.from(new Set([...prev.toolsAllowed, tool]))
        : prev.toolsAllowed.filter((t) => t !== tool),
    }));
  };

  const handleSave = () => {
    const payload: CustomSkillFormInput = {
      name: form.name,
      description: form.description,
      category: form.category,
      systemPromptFragment: form.systemPromptFragment,
      toolsAllowed: form.toolsAllowed,
    };
    startSave(async () => {
      const result = isEdit && skill
        ? await updateCustomSkillAction(skill.id, payload)
        : await createCustomSkillAction(payload);
      if (!result.ok) {
        toast({
          title: isEdit ? 'Failed to save' : 'Failed to create',
          description: result.error,
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: isEdit ? 'Skill saved' : 'Skill created',
        description: isEdit
          ? 'Changes take effect on the next conversation.'
          : 'Install it on the My Skills page to activate it.',
      });
      router.push('/admin/ai/skills');
      router.refresh();
    });
  };

  const handlePublish = () => {
    if (!skill) return;
    if (
      !confirm(
        'Submit this skill to the public store for review? Once approved by the platform team, other agencies will be able to install it.'
      )
    )
      return;
    startPublish(async () => {
      const result = await submitSkillForReviewAction(skill.id);
      if (!result.ok) {
        toast({
          title: 'Failed to submit',
          description: result.error,
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: 'Submitted for review',
        description: 'The platform team will review and approve before it appears in the store.',
      });
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (!skill) return;
    if (!confirm(`Delete "${skill.name}"? This cannot be undone.`)) return;
    startDelete(async () => {
      const result = await deleteCustomSkillAction(skill.id);
      if (!result.ok) {
        toast({
          title: 'Failed to delete',
          description: result.error,
          variant: 'destructive',
        });
        return;
      }
      toast({ title: 'Skill deleted' });
      router.push('/admin/ai/skills');
      router.refresh();
    });
  };

  const trimmedName = form.name.trim();
  const trimmedDescription = form.description.trim();
  const trimmedPrompt = form.systemPromptFragment.trim();
  const canSave =
    trimmedName.length >= 3 &&
    trimmedDescription.length >= 10 &&
    trimmedPrompt.length >= 20 &&
    !saving;

  const canPublish = isEdit && skill && skill.reviewStatus !== 'pending' && skill.reviewStatus !== 'approved';
  const isPending = isEdit && skill?.reviewStatus === 'pending';
  const isApproved = isEdit && skill?.reviewStatus === 'approved';

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>{isEdit ? 'Edit custom skill' : 'Create a custom skill'}</CardTitle>
            <CardDescription>
              Skills shape how the AI Concierge behaves. Persona-only skills shape tone;
              tool-using skills unlock specific actions (when those tools are available on
              your plan).
            </CardDescription>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMdUploadOpen(true)}
            >
              <FileUp className="mr-1.5 h-4 w-4" />
              Import .md
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAiDraftOpen(true)}
            >
              <Sparkles className="mr-1.5 h-4 w-4" />
              Draft with AI
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="skill-name">Name</Label>
            <Input
              id="skill-name"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="Spa & Wellness Push"
              maxLength={80}
            />
            <p className="text-[11px] text-muted-foreground">{trimmedName.length}/80</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="skill-category">Category</Label>
            <Select
              value={form.category}
              onValueChange={(v) => update('category', v as SkillCategory)}
            >
              <SelectTrigger id="skill-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              {CATEGORY_OPTIONS.find((c) => c.value === form.category)?.hint}
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="skill-description">Description</Label>
          <Textarea
            id="skill-description"
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder="Promotes Aswan spa add-ons when visitors mention rest, honeymoon, or relaxation."
            rows={2}
            maxLength={300}
          />
          <p className="text-[11px] text-muted-foreground">
            Short summary shown on cards. {trimmedDescription.length}/300
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="skill-prompt">System prompt fragment</Label>
          <Textarea
            id="skill-prompt"
            value={form.systemPromptFragment}
            onChange={(e) => update('systemPromptFragment', e.target.value)}
            placeholder={'When the visitor mentions "relax", "honeymoon", or "tired", suggest adding a spa day in Aswan. Mention our partnerships with two riverside resorts.'}
            rows={6}
            maxLength={20000}
            className="font-mono text-sm"
          />
          <p className="text-[11px] text-muted-foreground">
            Appended to the agent&apos;s system prompt when this skill is active. Write it as a
            directive. {trimmedPrompt.length}/20000
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-sm font-medium">Tools this skill can use</Label>
            <p className="text-[11px] text-muted-foreground">
              The agent already has access to read-only tools (search, prices). Pick any
              additional tools this skill needs. Gated tools require the matching capability
              toggle on the AI Concierge page.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {SKILL_TOOL_OPTIONS.map((opt) => (
              <label
                key={opt.name}
                className="flex cursor-pointer items-start gap-2 rounded-md border p-2.5 transition-colors hover:bg-muted/30"
              >
                <Checkbox
                  checked={form.toolsAllowed.includes(opt.name)}
                  onCheckedChange={(v) => toggleTool(opt.name, v === true)}
                  className="mt-0.5"
                />
                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium">{opt.label}</span>
                    {opt.gated && (
                      <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-amber-700 dark:text-amber-300">
                        gated
                      </span>
                    )}
                  </div>
                  <span className="block text-xs text-muted-foreground">{opt.description}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {isEdit && skill && (
          <div className="rounded-lg border bg-muted/30 p-3 text-xs">
            <p className="font-medium">
              Review status:{' '}
              <span className="font-mono uppercase">{skill.reviewStatus}</span>
            </p>
            {isPending && (
              <p className="mt-1 text-muted-foreground">
                The platform team is reviewing this skill. It will appear in the public store
                once approved.
              </p>
            )}
            {isApproved && (
              <p className="mt-1 text-muted-foreground">
                Approved and published in the public store.
              </p>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
        {isEdit && (
          <Button
            type="button"
            variant="ghost"
            className="mr-auto text-destructive hover:text-destructive"
            onClick={handleDelete}
            disabled={deleting || saving || publishing}
          >
            {deleting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Delete
          </Button>
        )}
        {canPublish && (
          <Button
            type="button"
            variant="outline"
            onClick={handlePublish}
            disabled={publishing || saving || !canSave}
          >
            {publishing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Publish to store
          </Button>
        )}
        <Button asChild variant="ghost" disabled={saving}>
          <Link href="/admin/ai/skills">Cancel</Link>
        </Button>
        <Button type="button" onClick={handleSave} disabled={!canSave}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : isEdit ? (
            'Save changes'
          ) : (
            'Create skill'
          )}
        </Button>
      </CardFooter>

      <MarkdownUploadDialog
        open={mdUploadOpen}
        onOpenChange={setMdUploadOpen}
        onApply={applyMarkdown}
      />

      <AiDraftSkillDialog
        open={aiDraftOpen}
        onOpenChange={setAiDraftOpen}
        onApply={applyAiDraft}
      />
    </Card>
  );
}
