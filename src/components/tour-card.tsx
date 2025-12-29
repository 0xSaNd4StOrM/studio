import Link from "next/link";
import Image from "next/image";
import type { Tour } from "@/types";
import { useWishlist } from "@/hooks/use-wishlist";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, Star, Heart, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TourCardProps {
  tour: Tour;
}

export function TourCard({ tour }: TourCardProps) {
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const isFavorited = isInWishlist(tour.id);

  const imageUrl =
    Array.isArray(tour.images) && tour.images.length > 0
      ? tour.images[0]
      : "https://placehold.co/1200x800.png";

  const startingPrice = (() => {
    const prices: number[] = [];
    for (const tier of tour.priceTiers ?? []) {
      if (typeof tier?.pricePerAdult === "number") prices.push(tier.pricePerAdult);
    }
    for (const pkg of tour.packages ?? []) {
      for (const tier of pkg.priceTiers ?? []) {
        if (typeof tier?.pricePerAdult === "number") prices.push(tier.pricePerAdult);
      }
    }
    if (prices.length === 0) return null;
    const min = Math.min(...prices);
    return Number.isFinite(min) ? min : null;
  })();

  const currency = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  });

  const durationLabel = `${tour.duration} Day${tour.duration === 1 ? "" : "s"}`;
  const ratingLabel =
    typeof tour.rating === "number" && Number.isFinite(tour.rating) && tour.rating > 0
      ? tour.rating.toFixed(1)
      : "New";

  const handleFavoriteClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (isFavorited) {
      removeFromWishlist(tour.id);
    } else {
      addToWishlist(tour);
    }
  };

  return (
    <Card className="group overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        <Link href={`/tours/${tour.slug}`} className="block h-full w-full">
          <Image
            src={imageUrl}
            alt={tour.name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-110"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            data-ai-hint={`${tour.destination} ${(Array.isArray(tour.type) ? tour.type[0] : "") || "travel"}`}
            priority={false}
          />
        </Link>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-black/0 to-black/0" />
        <Badge
          variant="secondary"
          className="absolute top-3 left-3 bg-white/90 text-gray-800 backdrop-blur"
        >
          <MapPin className="h-3 w-3 mr-1.5" />
          {tour.destination}
        </Badge>
        <Button
          variant="secondary"
          size="icon"
          className={cn(
            "absolute top-3 right-3 h-9 w-9 rounded-full bg-white/90 text-gray-800 backdrop-blur hover:bg-white",
            isFavorited && "text-red-600 bg-red-50 hover:bg-red-50",
          )}
          onClick={handleFavoriteClick}
          aria-label={isFavorited ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={isFavorited}
          type="button"
        >
          <Heart className={cn("h-4 w-4", isFavorited && "fill-current")} />
        </Button>
      </div>

      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <span>{durationLabel}</span>
          </div>
          <div className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-amber-900">
            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
            <span className="font-semibold">{ratingLabel}</span>
          </div>
        </div>

        <h3 className="font-headline text-lg font-semibold leading-snug">
          <Link
            href={`/tours/${tour.slug}`}
            className="line-clamp-2 transition-colors hover:text-primary"
            title={tour.name}
          >
            {tour.name}
          </Link>
        </h3>

        <div className="mt-auto flex items-center justify-between gap-3 border-t pt-3">
          <div className="min-w-0">
            <div className="text-sm text-muted-foreground">From</div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-primary">
                {startingPrice != null ? currency.format(startingPrice) : "Contact us"}
              </span>
              {startingPrice != null && (
                <span className="text-xs text-muted-foreground">/person</span>
              )}
            </div>
          </div>
          <Button asChild variant="outline" className="shrink-0">
            <Link href={`/tours/${tour.slug}`}>
              Details <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
