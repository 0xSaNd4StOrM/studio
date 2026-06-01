import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  getFrontDeskBoard,
  getRoomTypesByHotelId,
  getHotels,
  setRoomTypeStopSell,
} from '@/lib/supabase/hotels';
import {
  LogIn,
  LogOut,
  BedDouble,
  CalendarClock,
  Sparkles,
  Ban,
  Users,
} from 'lucide-react';
import type { AdminHotelBooking } from '@/types';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

function fmtDate(iso: string): string {
  try {
    return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return iso;
  }
}

function nights(checkIn: string, checkOut: string): number {
  const a = new Date(`${checkIn}T00:00:00Z`).getTime();
  const b = new Date(`${checkOut}T00:00:00Z`).getTime();
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

function BookingRow({ b, kind }: { b: AdminHotelBooking; kind: 'arrival' | 'departure' | 'stay' }) {
  const outstandingBalance = kind === 'arrival' && (b.balanceDue ?? 0) > 0 ? Number(b.balanceDue) : 0;
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{b.guestName || b.guestEmail || 'Guest'}</p>
        <p className="truncate text-xs text-muted-foreground">
          {b.roomTypeName || 'Room'} · {b.units} room{b.units === 1 ? '' : 's'} ·{' '}
          {b.guestsAdults} adult{b.guestsAdults === 1 ? '' : 's'}
          {b.guestsChildren ? `, ${b.guestsChildren} child${b.guestsChildren === 1 ? '' : 'ren'}` : ''}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {fmtDate(b.checkIn)} → {fmtDate(b.checkOut)} · {nights(b.checkIn, b.checkOut)} night
          {nights(b.checkIn, b.checkOut) === 1 ? '' : 's'}
        </p>
        {outstandingBalance > 0 && (
          <p className="text-xs font-medium text-destructive mt-0.5">
            Collect ${outstandingBalance.toFixed(2)} on arrival
          </p>
        )}
      </div>
      <Badge
        variant={
          b.status === 'cancelled'
            ? 'destructive'
            : b.status === 'paid'
              ? 'default'
              : 'secondary'
        }
        className="shrink-0 capitalize"
      >
        {kind === 'arrival' ? 'Arriving' : kind === 'departure' ? 'Departing' : b.status}
      </Badge>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">{text}</div>
  );
}

