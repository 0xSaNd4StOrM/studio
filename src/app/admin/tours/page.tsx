import { getTours } from '@/lib/supabase/tours';
import { columns } from './columns';
import { DataTable } from './data-table';
import { Button } from '@/components/ui/button';
import { PlusCircle, Settings } from 'lucide-react';
import Link from 'next/link';

export default async function ToursPage() {
  const tours = await getTours({ skipTranslation: true });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tours</h1>
          <p className="text-muted-foreground mt-1">
            Manage your tour packages, pricing, and availability.
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" asChild className="flex-1 sm:flex-none">
            <Link href="/admin/tours/settings">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </Button>
          <Button asChild className="flex-1 sm:flex-none">
            <Link href="/admin/tours/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              New Tour
            </Link>
          </Button>
        </div>
      </div>
      <DataTable columns={columns} data={tours} />
    </div>
  );
}
