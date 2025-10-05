import { getUpsellItems, deleteUpsellItem } from "@/lib/supabase/upsell-items";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import Link from "next/link";
import { UpsellItemsClient } from "./upsell-items-client";

export default async function UpsellItemsPage() {
  const upsellItems = await getUpsellItems();

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold tracking-tight">Upsell Items Management</h2>
            <p className="text-muted-foreground">
                Here's a list of all your upsell items. You can add, edit, or delete them.
            </p>
        </div>
        <div className="flex gap-2">
            <Button asChild>
                <Link href="/admin/upsell-items/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add New Upsell Item
                </Link>
            </Button>
        </div>
      </div>
      <UpsellItemsClient initialUpsellItems={upsellItems} onDelete={deleteUpsellItem} />
    </div>
  );
}