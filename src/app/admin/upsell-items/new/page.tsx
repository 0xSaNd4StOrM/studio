import { UpsellItemForm } from "@/components/admin/upsell-item-form";
import { addUpsellItem } from "@/lib/supabase/upsell-items";

export default function NewUpsellItemPage() {
  return (
    <UpsellItemForm onSubmit={addUpsellItem} formType="new" />
  );
}
