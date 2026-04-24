import { getAgencySettings } from '@/lib/supabase/agency-content';
import { NewTourClient } from './new-tour-client';

export default async function NewTourPage() {
  const settings = await getAgencySettings({ skipTranslation: true });

  const categories = settings?.data?.tourCategories ?? [];

  const destinations = settings?.data?.tourDestinations ?? [];

  return <NewTourClient categories={categories} destinations={destinations} />;
}
