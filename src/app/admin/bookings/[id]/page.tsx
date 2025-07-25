
"use client"

import { useParams, notFound } from 'next/navigation';
import Link from 'next/link';
import { getBookingById } from '@/lib/bookings';
import { getTourById } from '@/lib/tours';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, User, Mail, Calendar, Hash, Users, DollarSign, Globe } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function BookingDetailsPage() {
  const params = useParams();
  const bookingId = params.id as string;
  const booking = getBookingById(bookingId);
  
  if (!booking) {
    return notFound();
  }

  const tour = getTourById(booking.tourSlug);

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
          <p className="text-muted-foreground">Detailed view of booking #{booking.id}.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Booking Summary</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6">
                     <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Hash /></div>
                        <div>
                            <p className="text-sm text-muted-foreground">Booking ID</p>
                            <p className="font-semibold">{booking.id}</p>
                        </div>
                    </div>
                     <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Calendar /></div>
                        <div>
                            <p className="text-sm text-muted-foreground">Booking Date</p>
                            <p className="font-semibold">{format(new Date(booking.bookingDate), 'PPP')}</p>
                        </div>
                    </div>
                     <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground"><DollarSign /></div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total Price</p>
                            <p className="font-semibold text-lg">${booking.totalPrice.toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Users /></div>
                        <div>
                            <p className="text-sm text-muted-foreground">Guests</p>
                            <p className="font-semibold">{booking.adults} Adults, {booking.children} Children</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Tour Details</CardTitle>
                    <CardDescription>
                        Information about the booked tour. 
                        <Button variant="link" asChild className="p-0 ml-1 h-auto">
                            <Link href={`/tours/${booking.tourSlug}`} target="_blank">View on site</Link>
                        </Button>
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div>
                        <p className="text-sm text-muted-foreground">Tour Name</p>
                        <p className="font-semibold">{booking.tourName}</p>
                    </div>
                     <div>
                        <p className="text-sm text-muted-foreground">Destination</p>
                        <p className="font-semibold">{tour?.destination}</p>
                    </div>
                     <div>
                        <p className="text-sm text-muted-foreground">Duration</p>
                        <p className="font-semibold">{tour?.durationText ?? `${tour?.duration} days`}</p>
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Status</CardTitle>
                </CardHeader>
                <CardContent>
                    <Badge 
                        variant={
                            booking.status === "Confirmed" ? "default" : 
                            booking.status === "Pending" ? "secondary" : 
                            "destructive"
                        } 
                        className={cn(
                            "text-lg w-full justify-center py-2",
                            booking.status === "Confirmed" && "bg-green-100 text-green-800",
                            booking.status === "Pending" && "bg-yellow-100 text-yellow-800",
                            booking.status === "Cancelled" && "bg-red-100 text-red-800"
                        )}
                    >
                      {booking.status}
                    </Badge>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Customer Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground"><User className="h-5 w-5" /></div>
                        <div>
                            <p className="text-sm text-muted-foreground">Name</p>
                            <p className="font-semibold">{booking.customerName}</p>
                        </div>
                    </div>
                     <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground"><Mail className="h-5 w-5" /></div>
                        <div>
                            <p className="text-sm text-muted-foreground">Email</p>
                            <p className="font-semibold">{booking.customerEmail}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
