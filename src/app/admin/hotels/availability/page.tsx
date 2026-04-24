import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  getHotelBookings,
  getHotels,
  getRoomInventory,
  getRoomTypesByHotelId,
  upsertRoomInventoryRange,
} from '@/lib/supabase/hotels';

function addDaysISO(dateIso: string, days: number) {
  const d = new Date(`${dateIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function isValidISODate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function buildDateRange(fromInclusive: string, toInclusive: string) {
  const out: string[] = [];
  const from = new Date(`${fromInclusive}T00:00:00Z`);
  const to = new Date(`${toInclusive}T00:00:00Z`);
  for (let d = new Date(from); d <= to; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export default async function AdminHotelAvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const defaultFrom = today;
  const defaultTo = addDaysISO(today, 30);

  const fromParam = typeof sp.from === 'string' ? sp.from : undefined;
  const toParam = typeof sp.to === 'string' ? sp.to : undefined;
  const from = fromParam && isValidISODate(fromParam) ? fromParam : defaultFrom;
  const to = toParam && isValidISODate(toParam) ? toParam : defaultTo;

  const hotels = await getHotels({ skipTranslation: true });
  const activeHotel = hotels[0] || null;
  const roomTypes = activeHotel
    ? await getRoomTypesByHotelId(activeHotel.id, { skipTranslation: true })
    : [];
  const roomTypeIdParam = typeof sp.roomTypeId === 'string' ? sp.roomTypeId : undefined;
  const selectedRoomTypeId =
    roomTypeIdParam && roomTypes.some((rt) => rt.id === roomTypeIdParam)
      ? roomTypeIdParam
      : roomTypes[0]?.id;

  const toExclusive = addDaysISO(to, 1);
  const [inventory, bookings] = await Promise.all([
    selectedRoomTypeId
      ? getRoomInventory({ roomTypeId: selectedRoomTypeId, from, to: toExclusive })
      : Promise.resolve([]),
    getHotelBookings(),
  ]);

  const selectedBookings = selectedRoomTypeId
    ? bookings.filter((b) => b.roomTypeId === selectedRoomTypeId && b.status !== 'cancelled')
    : [];

  const upcomingReservations = selectedBookings
    .filter((b) => b.checkIn >= today)
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn))
    .slice(0, 30);

  const inventoryByDate = new Map(inventory.map((row) => [row.date, row]));
  const days = isValidISODate(from) && isValidISODate(to) ? buildDateRange(from, to) : [];

  const setRange = async (formData: FormData) => {
    'use server';

    const roomTypeId = String(formData.get('roomTypeId') || '').trim();
    const rangeFrom = String(formData.get('from') || '').trim();
    const rangeTo = String(formData.get('to') || '').trim();
    const availableUnits = Number(formData.get('availableUnits') || 0);
    const pricePerNight = Number(formData.get('pricePerNight') || 0);
    const stopSell = formData.get('stopSell') === 'on';

    if (!roomTypeId) throw new Error('Room type is required.');
    if (!rangeFrom || !rangeTo) throw new Error('Date range is required.');

    await upsertRoomInventoryRange({
      roomTypeId,
      from: rangeFrom,
      to: rangeTo,
      availableUnits: Number.isFinite(availableUnits) ? availableUnits : 0,
      pricePerNight: Number.isFinite(pricePerNight) ? pricePerNight : 0,
      stopSell,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Availability &amp; Rates</h1>
          <p className="text-sm text-muted-foreground">
            Edit inventory and nightly pricing for your room types.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/hotels">Back</Link>
          </Button>
          <Button asChild>
            <Link href="/admin/hotels/rooms">Room Types</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/hotels/bookings">Bookings</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          {!activeHotel ? (
            <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span>This account has no hotel profile yet.</span>
                <Button asChild size="sm">
                  <Link href="/admin/hotels/setup">Create hotel profile</Link>
                </Button>
              </div>
            </div>
          ) : roomTypes.length === 0 ? (
            <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
              Add at least one room type first to manage availability.
            </div>
          ) : (
            <div className="space-y-6">
              <form
                method="GET"
                className="grid gap-4 rounded-lg border p-4 sm:grid-cols-4 sm:items-end"
              >
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="roomTypeId">Room Type</Label>
                  <select
                    id="roomTypeId"
                    name="roomTypeId"
                    defaultValue={selectedRoomTypeId}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  >
                    {roomTypes.map((rt) => (
                      <option key={rt.id} value={rt.id}>
                        {rt.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="from">From</Label>
                  <Input id="from" name="from" type="date" defaultValue={from} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="to">To</Label>
                  <Input id="to" name="to" type="date" defaultValue={to} />
                </div>
                <div className="sm:col-span-4 flex justify-end">
                  <Button type="submit" variant="outline">
                    Apply
                  </Button>
                </div>
              </form>

              {selectedRoomTypeId ? (
                <form
                  action={setRange}
                  className="grid gap-4 rounded-lg border p-4 sm:grid-cols-5 sm:items-end"
                >
                  <input type="hidden" name="roomTypeId" value={selectedRoomTypeId} />
                  <div className="grid gap-2">
                    <Label htmlFor="rangeFrom">From</Label>
                    <Input id="rangeFrom" name="from" type="date" defaultValue={from} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="rangeTo">To</Label>
                    <Input id="rangeTo" name="to" type="date" defaultValue={to} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="availableUnits">Units</Label>
                    <Input
                      id="availableUnits"
                      name="availableUnits"
                      type="number"
                      min={0}
                      defaultValue={0}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="pricePerNight">Price / night</Label>
                    <Input
                      id="pricePerNight"
                      name="pricePerNight"
                      type="number"
                      min={0}
                      step="0.01"
                      defaultValue={0}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input name="stopSell" type="checkbox" className="h-4 w-4" />
                      Stop sell
                    </label>
                    <Button type="submit">Save</Button>
                  </div>
                </form>
              ) : null}

              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Date</th>
                      <th className="px-3 py-2 text-left font-medium">Available</th>
                      <th className="px-3 py-2 text-left font-medium">Booked</th>
                      <th className="px-3 py-2 text-left font-medium">Price</th>
                      <th className="px-3 py-2 text-left font-medium">Stop sell</th>
                    </tr>
                  </thead>
                  <tbody>
                    {days.map((day) => {
                      const row = inventoryByDate.get(day);
                      const booked = selectedBookings.reduce((sum, b) => {
                        const inRange = b.checkIn <= day && day < b.checkOut;
                        return inRange ? sum + (b.units || 0) : sum;
                      }, 0);

                      return (
                        <tr key={day} className="border-t">
                          <td className="px-3 py-2">{day}</td>
                          <td className="px-3 py-2">{row?.availableUnits ?? 0}</td>
                          <td className="px-3 py-2">{booked}</td>
                          <td className="px-3 py-2">
                            {row?.pricePerNight != null
                              ? Number(row.pricePerNight).toFixed(2)
                              : '—'}
                          </td>
                          <td className="px-3 py-2">{row?.stopSell ? 'Yes' : 'No'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Reservations</CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedRoomTypeId ? (
            <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
              Select a room type to see reservations.
            </div>
          ) : upcomingReservations.length === 0 ? (
            <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
              No upcoming reservations for the selected room type.
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingReservations.map((b) => (
                <div key={b.id} className="rounded-lg border p-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-medium">{b.guestName || b.guestEmail || 'Guest'}</p>
                    <p className="text-sm text-muted-foreground">{b.status}</p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {b.checkIn} → {b.checkOut} · {b.units} room(s) · {b.guestsAdults} adult(s)
                    {b.guestsChildren ? `, ${b.guestsChildren} child(ren)` : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
