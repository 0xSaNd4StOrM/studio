'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Bot, Loader2, Plug, Sparkles } from 'lucide-react';
import Link from 'next/link';
import {
  getAiConciergeStatus,
  updateAiConciergeConfig,
} from '@/app/admin/settings/ai-concierge-actions';
import type { AgencyAiConfig, ChatDataAccess } from '@/types/ai-chat';
import type { AgencyAiConfigUpdate } from '@/lib/supabase/agency-ai-config';

type FormState = {
  agentName: string;
  greeting: string;
  personaPrompt: string;
  knowledgeText: string;
  rulesText: string;
  allowNegotiation: boolean;
  allowDiscounts: boolean;
  maxDiscountPct: number;
  allowBookingCreation: boolean;
  showConciergeWidget: boolean;
  greetingDelaySeconds: number;
  dataAccess: ChatDataAccess;
  allowBookingLookup: boolean;
  allowPaymentLinks: boolean;
};

function configToForm(c: AgencyAiConfig): FormState {
  return {
    agentName: c.agentName,
    greeting: c.greeting,
    personaPrompt: c.personaPrompt,
    knowledgeText: c.knowledgeText,
    rulesText: c.rulesText,
    allowNegotiation: c.allowNegotiation,
    allowDiscounts: c.allowDiscounts,
    maxDiscountPct: c.maxDiscountPct,
    allowBookingCreation: c.allowBookingCreation,
    showConciergeWidget: c.showConciergeWidget,
    greetingDelaySeconds: c.greetingDelaySeconds,
    dataAccess: { ...c.dataAccess },
    allowBookingLookup: c.allowBookingLookup,
    allowPaymentLinks: c.allowPaymentLinks,
  };
}

function isFormDirty(a: FormState | null, b: FormState | null): boolean {
  if (!a || !b) return false;
  return JSON.stringify(a) !== JSON.stringify(b);
}

