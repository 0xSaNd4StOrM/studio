import { ensureAgencyAccess } from '@/lib/supabase/agency-users';
import { AiConciergeCard } from '@/components/admin/ai-concierge-card';

export const dynamic = 'force-dynamic';

export default async function AiConciergePage() {
  await ensureAgencyAccess();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">AI Concierge</h2>
        <p className="text-muted-foreground">
          Configure your AI travel assistant — its persona, knowledge, hard rules, and what it
          can do during conversations with visitors.
        </p>
      </div>
      <AiConciergeCard />
    </div>
  );
}
