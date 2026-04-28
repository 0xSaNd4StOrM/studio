'use client';

import { useMemo, useState } from 'react';
import type { Booking } from '@/types';
import { columns } from './columns';
import { DataTable } from './data-table';
import { updateBookingStatus, deleteBooking } from '@/lib/supabase/bookings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Clock, CheckCircle, Download, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type BookingRow = Booking & { _duplicateGroupId?: string };

interface BookingsClientProps {
  initialBookings: Booking[];
}

const DUPLICATE_WINDOW_MS = 30 * 60 * 1000;

function computeDuplicateGroups(bookings: Booking[]): Map<string, string> {
  // Bucket by (email + primary tour id + item date), sort each bucket by bookingDate,
  // then mark as duplicates any rows within 30 min of an active neighbor.
  const buckets = new Map<string, { id: string; ts: number }[]>();

  for (const b of bookings) {
    if (b.status === 'Cancelled') continue;
    const primary = b.bookingItems?.[0];
    const tourId = primary?.tourId;
    const itemDate = primary?.itemDate;
    const email = b.customerEmail?.toLowerCase().trim();
    if (!email || !tourId || !itemDate) continue;

    const ts = new Date(b.bookingDate).getTime();
    if (Number.isNaN(ts)) continue;

    const key = `${email}|${tourId}|${itemDate}`;
    const arr = buckets.get(key) ?? [];
    arr.push({ id: b.id, ts });
    buckets.set(key, arr);
  }

  const map = new Map<string, string>();
  for (const [key, rowList] of buckets) {
    if (rowList.length < 2) continue;
    rowList.sort((a, b) => a.ts - b.ts);

    let groupIdx = 0;
    let currentGroup: { id: string; ts: number }[] = [rowList[0]];
    const flushGroup = () => {
      if (currentGroup.length >= 2) {
        const groupId = `${key}#${groupIdx++}`;
        for (const r of currentGroup) map.set(r.id, groupId);
      }
    };

    for (let i = 1; i < rowList.length; i++) {
      const prev = currentGroup[currentGroup.length - 1];
      if (rowList[i].ts - prev.ts <= DUPLICATE_WINDOW_MS) {
        currentGroup.push(rowList[i]);
      } else {
        flushGroup();
        currentGroup = [rowList[i]];
      }
    }
    flushGroup();
  }

  return map;
}

export function BookingsClient({ initialBookings }: BookingsClientProps) {
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);

  const handleUpdateStatus = async (bookingId: string, status: Booking['status']) => {
    await updateBookingStatus(bookingId, status);
    setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status } : b)));
  };

  const handleDeleteBooking = async (bookingId: string) => {
    await deleteBooking(bookingId);
    setBookings((prev) => prev.filter((b) => b.id !== bookingId));
  };

  const handleBulkCancel = async (ids: string[]) => {
    await Promise.all(ids.map((id) => updateBookingStatus(id, 'Cancelled')));
    setBookings((prev) =>
      prev.map((b) => (ids.includes(b.id) ? { ...b, status: 'Cancelled' } : b))
    );
  };

  const duplicateGroups = useMemo(() => computeDuplicateGroups(bookings), [bookings]);

  const rows: BookingRow[] = useMemo(
    () =>
      bookings.map((b) => {
        const gid = duplicateGroups.get(b.id);
        return gid ? { ...b, _duplicateGroupId: gid } : b;
      }),
    [bookings, duplicateGroups]
  );

  const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalPrice ?? 0), 0);
  const pendingBookings = bookings.filter((b) => b.status === 'Pending').length;
  const confirmedBookings = bookings.filter((b) => b.status === 'Confirmed').length;
  const duplicateCount = duplicateGroups.size;

  const handleExport = () => {
    // Escape a value for CSV: wrap in quotes if it contains commas, quotes, or newlines
    const esc = (val: string | number | undefined | null): string => {
      if (val === undefined || val === null) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = [
      'Booking ID',
      'Customer Name',
      'Email',
      'Phone',
      'Nationality',
      'Booking Date',
      'Status',
      'Payment Method',
      'Items',
      'Total Price (USD)',
    ];

    const csvRows = bookings.map((b) => {
      const itemNames = (b.bookingItems || [])
        .map((item) => item.tours?.name ?? item.upsellItems?.name ?? 'Item')
        .join(' | ');

      return [
        esc(b.id),
        esc(b.customerName),
        esc(b.customerEmail),
        esc(b.phoneNumber),
        esc(b.nationality),
        esc(new Date(b.bookingDate).toLocaleDateString('en-GB')),
        esc(b.status),
        esc(b.paymentMethod),
        esc(itemNames),
        esc(b.totalPrice),
      ].join(',');
    });

    // BOM prefix (\uFEFF) ensures Excel and Arabic Windows open the file correctly
    const csvContent = '\uFEFF' + [headers.join(','), ...csvRows].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `bookings-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">From {bookings.length} bookings</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingBookings}</div>
            <p className="text-xs text-muted-foreground">Awaiting confirmation</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{confirmedBookings}</div>
            <p className="text-xs text-muted-foreground">Ready for departure</p>
          </CardContent>
        </Card>
        <Card
          className={
            duplicateCount > 0
              ? 'border-amber-300 bg-amber-50/40 dark:border-amber-900/60 dark:bg-amber-950/20'
              : ''
          }
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Possible Duplicates</CardTitle>
            <Copy
              className={
                duplicateCount > 0
                  ? 'h-4 w-4 text-amber-600 dark:text-amber-400'
                  : 'h-4 w-4 text-muted-foreground'
              }
            />
          </CardHeader>
          <CardContent>
            <div
              className={
                duplicateCount > 0
                  ? 'text-2xl font-bold text-amber-700 dark:text-amber-300'
                  : 'text-2xl font-bold'
              }
            >
              {duplicateCount}
            </div>
            <p className="text-xs text-muted-foreground">
              {duplicateCount > 0 ? 'Review before confirming' : 'No duplicates detected'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export to CSV
        </Button>
      </div>

      <DataTable
        columns={columns({
          onUpdateStatus: handleUpdateStatus,
          onDelete: handleDeleteBooking,
        })}
        data={rows}
        onBulkCancel={handleBulkCancel}
      />
    </div>
  );
}