export function AiConciergeCard() {
  const router = useRouter();
  const { toast } = useToast();
  const [loaded, setLoaded] = useState(false);
  const [copilotConnected, setCopilotConnected] = useState(false);
  const [initial, setInitial] = useState<FormState | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, startSave] = useTransition();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const status = await getAiConciergeStatus();
      if (cancelled) return;
      if (status.ok) {
        const f = configToForm(status.config);
        setInitial(f);
        setForm(f);
        setCopilotConnected(status.copilotConnected);
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dirty = useMemo(() => isFormDirty(form, initial), [form, initial]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const updateDataAccess = <K extends keyof ChatDataAccess>(key: K, value: boolean) => {
    setForm((prev) =>
      prev ? { ...prev, dataAccess: { ...prev.dataAccess, [key]: value } } : prev
    );
  };

  const handleSave = () => {
    if (!form) return;
    const patch: AgencyAiConfigUpdate = {
      agentName: form.agentName,
      greeting: form.greeting,
      personaPrompt: form.personaPrompt,
      knowledgeText: form.knowledgeText,
      rulesText: form.rulesText,
      allowNegotiation: form.allowNegotiation,
      allowDiscounts: form.allowDiscounts,
      maxDiscountPct: form.maxDiscountPct,
      allowBookingCreation: form.allowBookingCreation,
      showConciergeWidget: form.showConciergeWidget,
      greetingDelaySeconds: form.greetingDelaySeconds,
      dataAccess: form.dataAccess,
      allowBookingLookup: form.allowBookingLookup,
      allowPaymentLinks: form.allowPaymentLinks,
    };
    startSave(async () => {
      const result = await updateAiConciergeConfig(patch);
      if (!result.ok) {
        toast({
          title: 'Failed to save',
          description: result.error,
          variant: 'destructive',
        });
        return;
      }
      const next = configToForm(result.config);
      setInitial(next);
      setForm(next);
      toast({
        title: 'AI Concierge updated',
        description: 'Changes take effect on the next visitor conversation.',
      });
      router.refresh();
    });
  };

  const handleRevert = () => {
    if (initial) setForm(initial);
  };

  // ── Not connected state ────────────────────────────────────────────────
  if (loaded && !copilotConnected) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Copilot not connected
          </CardTitle>
          <CardDescription>
            The AI Concierge runs on your GitHub Copilot subscription. Connect it first to
            unlock configuration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/admin/settings#copilot">
              <Plug className="mr-2 h-4 w-4" />
              Connect Copilot first
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── Loading state ──────────────────────────────────────────────────────
  if (!loaded || !form) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Agent configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading config…
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Loaded + editable ──────────────────────────────────────────────────
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Agent configuration
        </CardTitle>
        <CardDescription>
          The assistant uses the chat model selected on the{' '}
          <Link href="/admin/settings#copilot" className="underline underline-offset-4">
            AI &amp; Copilot
          </Link>{' '}
          page.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-8">
        {/* ── Persona ───────────────────────────────────────────────── */}
        <section className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold">Persona</h3>
            <p className="text-xs text-muted-foreground">
              How the assistant introduces itself and what tone it uses.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ai-agent-name">Agent name</Label>
              <Input
                id="ai-agent-name"
                value={form.agentName}
                onChange={(e) => update('agentName', e.target.value)}
                placeholder="Cleo"
                maxLength={120}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ai-greeting">Greeting message</Label>
              <Input
                id="ai-greeting"
                value={form.greeting}
                onChange={(e) => update('greeting', e.target.value)}
                placeholder="Hi! How can I help you plan your trip?"
                maxLength={120}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ai-persona">Persona prompt</Label>
            <Textarea
              id="ai-persona"
              value={form.personaPrompt}
              onChange={(e) => update('personaPrompt', e.target.value)}
              placeholder="Warm, knowledgeable, never pushy. Confirm understanding before recommending."
              rows={4}
              maxLength={8000}
            />
            <p className="text-[11px] text-muted-foreground">
              Free-form. Describe how the assistant should sound and behave.
            </p>
          </div>
        </section>

        {/* ── Knowledge ─────────────────────────────────────────────── */}
        <section className="space-y-2">
          <div>
            <h3 className="text-sm font-semibold">Knowledge</h3>
            <p className="text-xs text-muted-foreground">
              Background facts the assistant can reference (history of the agency, specialties,
              policies). Anything the LLM should &quot;know&quot; about you beyond the tour catalog.
            </p>
          </div>
          <Textarea
            value={form.knowledgeText}
            onChange={(e) => update('knowledgeText', e.target.value)}
            placeholder="We're a family-run agency specializing in Egypt and the Red Sea. Our guides are licensed Egyptologists. We prioritize small-group experiences and offer free airport pickup on trips longer than 4 days."
            rows={5}
            maxLength={8000}
          />
        </section>

        {/* ── Rules ─────────────────────────────────────────────────── */}
        <section className="space-y-2">
          <div>
            <h3 className="text-sm font-semibold">Hard rules</h3>
            <p className="text-xs text-muted-foreground">
              Constraints the assistant must always follow. One per line. The platform also
              enforces a set of universal rules (never invent prices, never promise availability,
              stay on topic).
            </p>
          </div>
          <Textarea
            value={form.rulesText}
            onChange={(e) => update('rulesText', e.target.value)}
            placeholder={'- Always mention travel insurance for trips longer than 5 days.\n- Never quote prices in EUR; always USD or EGP.\n- Recommend airport pickup whenever a trip ends in Cairo.'}
            rows={5}
            maxLength={8000}
            className="font-mono text-sm"
          />
        </section>

        {/* ── Capabilities ──────────────────────────────────────────── */}
        <section className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold">Capabilities</h3>
            <p className="text-xs text-muted-foreground">
              What the assistant is allowed to do. Discounts and cart adjustments are
              enforced server-side — even a jailbroken persona can&apos;t exceed these caps.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Show concierge widget on site</Label>
                <p className="text-xs text-muted-foreground">
                  Master switch: when off, the floating chat bubble is hidden for all visitors.
                </p>
              </div>
              <Switch
                checked={form.showConciergeWidget}
                onCheckedChange={(v) => update('showConciergeWidget', v)}
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Allow negotiation</Label>
                <p className="text-xs text-muted-foreground">
                  Let the assistant engage when a visitor asks for a deal.
                </p>
              </div>
              <Switch
                checked={form.allowNegotiation}
                onCheckedChange={(v) => update('allowNegotiation', v)}
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Allow discounts</Label>
                <p className="text-xs text-muted-foreground">
                  Permit the assistant to mint single-use promo codes (within the cap below).
                </p>
              </div>
              <Switch
                checked={form.allowDiscounts}
                onCheckedChange={(v) => update('allowDiscounts', v)}
              />
            </div>

            <div className="rounded-lg border p-3 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="ai-max-discount" className="text-sm font-medium">
                  Max discount cap
                </Label>
                <span className="text-sm font-mono tabular-nums">{form.maxDiscountPct}%</span>
              </div>
              <Slider
                id="ai-max-discount"
                value={[form.maxDiscountPct]}
                onValueChange={([v]) => update('maxDiscountPct', v ?? 0)}
                min={0}
                max={50}
                step={1}
                disabled={!form.allowDiscounts}
              />
              <p className="text-xs text-muted-foreground">
                Maximum percentage off the assistant can offer per booking. Hard-enforced
                server-side.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Allow adding tours to cart</Label>
                  <p className="text-xs text-muted-foreground">
                    Let the assistant put tours in the visitor&apos;s cart with one click.
                  </p>
                </div>
                <Switch
                  checked={form.allowBookingCreation}
                  onCheckedChange={(v) => update('allowBookingCreation', v)}
                />
              </div>
              {!form.allowBookingCreation && (
                <p className="rounded-md border border-amber-200 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-800 dark:border-amber-900 dark:text-amber-300">
                  Cart adds are off — when a visitor wants to book a tour, the assistant will
                  share a link to the tour page instead so they can use your normal checkout.
                </p>
              )}
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Allow booking lookup (customer support)</Label>
                <p className="text-xs text-muted-foreground">
                  Visitors can ask the assistant to check their booking status. Requires email
                  AND name; capped at 5 attempts per session.
                </p>
              </div>
              <Switch
                checked={form.allowBookingLookup}
                onCheckedChange={(v) => update('allowBookingLookup', v)}
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Allow payment links</Label>
                <p className="text-xs text-muted-foreground">
                  Let the assistant mint a Kashier checkout link for a pending booking. Requires
                  Kashier credentials to be configured.
                </p>
              </div>
              <Switch
                checked={form.allowPaymentLinks}
                onCheckedChange={(v) => update('allowPaymentLinks', v)}
              />
            </div>

            <div className="rounded-lg border p-3 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="ai-greeting-delay" className="text-sm font-medium">
                  Greeting bubble delay
                </Label>
                <span className="text-sm font-mono tabular-nums">
                  {form.greetingDelaySeconds}s
                </span>
              </div>
              <Slider
                id="ai-greeting-delay"
                value={[form.greetingDelaySeconds]}
                onValueChange={([v]) => update('greetingDelaySeconds', v ?? 0)}
                min={0}
                max={60}
                step={1}
              />
              <p className="text-xs text-muted-foreground">
                Seconds after page load before the proactive greeting appears (set to 0 to disable
                the auto-bubble). The launcher icon is always visible.
              </p>
            </div>
          </div>
        </section>

        {/* ── Data access ───────────────────────────────────────────── */}
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">Data the assistant can read</h3>
            <p className="text-xs text-muted-foreground">
              Limit what the AI can see when answering questions. The public catalog and prices
              are typically required for useful answers.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <DataAccessRow
              label="Public tour catalog"
              hint="Tour names, descriptions, itineraries — always on."
              value={form.dataAccess.public_catalog}
              onChange={(v) => updateDataAccess('public_catalog', v)}
            />
            <DataAccessRow
              label="Prices and packages"
              hint="Pricing tiers, per-adult/child prices."
              value={form.dataAccess.prices}
              onChange={(v) => updateDataAccess('prices', v)}
            />
            <DataAccessRow
              label="Availability calendar"
              hint="Date-by-date spots remaining."
              value={form.dataAccess.availability}
              onChange={(v) => updateDataAccess('availability', v)}
            />
            <DataAccessRow
              label="Internal admin notes"
              hint="Private fields admins use for ops."
              value={form.dataAccess.admin_notes}
              onChange={(v) => updateDataAccess('admin_notes', v)}
            />
            <DataAccessRow
              label="Customer review text"
              hint="Full review bodies (not just average rating)."
              value={form.dataAccess.review_text}
              onChange={(v) => updateDataAccess('review_text', v)}
            />
          </div>
        </section>

        {/* ── Skills (link to dedicated page) ──────────────────────── */}
        <section className="rounded-lg border bg-muted/30 p-4 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Skills</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Behavioral add-ons (Hard Negotiator, Egypt Specialist, etc.) shape how the
              assistant talks. Install built-in skills or author your own.
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link href="/admin/ai/skills">Manage skills →</Link>
          </Button>
        </section>
      </CardContent>

      <CardFooter className="border-t pt-4 flex items-center justify-end gap-2">
        {dirty && (
          <Button type="button" variant="ghost" onClick={handleRevert} disabled={saving}>
            Revert
          </Button>
        )}
        <Button type="button" onClick={handleSave} disabled={!dirty || saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            'Save changes'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

function DataAccessRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded-md border p-2.5 transition-colors hover:bg-muted/30">
      <Checkbox
        checked={value}
        onCheckedChange={(v) => onChange(v === true)}
        className="mt-0.5"
      />
      <div className="flex-1 space-y-0.5">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </div>
    </label>
  );
}
