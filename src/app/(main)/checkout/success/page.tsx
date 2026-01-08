 "use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, CheckCircle2, Compass, Loader2, Ticket, XCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getBookingById } from "@/lib/supabase/bookings";
import { useCart } from "@/hooks/use-cart";

type PaymentState = "checking" | "confirmed" | "cancelled" | "pending" | "unknown";

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const { clearCart } = useCart();
  const [paymentState, setPaymentState] = useState<PaymentState>("checking");

  const merchantOrderId = useMemo(() => {
    return (
      searchParams.get("merchantOrderId") ||
      searchParams.get("merchantOrderID") ||
      searchParams.get("orderId") ||
      searchParams.get("orderID") ||
      null
    );
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    let intervalId: number | undefined;

    async function checkBookingStatus() {
      if (!merchantOrderId) {
        setPaymentState("unknown");
        return;
      }

      const booking = await getBookingById(merchantOrderId);
      if (cancelled) return;

      if (!booking) {
        setPaymentState("unknown");
        return;
      }

      if (booking.status === "Confirmed") {
        setPaymentState("confirmed");
        clearCart();
        return;
      }

      if (booking.status === "Cancelled") {
        setPaymentState("cancelled");
        return;
      }

      setPaymentState("pending");
    }

    void checkBookingStatus();

    if (merchantOrderId) {
      intervalId = window.setInterval(() => {
        void checkBookingStatus();
      }, 2000);
    }

    return () => {
      cancelled = true;
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, [merchantOrderId, clearCart]);

  const heroTitle =
    paymentState === "confirmed"
      ? "Booking confirmed"
      : paymentState === "cancelled"
        ? "Payment failed"
        : paymentState === "pending"
          ? "Confirming payment"
          : "Checkout complete";

  const heroSubtitle =
    paymentState === "confirmed"
      ? "Thanks for booking with Wanderlust Hub. A confirmation email is on its way."
      : paymentState === "cancelled"
        ? "Your payment was not completed. You can try again from the cart."
        : paymentState === "pending"
          ? "We’re waiting for payment confirmation from Kashier."
          : "If you completed payment, confirmation will appear shortly.";

  return (
    <div className="mx-auto w-full max-w-5xl space-y-10 py-10">
      <section className="relative overflow-hidden rounded-3xl border bg-card">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
        <div className="relative p-6 md:p-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3">
              <Badge variant="secondary" className="w-fit">
                Confirmation
              </Badge>
              <h1 className="font-headline text-4xl font-bold tracking-tight text-foreground md:text-5xl">
                {heroTitle}
              </h1>
              <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
                {heroSubtitle}
              </p>
            </div>
            <div className="grid w-full gap-3 sm:max-w-md sm:grid-cols-2">
              <Button asChild size="lg">
                <Link href="/tours">
                  Browse Tours <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/destination">Explore Destinations</Link>
              </Button>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border bg-background/70 p-4">
              <p className="text-sm font-medium">Step 1</p>
              <p className="text-sm text-muted-foreground">Cart</p>
            </div>
            <div className="rounded-2xl border bg-background/70 p-4">
              <p className="text-sm font-medium">Step 2</p>
              <p className="text-sm text-muted-foreground">Checkout</p>
            </div>
            <div className="rounded-2xl border bg-background/70 p-4">
              <p className="text-sm font-medium">Step 3</p>
              <p className="text-sm text-muted-foreground">Confirmation</p>
            </div>
          </div>
        </div>
      </section>

      <Card className="overflow-hidden rounded-3xl border bg-card">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3">
            {paymentState === "confirmed" ? (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-500/10 text-green-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            ) : paymentState === "cancelled" ? (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-600">
                <XCircle className="h-6 w-6" />
              </div>
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/30 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}
            <div className="space-y-0.5">
              <CardTitle className="text-2xl">
                {paymentState === "confirmed"
                  ? "Payment Confirmed!"
                  : paymentState === "cancelled"
                    ? "Payment Not Completed"
                    : "Processing Payment"}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {merchantOrderId ? `Booking ID: ${merchantOrderId}` : "Return to the cart if needed."}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border bg-muted/30 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background">
                <Ticket className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Booking details</p>
                <p className="text-sm text-muted-foreground">Sent to your email</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border bg-muted/30 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background">
                <Compass className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Next ideas</p>
                <p className="text-sm text-muted-foreground">Add another tour or add-on</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border bg-muted/30 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background">
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Need help?</p>
                <p className="text-sm text-muted-foreground">Contact us any time</p>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 border-t bg-muted/20 sm:flex-row sm:justify-between">
          {paymentState === "cancelled" ? (
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <Link href="/cart">Back to Cart</Link>
            </Button>
          ) : (
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <Link href="/contact">Contact Support</Link>
            </Button>
          )}

          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/">
              Continue Exploring <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
