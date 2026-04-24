import { getUpsellItemById, updateUpsellItem } from '@/lib/supabase/upsell-items';
import { notFound } from 'next/navigation';
import UpsellItemEditClient from './upsell-item-edit-client';

export const dynamic = 'force-dynamic';

export default async function EditUpsellItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const upsellItem = await getUpsellItemById(id, { skipTranslation: true });

  if (!upsellItem) {
    notFound();
  }

  return (
    <UpsellItemEditClient initialData={upsellItem} onSubmit={updateUpsellItem.bind(null, id)} />
  );
}
