'use client';

import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Input } from '@/components/ui/input';
import { AdminDataTable } from '@/components/admin/admin-data-table';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

/**
 * Customers list table. Uses `<AdminDataTable>` with the standard `name`
 * search and an additional email filter rendered into the toolbar's
 * left slot — matches the original two-input UX.
 */
export function DataTable<TData, TValue>({ columns, data }: DataTableProps<TData, TValue>) {
  return (
    <AdminDataTable
      columns={columns}
      data={data}
      searchColumn="name"
      searchPlaceholder="Search by name…"
      toolbarLeft={(table) => (
        <Input
          placeholder="Filter by email…"
          value={(table.getColumn('email')?.getFilterValue() as string) ?? ''}
          onChange={(event) =>
            table.getColumn('email')?.setFilterValue(event.target.value)
          }
          className="h-9 w-full sm:w-64"
        />
      )}
      emptyTitle="No customers yet"
      emptyDescription="Customers appear here automatically after their first booking or contact-form submission."
    />
  );
}
