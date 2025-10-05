import { getUpsellItemById, updateUpsellItem } from "@/lib/supabase/upsell-items";
import { UpsellItemForm } from "@/components/admin/upsell-item-form";
import { notFound } from "next/navigation";

interface EditUpsellItemPageProps {
  params: {
    id: string;
  };
}

export default async function EditUpsellItemPage({ params }: EditUpsellItemPageProps) {
  const upsellItem = await getUpsellItemById(params.id);

  if (!upsellItem) {
    notFound();
  }

  return (
    <UpsellItemForm initialData={upsellItem} onSubmit={(data) => updateUpsellItem(params.id, data)} formType="edit" />
  );
}
