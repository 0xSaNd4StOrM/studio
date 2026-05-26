import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ensureAgencyAccess } from '@/lib/supabase/agency-users';
import { getCurrentAgency } from '@/lib/supabase/agencies';
import { listInstalledSkills, listPublicSkills } from '@/lib/supabase/skills';
import { ArrowLeft, Plug, Sparkles } from 'lucide-react';
import { StoreClient } from './store-client';

export const dynamic = 'force-dynamic';

export default async function SkillStorePage() {
  await ensureAgencyAccess();
  const agency = await getCurrentAgency();

  if (!agency || !agency.aiEnabled) {
    return (
      <div className="space-y-6">
        <Header />
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Copilot not connected
            </CardTitle>
            <CardDescription>
              Connect your GitHub Copilot subscription before browsing the skill store.
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

  const [skills, installed] = await Promise.all([
    listPublicSkills(),
    listInstalledSkills(agency.id),
  ]);

  return (
    <div className="space-y-6">
      <Header />
      <StoreClient
        skills={skills}
        installedSkillIds={installed.map((row) => row.skillId)}
      />
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2 h-8">
          <Link href="/admin/ai/skills">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to skills
          </Link>
        </Button>
        <h2 className="text-2xl font-bold tracking-tight">Skill Store</h2>
        <p className="text-muted-foreground">
          Behavioral add-ons curated by the platform team. Install any to shape how your AI
          Concierge talks to visitors.
        </p>
      </div>
    </div>
  );
}
