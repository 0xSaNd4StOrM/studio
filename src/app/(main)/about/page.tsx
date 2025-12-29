import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Compass,
  Headphones,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

export default async function AboutPage() {
  let agencyName = "Wanderlust Hub";
  let aboutUs =
    "We craft memorable journeys across Egypt with thoughtful itineraries, local guides, and seamless logistics.";
  let tagline = "Curated journeys. Local expertise. Seamless travel.";

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("settings")
      .select("data")
      .eq("id", 1)
      .maybeSingle();

    if (!error && data) {
      const settingsData = (
        data as unknown as
          | { data?: { aboutUs?: string; agencyName?: string; tagline?: string } }
          | null
      )?.data;

      agencyName = settingsData?.agencyName || agencyName;
      aboutUs = settingsData?.aboutUs || aboutUs;
      tagline = settingsData?.tagline || tagline;
    }
  } catch {
  }

  const aboutParagraphs = aboutUs
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10">
      <section className="relative overflow-hidden rounded-3xl border bg-card">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1544986581-efac024faf62?auto=format&fit=crop&w=2400&q=70"
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
                About
              </Badge>
              <h1 className="font-headline text-4xl font-bold tracking-tight text-foreground md:text-5xl">
                About {agencyName}
              </h1>
              <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
                {tagline}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/tours">Explore Tours</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/contact">Contact Us</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
        <Card className="rounded-3xl">
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Our story
              </p>
              <h2 className="font-headline text-2xl font-semibold tracking-tight md:text-3xl">
                Thoughtful trips, designed around you
              </h2>
            </div>
            <div className="prose prose-neutral max-w-none dark:prose-invert">
              {aboutParagraphs.length > 0 ? (
                aboutParagraphs.map((p, idx) => <p key={idx}>{p}</p>)
              ) : (
                <p>{aboutUs}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden rounded-3xl">
          <div className="absolute inset-0">
            <Image
              src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=2400&q=70"
              alt="Traveler looking at a scenic view"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 600px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
          </div>
          <CardContent className="relative flex h-full flex-col justify-end gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-white/80">
                What you get
              </p>
              <p className="text-2xl font-semibold tracking-tight text-white">
                A smooth, personal travel experience
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                <p className="text-sm text-white/80">Local expertise</p>
                <p className="text-base font-semibold text-white">
                  Trusted guides
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                <p className="text-sm text-white/80">Flexible plans</p>
                <p className="text-base font-semibold text-white">
                  Built around you
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                <p className="text-sm text-white/80">Transparent pricing</p>
                <p className="text-base font-semibold text-white">
                  No surprises
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                <p className="text-sm text-white/80">Support</p>
                <p className="text-base font-semibold text-white">Here 24/7</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-3xl">
          <CardContent className="flex items-start gap-4">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <Compass className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold">Curated itineraries</p>
              <p className="text-sm text-muted-foreground">
                Handpicked routes, best times, and must-see highlights.
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl">
          <CardContent className="flex items-start gap-4">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold">Reliable logistics</p>
              <p className="text-sm text-muted-foreground">
                Transfers, timing, and details handled end-to-end.
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl">
          <CardContent className="flex items-start gap-4">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold">Human-first service</p>
              <p className="text-sm text-muted-foreground">
                Quick answers, honest advice, and local support.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-5">
        <Card className="rounded-3xl lg:col-span-3">
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                How we work
              </p>
              <h2 className="font-headline text-2xl font-semibold tracking-tight md:text-3xl">
                Simple planning, great travel
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border bg-background/60 p-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Step 1
                </p>
                <p className="mt-1 text-base font-semibold">Tell us your vibe</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Dates, budget, and what you love to do.
                </p>
              </div>
              <div className="rounded-2xl border bg-background/60 p-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Step 2
                </p>
                <p className="mt-1 text-base font-semibold">We curate options</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  A plan that fits your pace and interests.
                </p>
              </div>
              <div className="rounded-2xl border bg-background/60 p-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Step 3
                </p>
                <p className="mt-1 text-base font-semibold">Travel stress-free</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  We stay on standby while you enjoy.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl lg:col-span-2">
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-semibold">Good trips feel easy</p>
                <p className="text-sm text-muted-foreground">
                  We keep communication clear, choices focused, and planning fast.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                <Headphones className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-semibold">Support that shows up</p>
                <p className="text-sm text-muted-foreground">
                  Need a change mid-trip? We handle it quickly.
                </p>
              </div>
            </div>
            <div className="rounded-2xl bg-muted/40 p-4">
              <p className="text-sm text-muted-foreground">
                Ready to plan your next trip?
              </p>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <Button asChild className="w-full sm:w-auto">
                  <Link href="/tours">Browse Tours</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  <Link href="/contact">Get a Quote</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
