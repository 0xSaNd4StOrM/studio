import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ensureAgencyAccess } from '@/lib/supabase/agency-users';
import { getCurrentAgency } from '@/lib/supabase/agencies';
import { listInstalledSkills, listSkillsForAgency } from '@/lib/supabase/skills';
import { InstalledSkillRow } from '@/components/admin/skills/installed-skill-row';
import { InstallSkillButton } from './install-skill-button';
import { Plug, Plus, Sparkles, Store } from 'lucide-react';
import type { Skill } from '@/types/skill';

export const dynamic = 'force-dynamic';

export default async function AiSkillsPage() {
  await ensureAgencyAccess();

  const agency = await getCurrentAgency();
  if (!agency) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <Card>
          <CardContent className="pt-6">Agency context not found.</CardContent>
        </Card>
      </div>
    );
  }

  if (!agency.aiEnabled) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Copilot not connected
            </CardTitle>
            <CardDescription>
              Skills run on the AI Concierge, which requires a connected GitHub Copilot
              subscription.
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
      </div>
    );
  }

  const [installed, available] = await Promise.all([
    listInstalledSkills(agency.id),
    listSkillsForAgency(agency.id),
  ]);

  const installedSkillIds = new Set(installed.map((row) => row.skillId));
  const customSkills: Skill[] = available.filter(
    (s) => s.createdByAgencyId === agency.id
  );
  const enabledCount = installed.filter((r) => r.isEnabled).length;

  return (
    <div className="space-y-6">
      <PageHeader />

      {/* ── Quick stats ─────────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Installed" value={installed.length} hint="Total skills attached" />
        <StatCard label="Active" value={enabledCount} hint="Powering live conversations" />
        <StatCard
          label="Custom"
          value={customSkills.length}
          hint="Skills you've authored"
        />
      </div>

      {/* ── Installed skills ────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
          <div>
            <CardTitle>Installed skills</CardTitle>
            <CardDescription>
              Active skills shape every chat. Toggle them to test impact without uninstalling.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/ai/skills/store">
                <Store className="mr-1.5 h-4 w-4" />
                Browse store
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/admin/ai/skills/custom/new">
                <Plus className="mr-1.5 h-4 w-4" />
                Create custom
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {installed.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">No skills installed yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Skills shape how your AI Concierge talks to visitors. Start with one from the
                store.
              </p>
              <Button asChild size="sm" className="mt-4">
                <Link href="/admin/ai/skills/store">
                  <Store className="mr-1.5 h-4 w-4" />
                  Browse skill store
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {installed.map((row) => (
                <InstalledSkillRow
                  key={row.id}
                  installed={row}
                  isCustom={row.skill.createdByAgencyId === agency.id}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Custom skill drafts (not yet installed) ─────────────────── */}
      {customSkills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your custom skills</CardTitle>
            <CardDescription>
              Skills you&apos;ve authored. Drafts only run when installed below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {customSkills.map((skill) => {
                const installedRow = installed.find((r) => r.skillId === skill.id);
                return (
                  <div
                    key={skill.id}
                    className="flex items-start gap-3 rounded-lg border p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium leading-tight">{skill.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                        {skill.description}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                        <span className="font-mono">{skill.reviewStatus}</span>
                        {installedSkillIds.has(skill.id) ? (
                          <span className="text-emerald-600 dark:text-emerald-400">Installed</span>
                        ) : (
                          <span>Not installed</span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/admin/ai/skills/custom/${skill.id}/edit`}>Edit</Link>
                      </Button>
                      {!installedRow && (
                        <InstallSkillButton skillId={skill.id} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PageHeader() {
  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight">AI Skills</h2>
      <p className="text-muted-foreground">
        Manage the behavioral skills attached to your AI Concierge. Install from the public
        store or author your own.
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

