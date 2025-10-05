import { getBookingById } from '@/lib/supabase/bookings';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, DollarSign, Mail, User, Users, Tag, Phone, Globe } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface BookingDetailsPageProps {
  params: {
    id: string;
  };
}

export default async function BookingDetailsPage({ params }: BookingDetailsPageProps) {
  const booking = await getBookingById(params.id);

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
          <p className="text-muted-foreground">
            Details for booking ID: {booking.id}
          </p>
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
              <p className="text-muted-foreground">Booked on: {format(new Date(booking.bookingDate), 'PPP')}</p>
            </div>
            <div className="flex items-center gap-3">
              <Tag className="h-5 w-5 text-primary" />
              <Badge 
                variant={
                  booking.status === "Confirmed" ? "default" : 
                  booking.status === "Pending" ? "secondary" : 
                  "destructive"
                } 
                className={cn(
                    booking.status === "Confirmed" && "bg-green-100 text-green-800",
                    booking.status === "Pending" && "bg-yellow-100 text-yellow-800",
                    booking.status === "Cancelled" && "bg-red-100 text-red-800"
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
              <span className="text-xl font-bold text-primary">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(booking.totalPrice)}</span>
            </div>
            <CardDescription>This booking includes {booking.bookingItems.length} tour(s).</CardDescription>
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
              <div key={item.id} className="border rounded-md p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  {item.tourId && item.tours ? (
                    <Link href={`/tours/${item.tours.slug}`} className="text-lg font-semibold text-primary hover:underline">
                      {item.tours.name}
                    </Link>
                  ) : item.upsellItemId && item.upsellItems ? (
                    <p className="text-lg font-semibold">{item.upsellItems.name}</p>
                  ) : (
                    <p className="text-lg font-semibold">Unknown Item</p>
                  )}
                  {item.tourId && <p className="text-muted-foreground text-sm">Tour ID: {item.tourId}</p>}
                  {item.upsellItemId && <p className="text-muted-foreground text-sm">Upsell Item ID: {item.upsellItemId}</p>}
                  {item.itemDate && <p className="text-muted-foreground text-sm">Date: {format(new Date(item.itemDate), 'PPP')}</p>}
                </div>
                <div className="flex items-center gap-4 text-sm">
                  {item.tourId && (
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{item.adults} Adults, {item.children} Children</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(item.price)}</span>
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