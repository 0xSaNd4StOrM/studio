'use client';

import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { Post } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, ArrowUpDown, Clock } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export const columns: ColumnDef<Post>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'title',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Title
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const post = row.original;
      // "Recently edited" pin: post was updated in the last 3 days.
      // Falls back to createdAt-based check if updatedAt is missing.
      const recencySource = post.updatedAt ?? post.createdAt;
      const editedRecently =
        recencySource &&
        Date.now() - new Date(recencySource).getTime() < 3 * 24 * 60 * 60 * 1000;
      return (
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/blog/${post.slug}/edit`}
            className="font-medium text-primary hover:underline"
          >
            {row.getValue('title')}
          </Link>
          {editedRecently && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-900 dark:bg-amber-950/50 dark:text-amber-200"
              title={`Last edited ${new Date(recencySource).toLocaleString()}`}
            >
              <Clock className="h-2.5 w-2.5" />
              Recently edited
            </span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'author',
    header: 'Author',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      return (
        <Badge
          variant={status === 'Published' ? 'default' : 'secondary'}
          className={cn(
            status === 'Published' && 'bg-green-100 text-green-800',
            status === 'Draft' && 'bg-gray-100 text-gray-800'
          )}
        >
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Created At',
    cell: ({ row }) => {
      const date = new Date(row.getValue('createdAt'));
      return format(date, 'PPP');
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const post = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href={`/admin/blog/${post.slug}/edit`}>Edit Post</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/blog/${post.slug}`} target="_blank">
                View Post (Live)
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">
              Delete Post
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
