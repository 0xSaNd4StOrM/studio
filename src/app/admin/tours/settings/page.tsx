import { getAgencySettings } from '@/lib/supabase/agency-content';
import { SettingsClient } from './settings-client';

export const metadata = {
  title: 'Tour Settings',
  description: 'Manage your tour settings',
};

export default async function TourSettingsPage() {
  const settings = await getAgencySettings({ skipTranslation: true });

  return <SettingsClient initialSettings={settings?.data || null} />;
}
