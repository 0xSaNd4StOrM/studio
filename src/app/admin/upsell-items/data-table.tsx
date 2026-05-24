'use client';

import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { AdminDataTable } from '@/components/admin/admin-data-table';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

/**
 * Upsell items list table. Delegates to the unified `<AdminDataTable>`.
 *
 * Filter column is `name` — the column defs already declare an
 * accessorKey of `name` with case-insensitive matching.
 */
export function DataTable<TData, TValue>({ columns, data }: DataTableProps<TData, TValue>) {
  return (
    <AdminDataTable
      columns={columns}
      data={data}
      searchColumn="name"
      searchPlaceholder="Search upsell items…"
      emptyTitle="No upsell items yet"
      emptyDescription="Create cross-sell extras (transfers, dinners, photo packages) that appear at checkout."
      emptyAction={
        <Button asChild size="sm" className="mt-2">
          <Link href="/admin/upsell-items/new">
            <Plus className="mr-1.5 h-4 w-4" />
            New upsell item
          </Link>
        </Button>
      }
    />
  );
}
