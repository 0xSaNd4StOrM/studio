import { getUpsellItems } from "@/lib/supabase/upsell-items";
import { ServicesClient } from "../services/services-client";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Car, Luggage, PhoneCall } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function UpsellItemsPage() {
  let items = [] as Awaited<ReturnType<typeof getUpsellItems>>;
  try {
    items = await getUpsellItems();
  } catch {
    items = [];
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10">
      <section className="relative overflow-hidden rounded-3xl border bg-card">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=2400&q=70"
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
                Upsell Items
              </Badge>
              <h1 className="font-headline text-4xl font-bold tracking-tight text-foreground md:text-5xl">
                Extras that make your Egypt trip easier
              </h1>
              <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
                Add SIM cards, airport pickup/dropoff, private driver cars, and
                more — all in one place.
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
              <p className="text-base font-semibold">Airport pickup & dropoff</p>
              <p className="text-sm text-muted-foreground">
                Start and end the trip with smooth transfers.
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
              <p className="text-base font-semibold">SIM cards & eSIM</p>
              <p className="text-sm text-muted-foreground">
                Get online fast for maps, WhatsApp, and bookings.
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
              <p className="text-base font-semibold">Private car with driver</p>
              <p className="text-sm text-muted-foreground">
                Reliable transport between cities and attractions.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {items.length === 0 ? (
        <Card className="rounded-3xl">
          <CardContent className="space-y-3">
            <p className="text-lg font-semibold">No extras available yet</p>
            <p className="text-sm text-muted-foreground">
              You can request popular options like SIM cards, airport transfers,
              or a private car with driver.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="w-full sm:w-auto">
                <Link href="/contact?service=SIM%20Card">Request a SIM card</Link>
              </Button>
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link href="/contact?service=Airport%20Transfer">
                  Request airport transfer
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link href="/contact?service=Private%20Driver">
                  Request private driver
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <ServicesClient
          services={items}
          showTypeFilter
          badgeLabel="Extras"
          title="Pick what you need"
          description="Filter by category, search by keyword, then add to cart."
          searchPlaceholder="Search extras..."
        />
      )}
    </div>
  );
}

