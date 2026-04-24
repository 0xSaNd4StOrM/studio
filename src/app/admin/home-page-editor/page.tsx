import { HomePageEditorForm } from '@/components/admin/home-page-editor/editor';
import { getHomePageContent } from '@/lib/supabase/agency-content';

export const dynamic = 'force-dynamic';

export default async function HomePageEditor() {
  const content = await getHomePageContent({ skipTranslation: true });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Home Page Editor</h2>
        <p className="text-muted-foreground">
          Modify sections of the main home page. Click &quot;Save Changes&quot; at the bottom to
          commit your updates.
        </p>
      </div>
      <HomePageEditorForm initialContent={content} />
    </div>
  );
}
