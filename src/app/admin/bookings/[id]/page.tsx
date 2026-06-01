import { getBookingById } from '@/lib/supabase/bookings';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Mail,
  User,
  Users,
  Tag,
  Phone,
  Globe,
  Download,
} from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { BookingStatusActions } from '@/components/admin/booking-status-actions';
import { BookingExportCsvButton } from '@/components/admin/booking-export-csv-button';

interface BookingDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function BookingDetailsPage({ params }: BookingDetailsPageProps) {
  const { id } = await params;
  const booking = await getBookingById(id);

  if (!booking) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/admin/bookings">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to bookings</span>
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Booking Details</h2>
          <p className="text-muted-foreground">Details for booking ID: {booking.id}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-primary" />
              <p className="text-lg font-medium">{booking.customerName}</p>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-primary" />
              <p className="text-muted-foreground">{booking.customerEmail}</p>
            </div>
            {booking.phoneNumber && (
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-primary" />
                <p className="text-muted-foreground">{booking.phoneNumber}</p>
              </div>
            )}
            {booking.nationality && (
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-primary" />
                <p className="text-muted-foreground">{booking.nationality}</p>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary" />
              <p className="text-muted-foreground">
                Booked on: {format(new Date(booking.bookingDate), 'PPP')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Tag className="h-5 w-5 text-primary" />
              <Badge
                variant={
                  booking.status === 'Confirmed'
                    ? 'default'
                    : booking.status === 'Pending'
                      ? 'secondary'
                      : 'destructive'
                }
                className={cn(
                  booking.status === 'Confirmed' && 'bg-green-100 text-green-800',
                  booking.status === 'Pending' && 'bg-yellow-100 text-yellow-800',
                  booking.status === 'Cancelled' && 'bg-red-100 text-red-800'
                )}
              >
                {booking.status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Booking Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total Price:</span>
              <span className="text-xl font-bold text-primary">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                }).format(booking.totalPrice)}
              </span>
            </div>
            {(booking.amountPaid !== undefined || booking.balanceDue !== undefined) && (
              <div className="space-y-1 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Paid:</span>
                  <span>${(booking.amountPaid ?? 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Balance due:</span>
                  <span className={(booking.balanceDue ?? 0) > 0 ? 'font-semibold text-destructive' : ''}>
                    ${(booking.balanceDue ?? 0).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
            {(booking.balanceDue ?? 0) > 0 ? (
              <form
                action={async () => {
                  'use server';
                  const { markBalancePaidAction } = await import('./mark-balance-paid-action');
                  await markBalancePaidAction(booking.id);
                }}
              >
                <button
                  type="submit"
                  className="mt-2 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
                >
                  Mark balance paid
                </button>
              </form>
            ) : null}
            <CardDescription>
              This booking includes {booking.bookingItems.length} tour(s).
            </CardDescription>
            <div className="pt-4 border-t space-y-3">
              <p className="mb-2 text-sm font-medium text-muted-foreground">Actions</p>
              <BookingStatusActions
                bookingId={booking.id}
                currentStatus={booking.status}
                customerEmail={booking.customerEmail}
                customerPhone={booking.phoneNumber}
              />
              <Button variant="outline" className="w-full" asChild>
                <a href={`/api/bookings/${booking.id}/voucher`} download>
                  <Download className="mr-2 h-4 w-4" />
                  Download Voucher
                </a>
              </Button>
              <BookingExportCsvButton booking={booking} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tours in this Booking</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {booking.bookingItems.map((item) => (
              <div
                key={item.id}
                className="border rounded-md p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
              >
                <div>
                  {item.tourId && item.tours ? (
                    <Link
                      href={`/tours/${item.tours.slug}`}
                      className="text-lg font-semibold text-primary hover:underline"
                    >
                      {item.tours.name}
                    </Link>
                  ) : item.upsellItemId && item.upsellItems ? (
                    <p className="text-lg font-semibold">{item.upsellItems.name}</p>
                  ) : (
                    <p className="text-lg font-semibold">Unknown Item</p>
                  )}
                  {item.tourId && (
                    <p className="text-muted-foreground text-sm">Tour ID: {item.tourId}</p>
                  )}
                  {item.packageName && (
                    <div className="mt-1">
                      <p className="text-muted-foreground text-sm font-medium text-primary/80">
                        Package: {item.packageName}
                      </p>
                      {item.tours?.packages?.find((p) => p.id === item.packageId)?.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.tours.packages.find((p) => p.id === item.packageId)?.description}
                        </p>
                      )}
                    </div>
                  )}
                  {item.upsellItemId && (
                    <p className="text-muted-foreground text-sm">
                      Upsell Item ID: {item.upsellItemId}
                    </p>
                  )}
                  {item.itemDate && (
                    <p className="text-muted-foreground text-sm">
                      Date: {format(new Date(item.itemDate), 'PPP')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm">
                  {item.tourId && (
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {item.adults} Adults, {item.children} Children
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                      }).format(item.price)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
