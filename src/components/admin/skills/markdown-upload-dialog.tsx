'use client';

import { useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, FileUp, Upload, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  parseSkillMarkdown,
  type ParsedSkillMarkdown,
} from '@/lib/skills/parse-markdown';

interface MarkdownUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the parsed fields when the user clicks Apply. */
  onApply: (parsed: ParsedSkillMarkdown) => void;
}

const MAX_FILE_BYTES = 200 * 1024; // 200 KB — far more than any sane skill .md

export function MarkdownUploadDialog({
  open,
  onOpenChange,
  onApply,
}: MarkdownUploadDialogProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedSkillMarkdown | null>(null);
  const [rawPreview, setRawPreview] = useState<string>('');

  const reset = () => {
    setFileName(null);
    setParsed(null);
    setRawPreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFile = async (file: File) => {
    if (file.size > MAX_FILE_BYTES) {
      toast({
        title: 'File too large',
        description: 'Skill markdown files should be under 200 KB.',
        variant: 'destructive',
      });
      return;
    }
    const text = await file.text();
    const result = parseSkillMarkdown(text);
    setFileName(file.name);
    setRawPreview(text);
    setParsed(result);
  };

  const handleApply = () => {
    if (!parsed) return;
    onApply(parsed);
    onOpenChange(false);
    reset();
  };

  const handleClose = (next: boolean) => {
    onOpenChange(next);
    if (!next) reset();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5" />
            Import skill from Markdown
          </DialogTitle>
          <DialogDescription>
            Upload a <code className="font-mono">.md</code> file. Optional YAML-style
            frontmatter at the top auto-fills the form fields; the body becomes the system
            prompt. See the example below the picker.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File picker */}
          <div className="rounded-lg border border-dashed bg-muted/30 p-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".md,.markdown,text/markdown"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                {fileName ? (
                  <>
                    <p className="truncate text-sm font-medium">{fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {rawPreview.length.toLocaleString()} chars parsed.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium">Choose a Markdown file</p>
                    <p className="text-xs text-muted-foreground">
                      .md or .markdown, max 200 KB.
                    </p>
                  </>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                {fileName && (
                  <Button type="button" variant="ghost" size="sm" onClick={reset}>
                    <X className="mr-1 h-4 w-4" />
                    Clear
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-1 h-4 w-4" />
                  {fileName ? 'Replace' : 'Browse…'}
                </Button>
              </div>
            </div>
          </div>

          {/* Preview */}
          {parsed && (
            <div className="space-y-3 rounded-lg border bg-card p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Will apply:
              </p>
              <dl className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-1.5 text-xs">
                <dt className="text-muted-foreground">Name</dt>
                <dd className="font-medium">
                  {parsed.name || <span className="italic text-muted-foreground">unchanged</span>}
                </dd>
                <dt className="text-muted-foreground">Description</dt>
                <dd className="font-medium">
                  {parsed.description || (
                    <span className="italic text-muted-foreground">unchanged</span>
                  )}
                </dd>
                <dt className="text-muted-foreground">Category</dt>
                <dd className="font-medium">
                  {parsed.category ?? (
                    <span className="italic text-muted-foreground">unchanged</span>
                  )}
                </dd>
                <dt className="text-muted-foreground">Tools</dt>
                <dd className="font-mono text-[11px]">
                  {parsed.toolsAllowed && parsed.toolsAllowed.length > 0 ? (
                    parsed.toolsAllowed.join(', ')
                  ) : (
                    <span className="italic text-muted-foreground">unchanged</span>
                  )}
                </dd>
                <dt className="text-muted-foreground">Prompt</dt>
                <dd className="font-medium">
                  {parsed.systemPromptFragment.length > 0
                    ? `${parsed.systemPromptFragment.length.toLocaleString()} chars`
                    : <span className="italic text-muted-foreground">empty</span>}
                </dd>
              </dl>

              {parsed.warnings.length > 0 && (
                <div className="space-y-1 rounded-md bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-300">
                  <div className="flex items-center gap-1.5 font-medium">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Warnings
                  </div>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {parsed.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Format example */}
          {!parsed && (
            <details className="rounded-lg border bg-muted/20 p-3 text-xs">
              <summary className="cursor-pointer font-medium">Format example</summary>
              <pre className="mt-2 overflow-auto whitespace-pre-wrap rounded bg-background p-2 font-mono text-[11px] leading-relaxed">{`---
name: Spa & Wellness Push
description: Promotes Aswan spa add-ons when visitors mention rest or honeymoon.
category: sales
tools: [getTourDetails, addToCart]
---

When the visitor mentions "relax", "honeymoon", or "tired",
suggest adding a spa day in Aswan. We have partnerships with
two riverside resorts — mention this when relevant.`}</pre>
            </details>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleApply} disabled={!parsed}>
            Apply to form
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
