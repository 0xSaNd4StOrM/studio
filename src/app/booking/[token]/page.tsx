import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getSharedBookingByToken, type SharedBooking } from '@/lib/booking-share';
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  Phone,
  Mail,
  Receipt,
  XCircle,
} from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Booking summary',
};

interface BookingSharePageProps {
  params: Promise<{ token: string }>;
}

export default async function BookingSharePage({ params }: BookingSharePageProps) {
  const { token } = await params;
  const booking = await getSharedBookingByToken(token);
  if (!booking) notFound();
  const isPending = booking.status === 'Pending';

  const total = booking.totalPrice;
  const formattedTotal = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(total);
  const formattedDiscount =
    booking.discountAmount > 0
      ? new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          maximumFractionDigits: 0,
        }).format(booking.discountAmount)
      : null;

  return (
    <div className="min-h-screen bg-muted/20 py-10 px-4">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* ── Agency header ──────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          {booking.agency.logoUrl ? (
            <Image
              src={booking.agency.logoUrl}
              alt={booking.agency.name}
              width={48}
              height={48}
              className="h-12 w-12 rounded-md object-contain"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-sm font-bold text-primary">
              {booking.agency.name.slice(0, 1)}
            </div>
          )}
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Booking with
            </p>
            <p className="font-semibold">{booking.agency.name}</p>
          </div>
        </div>

        {/* ── Status banner ──────────────────────────────────────── */}
        <StatusBanner status={booking.status} />

        {/* ── Continue-payment CTA (Pending only) ────────────────── */}
        {isPending && (
          <Card className="border-primary/40 bg-primary/5">
            <CardContent className="flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold">Ready to pay?</p>
                <p className="text-xs text-muted-foreground">
                  Continue securely with our payment provider — your booking confirms
                  automatically once payment goes through.
                </p>
              </div>
              <Button asChild size="lg" className="shrink-0">
                <a href={`/api/booking/${token}/pay`}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Continue payment
                </a>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Booking card ───────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Booking summary</CardTitle>
            <CardDescription>
              Reference:{' '}
              <code className="font-mono text-xs">{booking.bookingId.slice(0, 8)}</code>
              {' · '}
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {formatDate(booking.bookingDate)}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Items */}
            <div className="space-y-3">
              {booking.items.length === 0 ? (
                <p className="rounded-md bg-muted/40 p-3 text-sm italic text-muted-foreground">
                  No items on this booking.
                </p>
              ) : (
                booking.items.map((item, i) => (
                  <div key={i} className="rounded-lg border bg-background p-3">
                    <p className="font-medium">
                      {item.tourName ?? item.upsellName ?? 'Item'}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      {item.packageName && <span>Package: {item.packageName}</span>}
                      {item.itemDate && (
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {formatDate(item.itemDate)}
                        </span>
                      )}
                      {item.adults !== null && item.adults > 0 && (
                        <span>
                          {item.adults} adult{item.adults === 1 ? '' : 's'}
                          {item.children && item.children > 0
                            ? ` + ${item.children} child${item.children === 1 ? '' : 'ren'}`
                            : ''}
                        </span>
                      )}
                    </div>
                    {item.tourSlug && (
                      <Link
                        href={`/tours/${item.tourSlug}`}
                        className="mt-1 inline-block text-xs font-medium text-primary underline underline-offset-2"
                      >
                        View tour →
                      </Link>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Totals */}
            <div className="space-y-1.5 rounded-lg bg-muted/40 p-4 text-sm">
              {formattedDiscount && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Discount applied</span>
                  <span>−{formattedDiscount}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-base font-semibold">
                <span className="flex items-center gap-1.5">
                  <Receipt className="h-4 w-4" />
                  Total
                </span>
                <span>{formattedTotal}</span>
              </div>
              {booking.paymentStatus === 'deposit_paid' ? (
                <>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Paid (deposit)</span>
                    <span>
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        maximumFractionDigits: 2,
                      }).format(booking.amountPaid ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Balance due on arrival</span>
                    <span>
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        maximumFractionDigits: 2,
                      }).format(booking.balanceDue ?? 0)}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Paid in full</p>
              )}
              {booking.paymentMethod && (
                <p className="text-xs text-muted-foreground">
                  Payment method:{' '}
                  <span className="capitalize">{booking.paymentMethod}</span>
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Agency contact ─────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Need to make changes?</CardTitle>
            <CardDescription>
              Contact {booking.agency.name} for anything related to this booking.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {booking.agency.phone && (
              <Button asChild variant="outline" className="w-full justify-start">
                <a href={`tel:${booking.agency.phone.replace(/\D/g, '')}`}>
                  <Phone className="mr-2 h-4 w-4" />
                  Call {booking.agency.phone}
                </a>
              </Button>
            )}
            {booking.agency.phone && (
              <Button asChild variant="outline" className="w-full justify-start">
                <a
                  href={`https://wa.me/${booking.agency.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                    `Hi! I have a question about my booking (ref: ${booking.bookingId.slice(0, 8)}).`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="mr-2 h-4 w-4">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
                  </svg>
                  Continue on WhatsApp
                </a>
              </Button>
            )}
            {booking.agency.contactEmail && (
              <Button asChild variant="outline" className="w-full justify-start">
                <a
                  href={`mailto:${booking.agency.contactEmail}?subject=${encodeURIComponent(
                    `Booking ${booking.bookingId.slice(0, 8)}`
                  )}`}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Email {booking.agency.contactEmail}
                </a>
              </Button>
            )}
          </CardContent>
        </Card>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <p className="text-center text-xs text-muted-foreground">
          This page is a private summary of your booking — sharing the link gives others
          read-only access. No personal details (name, email, phone) are shown.
        </p>
      </div>
    </div>
  );
}

function StatusBanner({ status }: { status: SharedBooking['status'] }) {
  switch (status) {
    case 'Confirmed':
      return (
        <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div>
            <p className="font-semibold text-emerald-900 dark:text-emerald-200">
              Booking confirmed
            </p>
            <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80">
              You&apos;re all set. Save this page for reference.
            </p>
          </div>
        </div>
      );
    case 'Pending':
      return (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="font-semibold text-amber-900 dark:text-amber-200">
              Awaiting payment
            </p>
            <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
              The booking will confirm automatically once payment is complete.
            </p>
          </div>
        </div>
      );
    case 'Cancelled':
      return (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <p className="font-semibold text-destructive">Booking cancelled</p>
            <p className="text-xs text-destructive/80">
              If this looks wrong, contact the agency below.
            </p>
          </div>
        </div>
      );
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
