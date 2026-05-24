'use client';

import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { AdminDataTable } from '@/components/admin/admin-data-table';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

/**
 * Promotions list table. Uses `<AdminDataTable>` with a `code` search
 * and a "Create promo code" CTA on the right.
 */
export function DataTable<TData, TValue>({ columns, data }: DataTableProps<TData, TValue>) {
  return (
    <AdminDataTable
      columns={columns}
      data={data}
      searchColumn="code"
      searchPlaceholder="Search promo codes…"
      toolbarRight={() => (
        <Button asChild size="sm" className="h-9">
          <Link href="/admin/promotions/new">
            <Plus className="mr-1.5 h-4 w-4" /> New code
          </Link>
        </Button>
      )}
      emptyTitle="No promo codes yet"
      emptyDescription="Create promo codes to offer discounts on bookings — percentage or fixed amount."
      emptyAction={
        <Button asChild size="sm" className="mt-2">
          <Link href="/admin/promotions/new">
            <Plus className="mr-1.5 h-4 w-4" />
            Create promo code
          </Link>
        </Button>
      }
    />
  );
}
