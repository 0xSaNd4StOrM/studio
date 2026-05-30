'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  RefreshCw,
  Link2,
  Trash2,
  Copy,
  Check,
  Download,
  Upload,
  Loader2,
} from 'lucide-react';
import {
  addFeedAction,
  deleteFeedAction,
  createExportTokenAction,
  syncNowAction,
} from './actions';

type FeedView = {
  id: string;
  roomTypeId: string;
  roomTypeName: string | null;
  url: string;
  label: string | null;
  exportToken: string;
  isActive: boolean;
  lastSyncedAt: string | null;
  lastStatus: string | null;
  lastEventCount: number | null;
};

export function ChannelsClient({
  baseUrl,
  rooms,
  feeds,
}: {
  baseUrl: string;
  rooms: Array<{ id: string; name: string }>;
  feeds: FeedView[];
}) {
  const { toast } = useToast();
  const [isSyncing, startSync] = useTransition();
  const [copied, setCopied] = useState<string | null>(null);

  const importFeeds = feeds.filter((f) => f.url && /^https?:\/\//i.test(f.url));
  // Export token per room type (first feed row carrying that room's token).
  const exportTokenByRoom = new Map<string, string>();
  for (const f of feeds) {
    if (!exportTokenByRoom.has(f.roomTypeId)) exportTokenByRoom.set(f.roomTypeId, f.exportToken);
  }

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    } catch {
      toast({ variant: 'destructive', title: 'Could not copy', description: text });
    }
  };

  const handleSync = () => {
    startSync(async () => {
      try {
        const res = await syncNowAction();
        toast({
          title: res.ok ? 'Sync complete' : 'Sync finished with errors',
          description: res.message,
          variant: res.ok ? undefined : 'destructive',
        });
      } catch (err) {
        toast({
          variant: 'destructive',
          title: 'Sync failed',
          description: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Channel Sync</h1>
          <p className="text-sm text-muted-foreground">
            Connect Booking.com, Airbnb &amp; others via iCal to prevent double-bookings.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/hotels">Back</Link>
          </Button>
          <Button onClick={handleSync} disabled={isSyncing}>
            {isSyncing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Sync now
          </Button>
        </div>
      </div>

      {/* IMPORT */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="h-4 w-4 text-primary" /> Import feeds (block your inventory)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Paste the iCal export URL from Booking.com / Airbnb for each room type. We&apos;ll pull
            it on a schedule (and when you press <strong>Sync now</strong>) and block those dates so
            they can&apos;t be booked again here.
          </p>

          <form
            action={addFeedAction}
            className="grid gap-3 rounded-lg border p-4 sm:grid-cols-12 sm:items-end"
          >
            <div className="grid gap-1.5 sm:col-span-3">
              <Label htmlFor="roomTypeId">Room type</Label>
              <select
                id="roomTypeId"
                name="roomTypeId"
                defaultValue={rooms[0]?.id}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5 sm:col-span-5">
              <Label htmlFor="url">iCal URL</Label>
              <Input id="url" name="url" type="url" placeholder="https://ical.booking.com/..." />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="label">Label</Label>
              <Input id="label" name="label" placeholder="Booking.com" />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" className="w-full">
                <Link2 className="mr-2 h-4 w-4" /> Add
              </Button>
            </div>
          </form>

          {importFeeds.length === 0 ? (
            <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
              No import feeds yet.
            </div>
          ) : (
            <div className="space-y-2">
              {importFeeds.map((f) => (
                <div
                  key={f.id}
                  className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">
                        {f.roomTypeName ?? 'Room'} {f.label ? `· ${f.label}` : ''}
                      </p>
                      {f.lastStatus ? (
                        <Badge
                          variant={f.lastStatus.startsWith('OK') ? 'secondary' : 'destructive'}
                          className="shrink-0 text-[10px]"
                        >
                          {f.lastStatus}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="shrink-0 text-[10px]">
                          Never synced
                        </Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{f.url}</p>
                    {f.lastSyncedAt && (
                      <p className="text-xs text-muted-foreground">
                        Last sync: {new Date(f.lastSyncedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <form action={deleteFeedAction}>
                    <input type="hidden" name="feedId" value={f.id} />
                    <Button type="submit" variant="ghost" size="sm" className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* EXPORT */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Download className="h-4 w-4 text-primary" /> Export feeds (publish your availability)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Give these links to Booking.com / Airbnb so they block the dates you sell directly.
            Each link is per room type and exposes only booked date ranges (no guest details).
          </p>

          <div className="space-y-2">
            {rooms.map((r) => {
              const token = exportTokenByRoom.get(r.id);
              const url = token ? `${baseUrl}/api/ical/export/${token}` : null;
              return (
                <div
                  key={r.id}
                  className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.name}</p>
                    {url ? (
                      <p className="truncate font-mono text-xs text-muted-foreground">{url}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">No export link yet.</p>
                    )}
                  </div>
                  {url ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={() => copy(url, r.id)}
                    >
                      {copied === r.id ? (
                        <>
                          <Check className="mr-1.5 h-3.5 w-3.5" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy link
                        </>
                      )}
                    </Button>
                  ) : (
                    <form action={createExportTokenAction}>
                      <input type="hidden" name="roomTypeId" value={r.id} />
                      <Button type="submit" variant="outline" size="sm" className="shrink-0">
                        <Link2 className="mr-1.5 h-3.5 w-3.5" /> Create link
                      </Button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
