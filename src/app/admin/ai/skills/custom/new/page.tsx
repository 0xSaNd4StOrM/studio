import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ensureAgencyAccess } from '@/lib/supabase/agency-users';
import { SkillEditorForm } from '@/components/admin/skills/skill-editor-form';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function NewCustomSkillPage() {
  await ensureAgencyAccess();
  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2 h-8">
          <Link href="/admin/ai/skills">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to skills
          </Link>
        </Button>
        <h2 className="text-2xl font-bold tracking-tight">New custom skill</h2>
        <p className="text-muted-foreground">
          Author a skill specific to your agency. After saving, install it from the AI Skills
          page to activate it on chats.
        </p>
      </div>
      <SkillEditorForm />
    </div>
  );
}