export default async function FrontDeskOpsPage() {
  const [board, hotels] = await Promise.all([
    getFrontDeskBoard(),
    getHotels({ skipTranslation: true }),
  ]);
  const activeHotel = hotels[0] ?? null;
  const roomTypes = activeHotel
    ? await getRoomTypesByHotelId(activeHotel.id, { skipTranslation: true })
    : [];

  const stopSellAction = async (formData: FormData) => {
    'use server';
    const roomTypeId = String(formData.get('roomTypeId') || '').trim();
    const from = String(formData.get('from') || '').trim();
    const to = String(formData.get('to') || '').trim();
    const stopSell = String(formData.get('stopSell') || 'true') === 'true';
    if (!roomTypeId || !from || !to) return;
    await setRoomTypeStopSell({ roomTypeId, from, to, stopSell });
    revalidatePath('/admin/hotels/ops');
  };

  const todayLabel = fmtDate(board.today);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Front Desk</h1>
          <p className="text-sm text-muted-foreground">
            Today&apos;s operations · {todayLabel}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/hotels">Back</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/hotels/bookings">All Bookings</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/hotels/availability">Availability</Link>
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="rounded-lg shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Arrivals today</CardTitle>
            <LogIn className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{board.arrivals.length}</div>
            <p className="text-xs text-muted-foreground">Check-ins expected</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Departures today</CardTitle>
            <LogOut className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{board.departures.length}</div>
            <p className="text-xs text-muted-foreground">Check-outs expected</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In-house tonight</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{board.inHouse.length}</div>
            <p className="text-xs text-muted-foreground">Active stays</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupancy</CardTitle>
            <BedDouble className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{board.occupancy.occupancyPct}%</div>
            <p className="text-xs text-muted-foreground">
              {board.occupancy.occupiedUnits}/{board.occupancy.totalUnits} units tonight
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Arrivals / Departures */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LogIn className="h-4 w-4 text-primary" /> Arrivals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {board.arrivals.length === 0 ? (
              <EmptyState text="No arrivals scheduled for today." />
            ) : (
              board.arrivals.map((b) => <BookingRow key={b.id} b={b} kind="arrival" />)
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LogOut className="h-4 w-4 text-primary" /> Departures
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {board.departures.length === 0 ? (
              <EmptyState text="No departures scheduled for today." />
            ) : (
              board.departures.map((b) => <BookingRow key={b.id} b={b} kind="departure" />)
            )}
          </CardContent>
        </Card>
      </div>

      {/* Housekeeping / turnover */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" /> Housekeeping — Turnover Today
          </CardTitle>
        </CardHeader>
        <CardContent>
          {board.turnover.length === 0 ? (
            <EmptyState text="No rooms need turnover today." />
          ) : (
            <div className="space-y-2">
              {board.turnover.map((t) => (
                <div
                  key={t.bookingId}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{t.roomTypeName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {t.guestName || 'Guest'} checking out · {t.units} room
                      {t.units === 1 ? '' : 's'} to clean
                    </p>
                  </div>
                  {t.sameDayArrival ? (
                    <Badge variant="destructive" className="shrink-0">
                      Same-day arrival
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="shrink-0">
                      Standard
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Occupancy per room */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Occupancy by Room Type</CardTitle>
        </CardHeader>
        <CardContent>
          {board.occupancy.perRoom.length === 0 ? (
            <EmptyState text="No active room types." />
          ) : (
            <div className="space-y-3">
              {board.occupancy.perRoom.map((r) => {
                const pct =
                  r.totalUnits > 0 ? Math.round((r.occupiedUnits / r.totalUnits) * 100) : 0;
                return (
                  <div key={r.roomTypeId} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate font-medium">{r.roomTypeName}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {r.occupiedUnits}/{r.totalUnits} · {pct}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming 7 days */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="h-4 w-4 text-primary" /> Next 7 Days
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {board.upcoming.length === 0 ? (
            <EmptyState text="No arrivals in the next 7 days." />
          ) : (
            board.upcoming.map((b) => <BookingRow key={b.id} b={b} kind="stay" />)
          )}
        </CardContent>
      </Card>

      {/* One-click stop-sell */}
      {roomTypes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Ban className="h-4 w-4 text-destructive" /> Quick Stop-Sell
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              Instantly block a room type from being booked across a date range (e.g. for
              maintenance). Clear it again by setting status back to “Re-open”.
            </p>
            <form
              action={stopSellAction}
              className="grid gap-3 rounded-lg border p-4 sm:grid-cols-5 sm:items-end"
            >
              <div className="grid gap-1.5 sm:col-span-2">
                <label htmlFor="roomTypeId" className="text-sm font-medium">
                  Room type
                </label>
                <select
                  id="roomTypeId"
                  name="roomTypeId"
                  defaultValue={roomTypes[0]?.id}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                >
                  {roomTypes.map((rt) => (
                    <option key={rt.id} value={rt.id}>
                      {rt.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="from" className="text-sm font-medium">
                  From
                </label>
                <input
                  id="from"
                  name="from"
                  type="date"
                  defaultValue={board.today}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                />
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="to" className="text-sm font-medium">
                  To
                </label>
                <input
                  id="to"
                  name="to"
                  type="date"
                  defaultValue={board.today}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  name="stopSell"
                  value="true"
                  variant="destructive"
                  className="flex-1"
                >
                  Block
                </Button>
                <Button type="submit" name="stopSell" value="false" variant="outline">
                  Re-open
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
