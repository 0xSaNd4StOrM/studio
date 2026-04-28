'use client';

import * as React from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ChevronDown, X, Inbox, Ban } from 'lucide-react';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';

type StatusFilter = 'all' | 'Pending' | 'Confirmed' | 'Cancelled';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onBulkCancel?: (ids: string[]) => Promise<void> | void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onBulkCancel,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();

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
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    meta: {
      // This is where you would pass your update functions if needed,
      // but for this implementation we pass them directly to columns.
    },
  });

  React.useEffect(() => {
    table.getColumn('bookingDate')?.setFilterValue(dateRange);
  }, [dateRange, table]);

  const isFiltered = table.getState().columnFilters.length > 0;

  const resetFilters = () => {
    table.resetColumnFilters();
    setDateRange(undefined);
  };

  const statusFilterValue = (table.getColumn('status')?.getFilterValue() as string) ?? 'all';
  const statusCounts = React.useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      all: data.length,
      Pending: 0,
      Confirmed: 0,
      Cancelled: 0,
    };
    for (const row of data) {
      const status = (row as { status?: string }).status;
      if (status === 'Pending' || status === 'Confirmed' || status === 'Cancelled') {
        counts[status]++;
      }
    }
    return counts;
  }, [data]);

  const setStatus = (value: StatusFilter) => {
    table.getColumn('status')?.setFilterValue(value === 'all' ? undefined : value);
  };

  const statusChips: { label: string; value: StatusFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Pending', value: 'Pending' },
    { label: 'Confirmed', value: 'Confirmed' },
    { label: 'Cancelled', value: 'Cancelled' },
  ];

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedCount = selectedRows.length;
  const selectedIds = selectedRows
    .map((r) => (r.original as { id?: string }).id)
    .filter((id): id is string => typeof id === 'string');
  const [bulkCancelOpen, setBulkCancelOpen] = React.useState(false);
  const [bulkCancelLoading, setBulkCancelLoading] = React.useState(false);

  const handleBulkCancelConfirm = async () => {
    if (!onBulkCancel || selectedIds.length === 0) return;
    setBulkCancelLoading(true);
    try {
      await onBulkCancel(selectedIds);
      table.resetRowSelection();
      setBulkCancelOpen(false);
    } finally {
      setBulkCancelLoading(false);
    }
  };

  return (
    <div className="rounded-md border">
      <div className="flex flex-wrap items-center gap-2 border-b p-4">
        {statusChips.map((chip) => {
          const active = statusFilterValue === chip.value;
          return (
            <Button
              key={chip.value}
              type="button"
              size="sm"
              variant={active ? 'default' : 'outline'}
              onClick={() => setStatus(chip.value)}
              className="h-8 rounded-full"
            >
              {chip.label}
              <Badge
                variant="secondary"
                className={cn(
                  'ml-2 h-5 px-1.5 font-mono text-[10px]',
                  active && 'bg-primary-foreground/20 text-primary-foreground'
                )}
              >
                {statusCounts[chip.value]}
              </Badge>
            </Button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <Input
          placeholder="Filter by customer name..."
          value={(table.getColumn('customerName')?.getFilterValue() as string) ?? ''}
          onChange={(event) => table.getColumn('customerName')?.setFilterValue(event.target.value)}
          className="w-full sm:max-w-xs"
        />

        <DateRangePicker date={dateRange} setDate={setDateRange} className="w-full sm:w-auto" />

        {isFiltered && (
          <Button variant="ghost" onClick={resetFilters} className="h-8 px-2 lg:px-3">
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-between sm:ml-auto sm:w-auto">
              Columns <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {selectedCount > 0 && (
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-y bg-muted/70 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-muted/50">
          <span className="text-sm font-medium">
            {selectedCount} selected
          </span>
          <div className="ml-auto flex items-center gap-2">
            <AlertDialog open={bulkCancelOpen} onOpenChange={setBulkCancelOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={!onBulkCancel || selectedIds.length === 0}
                >
                  <Ban className="mr-2 h-4 w-4" />
                  Cancel selected
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel {selectedCount} bookings?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will mark every selected booking as Cancelled. You can re-confirm them
                    individually afterwards if needed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={bulkCancelLoading}>Keep them</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      void handleBulkCancelConfirm();
                    }}
                    disabled={bulkCancelLoading}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    {bulkCancelLoading ? 'Cancelling…' : 'Cancel selected'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
      <Table className="min-w-[900px]">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => {
              const isDuplicate = Boolean(
                (row.original as { _duplicateGroupId?: string })._duplicateGroupId
              );
              return (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className={cn(
                    isDuplicate && 'bg-amber-50/40 hover:bg-amber-50/60 dark:bg-amber-950/20'
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-48">
                <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Inbox className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">No bookings match these filters</p>
                    <p className="text-xs text-muted-foreground">
                      Try a different status, date range, or search term.
                    </p>
                  </div>
                  {isFiltered && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetFilters}
                      className="mt-1"
                    >
                      Reset filters
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-end">
        <div className="text-sm text-muted-foreground sm:flex-1">
          {table.getFilteredSelectedRowModel().rows.length} of{' '}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="flex w-full gap-2 sm:w-auto sm:justify-end">
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
    </div>
  );
}
