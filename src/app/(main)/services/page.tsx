import { getUpsellItems } from "@/lib/supabase/upsell-items";
import { ServicesClient } from "./services-client";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Car, Luggage, PhoneCall } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  let services = [] as Awaited<ReturnType<typeof getUpsellItems>>;
  try {
    const items = await getUpsellItems();
    services = items.filter((i) => i.type === "service");
  } catch {
    services = [];
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10">
      <section className="relative overflow-hidden rounded-3xl border bg-card">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=2400&q=70"
            alt=""
            fill
            priority
            className="object-cover opacity-25"
            sizes="(max-width: 768px) 100vw, 1200px"
          />
        </div>
        <div className="relative p-6 md:p-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3">
              <Badge variant="secondary" className="w-fit">
                Services
              </Badge>
              <h1 className="font-headline text-4xl font-bold tracking-tight text-foreground md:text-5xl">
                Travel extras that make things easy
              </h1>
              <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
                Add services like airport pickup, SIM cards, or private transport
                to smooth out the details.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/cart">View Cart</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/tours">Browse Tours</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-3xl">
          <CardContent className="flex items-start gap-4">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <Luggage className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold">Airport pickup</p>
              <p className="text-sm text-muted-foreground">
                Skip the hassle and start your trip comfortably.
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl">
          <CardContent className="flex items-start gap-4">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <PhoneCall className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold">Stay connected</p>
              <p className="text-sm text-muted-foreground">
                Local SIMs and connectivity options when available.
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl">
          <CardContent className="flex items-start gap-4">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <Car className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold">Private transport</p>
              <p className="text-sm text-muted-foreground">
                Reliable rides between cities and attractions.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {services.length === 0 ? (
        <Card className="rounded-3xl">
          <CardContent className="space-y-3">
            <p className="text-lg font-semibold">No services available yet</p>
            <p className="text-sm text-muted-foreground">
              Check back soon, or browse tours and add services during booking.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="w-full sm:w-auto">
                <Link href="/tours">Browse Tours</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full sm:w-auto"
              >
                <Link href="/contact">Request a service</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <ServicesClient services={services} />
      )}
    </div>
  );
}
