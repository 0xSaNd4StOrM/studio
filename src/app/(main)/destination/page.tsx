import Image from "next/image";
import Link from "next/link";
import { getTours } from "@/lib/supabase/tours";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

type DestinationCard = {
  name: string;
  count: number;
  imageUrl?: string;
};

const destinationOrder = [
  "Cairo",
  "Giza",
  "Alexandria",
  "Luxor",
  "Aswan",
  "Hurghada",
  "Sharm El Sheikh",
  "Siwa Oasis",
] as const;

const destinationFallbackImages: Record<string, string> = {
  Cairo:
    "https://images.unsplash.com/photo-1544986581-efac024faf62?auto=format&fit=crop&w=2400&q=70",
  Giza:
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=2400&q=70",
  Alexandria:
    "https://images.unsplash.com/photo-1452421822248-d4c2b47f0c81?auto=format&fit=crop&w=2400&q=70",
  Luxor:
    "https://images.unsplash.com/photo-1699115823831-cf1329dfc58f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw4fHxhZHZlbnR1cmUlMjB0cmF2ZWx8ZW58MHx8fHwxNzUyNjIyOTA5fDA&ixlib=rb-4.1.0&q=80&w=1080",
  Aswan:
    "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=2400&q=70",
  Hurghada:
    "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=2400&q=70",
  "Sharm El Sheikh":
    "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=2400&q=70",
  "Siwa Oasis":
    "https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=2400&q=70",
};

function normalizeDestination(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function isPreferredCoverImageUrl(url: string) {
  if (!url) return false;
  const normalized = url.trim();
  return normalized.includes("/storage/v1/object/public/");
}

function buildToursUrl(destination: string) {
  const params = new URLSearchParams({ destination });
  return `/tours?${params.toString()}`;
}

export default async function DestinationPage() {
  let cards: DestinationCard[] = [];
  try {
    const tours = await getTours();
    const byDestination = new Map<
      string,
      { count: number; coverUrl?: string; coverScore: number }
    >();

    for (const t of tours) {
      const raw = typeof t.destination === "string" ? t.destination : "";
      const name = raw ? normalizeDestination(raw) : "";
      if (!name) continue;

      const existing = byDestination.get(name) ?? {
        count: 0,
        coverUrl: undefined,
        coverScore: -1,
      };
      existing.count += 1;

      const imageCandidate =
        Array.isArray(t.images) && typeof t.images[0] === "string" ? t.images[0] : undefined;
      const score = typeof t.rating === "number" ? t.rating : 0;
      if (imageCandidate && isPreferredCoverImageUrl(imageCandidate) && score >= existing.coverScore) {
        existing.coverUrl = imageCandidate;
        existing.coverScore = score;
      }

      byDestination.set(name, existing);
    }

    const ordered: DestinationCard[] = [];
    for (const name of destinationOrder) {
      const entry = byDestination.get(name);
      ordered.push({
        name,
        count: entry?.count ?? 0,
        imageUrl: entry?.coverUrl ?? destinationFallbackImages[name],
      });
      byDestination.delete(name);
    }

    const remaining = Array.from(byDestination.entries())
      .map(([name, v]) => ({
        name,
        count: v.count,
        imageUrl: v.coverUrl,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    cards = [...ordered, ...remaining];
  } catch {
    cards = destinationOrder.map((name) => ({
      name,
      count: 0,
      imageUrl: destinationFallbackImages[name],
    }));
  }

  const heroImage = destinationFallbackImages.Cairo;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10">
      <section className="relative overflow-hidden rounded-3xl border bg-card">
        <div className="absolute inset-0">
          <Image
            src={heroImage}
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
                Destinations
              </Badge>
              <h1 className="font-headline text-4xl font-bold tracking-tight text-foreground md:text-5xl">
                Explore Egypt’s main regions
              </h1>
              <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
                Pick a region to see available tours, highlights, and experiences.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/tours">Explore All Tours</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/tailor-made">Tailor-Made Trip</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((d) => {
          const href = buildToursUrl(d.name);
          return (
            <Card
              key={d.name}
              className="group overflow-hidden rounded-3xl border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="relative h-52 w-full overflow-hidden">
                {d.imageUrl ? (
                  <Image
                    src={d.imageUrl}
                    alt={d.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    data-ai-hint={`${d.name} egypt`}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted">
                    <MapPin className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
                <div className="absolute left-4 top-4 flex items-center gap-2">
                  <Badge className="bg-background/90 text-foreground hover:bg-background">
                    <MapPin className="mr-1.5 h-3.5 w-3.5" />
                    {d.name}
                  </Badge>
                  <Badge variant="secondary" className="bg-white/80 text-gray-800 hover:bg-white">
                    {d.count} tour{d.count === 1 ? "" : "s"}
                  </Badge>
                </div>
              </div>

              <CardContent className="flex items-center justify-between gap-4 p-6">
                <div className="space-y-1">
                  <p className="text-lg font-semibold leading-snug">{d.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Browse tours in {d.name}.
                  </p>
                </div>
                <Button asChild variant="outline" className="shrink-0">
                  <Link href={href}>
                    Explore <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
