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
 * Blog posts list table. Uses `<AdminDataTable>` with `title` search.
 */
export function DataTable<TData, TValue>({ columns, data }: DataTableProps<TData, TValue>) {
  return (
    <AdminDataTable
      columns={columns}
      data={data}
      searchColumn="title"
      searchPlaceholder="Search posts…"
      emptyTitle="No blog posts yet"
      emptyDescription="Publish stories, guides, and trip reports to drive organic traffic."
      emptyAction={
        <Button asChild size="sm" className="mt-2">
          <Link href="/admin/blog/new">
            <Plus className="mr-1.5 h-4 w-4" />
            Write your first post
          </Link>
        </Button>
      }
    />
  );
}
