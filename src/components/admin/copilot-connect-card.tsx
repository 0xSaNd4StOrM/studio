'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  AI_FEATURES,
  AVAILABLE_MODELS,
  DEFAULT_MODEL_FOR_FEATURE,
  FEATURE_LABELS,
  type AiFeature,
  type ModelOption,
} from '@/lib/ai/models';
import { Copy, ExternalLink, Loader2, Plug, Sparkles } from 'lucide-react';
import { getCopilotStatusForAdmin, type CopilotStatus } from '@/app/admin/settings/copilot-actions';

type ConnectedSummary = {
  login: string;
  plan: string | null;
  connectedAt: string | null;
  preferences: Record<string, string>;
};

interface CopilotConnectCardProps {
  initial?: CopilotStatus | null;
}

type DeviceSession = {
  sessionId: string;
  userCode: string;
  verificationUri: string;
  expiresIn: number;
  interval: number;
};

function formatRelativeDate(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

export function CopilotConnectCard({ initial }: CopilotConnectCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [availableModels, setAvailableModels] = useState<ModelOption[]>(AVAILABLE_MODELS);
  const [connected, setConnected] = useState<ConnectedSummary | null>(
    initial?.connected && initial.login
      ? {
          login: initial.login,
          plan: initial.plan,
          connectedAt: initial.connectedAt,
          preferences: initial.preferences,
        }
      : null
  );

  useEffect(() => {
    if (initial !== undefined) return;
    let cancelled = false;
    (async () => {
      try {
        const status = await getCopilotStatusForAdmin();
        if (cancelled) return;
        if (status?.connected && status.login) {
          setConnected({
            login: status.login,
            plan: status.plan,
            connectedAt: status.connectedAt,
            preferences: status.preferences,
          });
        }
      } catch {
        // non-fatal; just show "not connected" state
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initial]);

  useEffect(() => {
    if (!connected) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/copilot/models');
        if (!res.ok) return;
        const body = (await res.json()) as {
          models?: Array<{ id: string; name: string; vendor: string; chat: boolean; enabled: boolean }>;
        };
        if (cancelled || !Array.isArray(body.models)) return;
        const chatModels = body.models.filter((m) => m.chat && m.enabled);
        if (chatModels.length === 0) return;
        const options: ModelOption[] = chatModels.map((m) => ({
          id: m.id,
          label: m.name ? `${m.name} (${m.id})` : m.id,
          tier: 'free',
          goodFor: [],
        }));
        setAvailableModels(options);
      } catch {
        // keep static fallback list
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [connected]);

  const [isConnecting, startConnect] = useTransition();
  const [isDisconnecting, startDisconnect] = useTransition();
  const [session, setSession] = useState<DeviceSession | null>(null);
  const [pollState, setPollState] = useState<'idle' | 'waiting' | 'error'>('idle');
  const [remainingMs, setRemainingMs] = useState<number>(0);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  };

  const closeDialog = () => {
    stopPolling();
    setSession(null);
    setPollState('idle');
    setRemainingMs(0);
  };

  const beginConnect = () => {
    startConnect(async () => {
      try {
        const res = await fetch('/api/copilot/device/start', { method: 'POST' });
        const body = await res.json();
        if (!res.ok) {
          toast({
            title: 'Failed to start Copilot connection',
            description: body?.message ?? body?.error ?? 'Please try again.',
            variant: 'destructive',
          });
          return;
        }
        const newSession: DeviceSession = body;
        setSession(newSession);
        setPollState('waiting');
        setRemainingMs(newSession.expiresIn * 1000);
        countdownRef.current = setInterval(() => {
          setRemainingMs((prev) => Math.max(0, prev - 1000));
        }, 1000);
        schedulePoll(newSession.sessionId, newSession.interval);
      } catch (error) {
        toast({
          title: 'Failed to start Copilot connection',
          description: error instanceof Error ? error.message : 'Please try again.',
          variant: 'destructive',
        });
      }
    });
  };

  const schedulePoll = (sessionId: string, intervalSeconds: number) => {
    pollTimerRef.current = setTimeout(() => {
      void runPoll(sessionId, intervalSeconds);
    }, intervalSeconds * 1000);
  };

  const runPoll = async (sessionId: string, intervalSeconds: number) => {
    try {
      const res = await fetch(`/api/copilot/device/poll?id=${encodeURIComponent(sessionId)}`);
      const body = await res.json();

      if (body?.status === 'pending') {
        const nextInterval =
          typeof body.interval === 'number' && body.interval > 0 ? body.interval : intervalSeconds;
        schedulePoll(sessionId, nextInterval);
        return;
      }

      if (body?.status === 'connected') {
        stopPolling();
        setSession(null);
        setConnected({
          login: body.login,
          plan: body.plan ?? null,
          connectedAt: new Date().toISOString(),
          preferences: connected?.preferences ?? {},
        });
        toast({
          title: 'GitHub Copilot connected',
          description: `Signed in as @${body.login}.`,
        });
        router.refresh();
        return;
      }

      // error
      stopPolling();
      setPollState('error');
      const description =
        body?.code === 'access_denied'
          ? 'You declined the authorization on GitHub.'
          : body?.code === 'expired_token'
            ? 'The device code expired. Please try again.'
            : (body?.message ?? body?.code ?? 'Connection failed.');
      toast({
        title: 'Copilot connection failed',
        description,
        variant: 'destructive',
      });
    } catch (error) {
      stopPolling();
      setPollState('error');
      toast({
        title: 'Copilot connection failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const disconnect = () => {
    if (!confirm('Disconnect GitHub Copilot? AI features will be hidden immediately.')) return;
    startDisconnect(async () => {
      try {
        const res = await fetch('/api/copilot/disconnect', { method: 'POST' });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast({
            title: 'Failed to disconnect',
            description: body?.message ?? body?.error ?? 'Please try again.',
            variant: 'destructive',
          });
          return;
        }
        setConnected(null);
        toast({ title: 'GitHub Copilot disconnected' });
        router.refresh();
      } catch (error) {
        toast({
          title: 'Failed to disconnect',
          description: error instanceof Error ? error.message : 'Please try again.',
          variant: 'destructive',
        });
      }
    });
  };

  const handleModelChange = async (feature: AiFeature, model: string) => {
    if (!connected) return;
    const previous = connected.preferences;
    setConnected({ ...connected, preferences: { ...previous, [feature]: model } });
    try {
      const res = await fetch('/api/copilot/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature, model }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setConnected({ ...connected, preferences: previous });
        toast({
          title: 'Failed to update model',
          description: body?.message ?? body?.error ?? 'Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      setConnected({ ...connected, preferences: previous });
      toast({
        title: 'Failed to update model',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const copyCode = async () => {
    if (!session) return;
    try {
      await navigator.clipboard.writeText(session.userCode);
      toast({ title: 'Code copied' });
    } catch {
      toast({ title: 'Could not copy', variant: 'destructive' });
    }
  };

  return (
    <Card id="copilot" className="scroll-mt-24">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI &amp; Copilot
        </CardTitle>
        <CardDescription>
          Connect your GitHub Copilot subscription to power AI features for this agency: tailor-made
          tours, blog drafts, SEO assistant, and more.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {!connected ? (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
            <p className="text-sm font-medium">Status: Not connected</p>
            <p className="text-sm text-muted-foreground">
              Requires Copilot Pro, Business, or Enterprise. Each agency uses its own GitHub
              account — your subscription pays for AI calls on your behalf.
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-lg border bg-emerald-50 dark:bg-emerald-950/30 p-4 space-y-1">
              <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
                Connected as @{connected.login}
              </p>
              {connected.plan ? (
                <p className="text-sm text-emerald-800/80 dark:text-emerald-300/80">
                  Plan: {connected.plan}
                </p>
              ) : null}
              {connected.connectedAt ? (
                <p className="text-xs text-emerald-800/70 dark:text-emerald-300/60">
                  Connected {formatRelativeDate(connected.connectedAt)}
                </p>
              ) : null}
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">Model preferences</p>
              <p className="text-xs text-muted-foreground">
                Pick which model powers each AI surface. All listed models are free under your
                Copilot subscription.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {AI_FEATURES.map((feature) => {
                  const current = connected.preferences[feature] ?? DEFAULT_MODEL_FOR_FEATURE[feature];
                  return (
                    <div key={feature} className="rounded-lg border p-3 space-y-2">
                      <p className="text-sm font-medium">{FEATURE_LABELS[feature]}</p>
                      <Select
                        value={current}
                        onValueChange={(value) => handleModelChange(feature, value)}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableModels.map((m) => (
                            <SelectItem key={m.id} value={m.id} className="text-sm">
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </CardContent>

      <CardFooter className="border-t pt-4 flex justify-end gap-2">
        {connected ? (
          <Button
            type="button"
            variant="outline"
            onClick={disconnect}
            disabled={isDisconnecting}
          >
            {isDisconnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Disconnect
          </Button>
        ) : (
          <Button type="button" onClick={beginConnect} disabled={isConnecting}>
            {isConnecting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plug className="mr-2 h-4 w-4" />
            )}
            Connect GitHub Copilot
          </Button>
        )}
      </CardFooter>

      <Dialog
        open={session !== null}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Connect GitHub Copilot</DialogTitle>
            <DialogDescription>
              Authorize this agency to use your Copilot subscription. The token is encrypted at rest
              and only used for AI generation calls.
            </DialogDescription>
          </DialogHeader>
          {session ? (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Step 1 — Open the GitHub device page</p>
                <Button asChild variant="outline" size="sm">
                  <a
                    href={session.verificationUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {session.verificationUri}
                  </a>
                </Button>
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Step 2 — Enter this code</p>
                <div className="flex items-center gap-2">
                  <code className="rounded-md border bg-muted px-3 py-2 text-lg font-mono tracking-wider">
                    {session.userCode}
                  </code>
                  <Button type="button" variant="outline" size="sm" onClick={copyCode}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </Button>
                </div>
              </div>
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                {pollState === 'waiting' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Waiting for authorization…
                  </>
                ) : (
                  'Authorization failed. Close this dialog and try again.'
                )}
                {remainingMs > 0 && pollState === 'waiting' ? (
                  <span className="ml-auto text-xs">
                    Expires in {Math.ceil(remainingMs / 60000)}m
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
