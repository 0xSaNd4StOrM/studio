'use client';

import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { MapPin, Plus, X } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AdminDataTable } from '@/components/admin/admin-data-table';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

/**
 * Tours list table. Uses `<AdminDataTable>` with a `name` search and an
 * additional destination filter + Reset action in the toolbar's left slot.
 */
export function DataTable<TData, TValue>({ columns, data }: DataTableProps<TData, TValue>) {
  return (
    <AdminDataTable
      columns={columns}
      data={data}
      searchColumn="name"
      searchPlaceholder="Search tours…"
      toolbarLeft={(table) => {
        const destinationValue =
          (table.getColumn('destination')?.getFilterValue() as string) ?? '';
        const hasFilters = table.getState().columnFilters.length > 0;
        return (
          <>
            <div className="relative w-full sm:w-64">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter destination…"
                value={destinationValue}
                onChange={(event) =>
                  table.getColumn('destination')?.setFilterValue(event.target.value)
                }
                className="h-9 pl-9"
              />
            </div>
            {hasFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => table.resetColumnFilters()}
                className="h-9"
              >
                Reset
                <X className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            )}
          </>
        );
      }}
      emptyTitle="No tours yet"
      emptyDescription="Create your first tour to start taking bookings."
      emptyAction={
        <Button asChild size="sm" className="mt-2">
          <Link href="/admin/tours/new">
            <Plus className="mr-1.5 h-4 w-4" />
            Create your first tour
          </Link>
        </Button>
      }
    />
  );
}
