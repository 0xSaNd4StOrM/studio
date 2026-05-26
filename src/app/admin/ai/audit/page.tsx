import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ensureAgencyAccess } from '@/lib/supabase/agency-users';
import { getCurrentAgency } from '@/lib/supabase/agencies';
import {
  listRecentAuditEvents,
  listRecentNegotiations,
  type NegotiationAuditRow,
} from '@/lib/supabase/chat-sessions';
import type { ChatAuditEvent } from '@/types/ai-chat';
import { Plug, ScrollText, Wallet } from 'lucide-react';

export const dynamic = 'force-dynamic';

const EVENT_LABELS: Record<ChatAuditEvent['eventType'], string> = {
  tool_call: 'Tool call',
  refusal: 'Refusal',
  handoff: 'Handoff',
  message_in: 'Visitor message',
  message_out: 'Assistant reply',
  error: 'Error',
};

const EVENT_COLORS: Record<ChatAuditEvent['eventType'], string> = {
  tool_call: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  refusal: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  handoff: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  message_in: 'bg-muted text-muted-foreground',
  message_out: 'bg-muted text-muted-foreground',
  error: 'bg-destructive/15 text-destructive',
};

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function shortenSessionId(id: string): string {
  return id.slice(0, 8);
}

export default async function AiAuditPage() {
  await ensureAgencyAccess();
  const agency = await getCurrentAgency();

  if (!agency) {
    return (
      <div className="space-y-6">
        <Header />
        <Card>
          <CardContent className="pt-6">Agency context not found.</CardContent>
        </Card>
      </div>
    );
  }

  if (!agency.aiEnabled) {
    return (
      <div className="space-y-6">
        <Header />
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plug className="h-5 w-5" />
              Copilot not connected
            </CardTitle>
            <CardDescription>
              The audit log only fills once the AI Concierge is active. Connect Copilot first.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/admin/settings#copilot">Connect Copilot</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [events, negotiations] = await Promise.all([
    listRecentAuditEvents(agency.id, 200),
    listRecentNegotiations(agency.id, 100),
  ]);

  const negotiationCount = negotiations.length;
  const totalGrantedPct = negotiations.reduce(
    (sum, n) => sum + (n.grantedPct ?? 0),
    0
  );
  const avgGranted = negotiationCount > 0 ? Math.round(totalGrantedPct / negotiationCount) : 0;
  const toolCallCount = events.filter((e) => e.eventType === 'tool_call').length;
  const errorCount = events.filter((e) => e.eventType === 'error').length;

  return (
    <div className="space-y-6">
      <Header />

      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard
          label="Recent events"
          value={events.length}
          hint="Last 200 audit rows"
        />
        <StatCard
          label="Tool calls"
          value={toolCallCount}
          hint="LLM-initiated tool runs"
        />
        <StatCard
          label="Negotiations"
          value={negotiationCount}
          hint={`Avg granted: ${avgGranted}%`}
        />
        <StatCard
          label="Errors"
          value={errorCount}
          hint="Failed tool calls or model errors"
          tone={errorCount > 0 ? 'warn' : 'normal'}
        />
      </div>

      <NegotiationsCard rows={negotiations} />
      <EventsCard rows={events} />
    </div>
  );
}

function Header() {
  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight">AI Audit</h2>
      <p className="text-muted-foreground">
        Read-only log of what the AI Concierge has been doing on visitor chats. Useful for
        debugging odd answers, tracking negotiation outcomes, and seeing tool-call health.
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone = 'normal',
}: {
  label: string;
  value: number;
  hint: string;
  tone?: 'normal' | 'warn';
}) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-1 text-2xl font-bold ${
          tone === 'warn' && value > 0 ? 'text-destructive' : ''
        }`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function NegotiationsCard({ rows }: { rows: NegotiationAuditRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Wallet className="h-5 w-5" />
          Negotiations
        </CardTitle>
        <CardDescription>
          Discount codes the AI minted in recent chats. The platform enforces your cap — codes
          here never exceed it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No negotiations yet. They show up here once the AI mints its first promo code.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-3 font-medium">When</th>
                  <th className="py-2 pr-3 font-medium">Tour</th>
                  <th className="py-2 pr-3 font-medium">Requested</th>
                  <th className="py-2 pr-3 font-medium">Cap</th>
                  <th className="py-2 pr-3 font-medium">Granted</th>
                  <th className="py-2 pr-3 font-medium">Code</th>
                  <th className="py-2 pr-3 font-medium">Reason</th>
                  <th className="py-2 pr-3 font-medium">Session</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b last:border-b-0">
                    <td className="py-2 pr-3 text-xs text-muted-foreground tabular-nums">
                      {formatTime(row.createdAt)}
                    </td>
                    <td className="py-2 pr-3">{row.tourName ?? <span className="text-muted-foreground italic">cart-wide</span>}</td>
                    <td className="py-2 pr-3 tabular-nums">{row.requestedPct}%</td>
                    <td className="py-2 pr-3 tabular-nums text-muted-foreground">{row.capPct}%</td>
                    <td className="py-2 pr-3 tabular-nums font-medium">
                      {row.grantedPct !== null ? `${row.grantedPct}%` : '—'}
                    </td>
                    <td className="py-2 pr-3">
                      {row.promoCode ? (
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                          {row.promoCode}
                        </code>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 max-w-[24ch] truncate text-xs text-muted-foreground" title={row.reason ?? ''}>
                      {row.reason}
                    </td>
                    <td className="py-2 pr-3 font-mono text-[11px] text-muted-foreground">
                      {shortenSessionId(row.sessionId)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EventsCard({ rows }: { rows: ChatAuditEvent[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ScrollText className="h-5 w-5" />
          Recent events
        </CardTitle>
        <CardDescription>
          Every tool call, refusal, handoff, and error from the last 200 audit rows. Useful for
          diagnosing odd model behaviour.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No audit events yet. Send a chat from the public site to start filling this.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-3 font-medium">When</th>
                  <th className="py-2 pr-3 font-medium">Type</th>
                  <th className="py-2 pr-3 font-medium">Tool</th>
                  <th className="py-2 pr-3 font-medium">Summary</th>
                  <th className="py-2 pr-3 font-medium">Session</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b last:border-b-0">
                    <td className="py-2 pr-3 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                      {formatTime(row.createdAt)}
                    </td>
                    <td className="py-2 pr-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${EVENT_COLORS[row.eventType]}`}
                      >
                        {EVENT_LABELS[row.eventType]}
                      </span>
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs">
                      {row.toolName ?? <span className="text-muted-foreground">—</span>}
                    </td>
                    <td
                      className="py-2 pr-3 max-w-[60ch] truncate text-xs text-muted-foreground"
                      title={row.resultSummary ?? ''}
                    >
                      {row.resultSummary ?? '—'}
                    </td>
                    <td className="py-2 pr-3 font-mono text-[11px] text-muted-foreground">
                      {shortenSessionId(row.sessionId)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
