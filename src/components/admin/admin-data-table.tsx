'use client';

import * as React from 'react';
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type Table as ReactTableInstance,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ChevronDown, Inbox, Search, X } from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface AdminDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  /** Column id to filter when the global search input changes. */
  searchColumn?: string;
  /** Placeholder shown in the search input. */
  searchPlaceholder?: string;
  /** Show the column-visibility toggle. Default true. */
  enableColumnVisibility?: boolean;
  /** Show pagination controls. Default true. */
  enablePagination?: boolean;
  /** Minimum table width before horizontal scroll kicks in. Default 900. */
  minWidth?: number;
  /** Optional empty-state title. */
  emptyTitle?: string;
  /** Optional empty-state description. */
  emptyDescription?: string;
  /** Optional empty-state CTA (e.g. "Create your first tour"). */
  emptyAction?: React.ReactNode;
  /** Render extra controls on the left of the toolbar (e.g. status chips). */
  toolbarLeft?: (table: ReactTableInstance<TData>) => React.ReactNode;
  /** Render extra controls on the right of the toolbar (e.g. export button). */
  toolbarRight?: (table: ReactTableInstance<TData>) => React.ReactNode;
  /** Render a bulk-action toolbar when rows are selected. Returns null to skip. */
  bulkActions?: (
    selectedRows: TData[],
    clearSelection: () => void
  ) => React.ReactNode;
  /** Optional CSS class for the outer container. */
  className?: string;
}

/**
 * AdminDataTable — single primitive for every list view in the admin
 * panel. Wraps TanStack Table with a consistent visual treatment:
 *
 *   - Standard toolbar (left: search + extras; right: column toggles +
 *     extras)
 *   - Branded empty state with optional CTA
 *   - Selection-aware bulk-action sticky bar
 *   - Pagination footer with row counter + prev/next
 *
 * The complex bookings table keeps its bespoke variant — everything else
 * (customers, tours, promotions, upsell-items, blog, hotels lists)
 * should compose from here.
 */
export function AdminDataTable<TData, TValue>({
  columns,
  data,
  searchColumn,
  searchPlaceholder = 'Search…',
  enableColumnVisibility = true,
  enablePagination = true,
  minWidth = 900,
  emptyTitle = 'No results',
  emptyDescription = 'Try adjusting your filters or check back later.',
  emptyAction,
  toolbarLeft,
  toolbarRight,
  bulkActions,
  className,
}: AdminDataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: { sorting, columnFilters, columnVisibility, rowSelection },
  });

  const searchValue = (
    searchColumn ? (table.getColumn(searchColumn)?.getFilterValue() as string) ?? '' : ''
  );

  const selectedRows = table.getFilteredSelectedRowModel().rows.map((r) => r.original);
  const selectedCount = selectedRows.length;
  const totalRows = table.getFilteredRowModel().rows.length;

  return (
    <div className={cn('rounded-2xl border bg-card', className)}>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {searchColumn && (
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) =>
                  table.getColumn(searchColumn)?.setFilterValue(e.target.value)
                }
                className="h-9 pl-9"
              />
              {searchValue && (
                <button
                  type="button"
                  onClick={() => table.getColumn(searchColumn)?.setFilterValue('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
          {toolbarLeft?.(table)}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          {toolbarRight?.(table)}
          {enableColumnVisibility && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  Columns <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Bulk action bar — sticky when any rows are selected */}
      {bulkActions && selectedCount > 0 && (
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-y bg-muted/70 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-muted/50">
          <span className="text-sm font-medium">{selectedCount} selected</span>
          <div className="ml-auto flex items-center gap-2">
            {bulkActions(selectedRows, () => table.resetRowSelection())}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => table.resetRowSelection()}
            >
              Clear selection
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <Table style={{ minWidth: `${minWidth}px` }}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-40 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 py-4 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                      <Inbox className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">{emptyTitle}</p>
                    <p className="text-xs text-muted-foreground max-w-sm">
                      {emptyDescription}
                    </p>
                    {emptyAction}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {enablePagination && (
        <div className="flex flex-col gap-3 border-t p-4 sm:flex-row sm:items-center">
          <div className="text-xs text-muted-foreground sm:flex-1">
            {bulkActions && selectedCount > 0
              ? `${selectedCount} of ${totalRows} row(s) selected`
              : `${totalRows} row${totalRows === 1 ? '' : 's'}`}
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <span className="text-xs text-muted-foreground">
              Page {table.getState().pagination.pageIndex + 1} of{' '}
              {Math.max(1, table.getPageCount())}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="flex-1 sm:flex-none"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="flex-1 sm:flex-none"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
