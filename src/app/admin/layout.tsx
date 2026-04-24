import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { BroadcastBanner } from '@/components/admin/broadcast-banner';
import { ImpersonationBanner } from '@/components/admin/impersonation-banner';
import { AdminLayoutShell } from '@/components/admin/layout-shell';
import { getCurrentAgency } from '@/lib/supabase/agencies';
import { getPendingBookingsCount } from '@/lib/supabase/bookings';
import { recordAdminLogin } from '@/lib/supabase/super-admin';
import { getUnreadNotificationCount, getNotifications } from '@/lib/supabase/notifications';
import { checkAgencyAccess } from '@/lib/supabase/agency-users';
import { redirect } from 'next/navigation';
import { getAgencySettings } from '@/lib/supabase/agency-content';
import { AdminLanguageProvider } from '@/hooks/use-admin-language';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return children;
  }

  // Auto-provision: if the current agency has NO owners yet, the first authenticated
  // user to visit the admin becomes the owner. This handles fresh deployments where
  // an agency was created manually without an agency_users entry.
  const agency = await getCurrentAgency();
  if (agency?.id) {
    const adminClient = createServiceRoleClient();
    const { count } = await adminClient
      .from('agency_users')
      .select('*', { count: 'exact', head: true })
      .eq('agency_id', agency.id);

    if (count === 0) {
      await adminClient.from('agency_users').insert({
        user_id: user.id,
        agency_id: agency.id,
        role: 'owner',
      });
    }
  }

  // Verify the logged-in user belongs to the current agency (identified by slug in .env).
  // This prevents users from one agency accessing another agency's admin.
  const hasAccess = await checkAgencyAccess();
  if (!hasAccess) {
    redirect('/unauthorized');
  }

  const settings = agency?.settings || {};

  // Fetch admin language preference alongside other async work
  let defaultAdminLanguage = 'en';
  try {
    const agencySettings = await getAgencySettings({ skipTranslation: true });
    defaultAdminLanguage = agencySettings?.data?.adminLanguage ?? 'en';
  } catch {
    // proceed with English
  }

  // Fetch pending count + notifications in parallel
  const [pendingBookingsCount, [unreadCount, notifications]] = await Promise.all([
    getPendingBookingsCount(),
    agency?.id
      ? Promise.all([getUnreadNotificationCount(agency.id), getNotifications(agency.id)])
      : Promise.resolve<[number, never[]]>([0, []]),
  ]);

  // Record admin login timestamp (non-blocking)
  if (agency?.id) {
    recordAdminLogin(agency.id).catch(() => {});
  }

  return (
    <AdminLanguageProvider defaultAdminLanguage={defaultAdminLanguage}>
      <AdminLayoutShell
        user={user}
        settings={settings}
        pendingBookingsCount={pendingBookingsCount}
        agencyId={agency?.id}
        unreadNotificationCount={unreadCount}
        notifications={notifications}
      >
        <div className="w-full">
          <ImpersonationBanner />
          <BroadcastBanner agencyTier={settings?.tier} agencyStatus={agency?.status} />
          <Suspense>{children}</Suspense>
        </div>
      </AdminLayoutShell>
    </AdminLanguageProvider>
  );
}
