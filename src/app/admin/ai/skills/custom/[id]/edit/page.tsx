import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ensureAgencyAccess } from '@/lib/supabase/agency-users';
import { getCurrentAgency } from '@/lib/supabase/agencies';
import { getSkillById } from '@/lib/supabase/skills';
import { SkillEditorForm } from '@/components/admin/skills/skill-editor-form';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface EditCustomSkillPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCustomSkillPage({ params }: EditCustomSkillPageProps) {
  await ensureAgencyAccess();
  const { id } = await params;
  const agency = await getCurrentAgency();
  if (!agency) redirect('/admin/ai/skills');

  const skill = await getSkillById(id);
  if (!skill) notFound();
  // Only the author can edit. (Seeded public skills are read-only by design.)
  if (skill.createdByAgencyId !== agency.id) {
    redirect('/admin/ai/skills');
  }

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2 h-8">
          <Link href="/admin/ai/skills">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to skills
          </Link>
        </Button>
        <h2 className="text-2xl font-bold tracking-tight">Edit: {skill.name}</h2>
        <p className="text-muted-foreground">
          Changes apply on the next conversation. To share with other agencies, submit this
          skill for review.
        </p>
      </div>
      <SkillEditorForm skill={skill} />
    </div>
  );
}
