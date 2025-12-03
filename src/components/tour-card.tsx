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

  // Display the starting price from the first tier (for a single person)
  const startingPrice = tour.priceTiers[0]?.pricePerAdult;

  const handleFavoriteClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (isFavorited) {
      removeFromWishlist(tour.id);
    } else {
      addToWishlist(tour);
    }
  };

  return (
    <Card className="flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group border rounded-lg">
      <div className="relative h-56 w-full overflow-hidden">
        <Link href={`/tours/${tour.slug}`}>
          <Image
            src={tour.images[0]}
            alt={tour.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            data-ai-hint={`${tour.destination} ${tour.type[0]}`}
          />
        </Link>
        <Badge
          variant="secondary"
          className="absolute top-3 left-3 bg-white/80 hover:bg-white text-gray-700"
        >
          <MapPin className="h-3 w-3 mr-1.5" />
          {tour.destination}
        </Badge>
        <Button
          variant="secondary"
          size="icon"
          className={cn(
            "absolute top-3 right-3 h-8 w-8 rounded-full bg-white/80 hover:bg-white text-gray-700",
            isFavorited && "text-red-500 bg-red-100/80 hover:bg-red-100",
          )}
          onClick={handleFavoriteClick}
          aria-label={isFavorited ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart className={cn("h-4 w-4", isFavorited && "fill-current")} />
        </Button>
      </div>

      <CardContent className="p-4 space-y-3 flex flex-col flex-grow">
        <div className="flex items-center text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <span>{tour.duration} Days</span>
          </div>
          <div className="flex-grow text-right">
            <div className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
              <span className="font-bold">{tour.rating.toFixed(1)}</span>
            </div>
          </div>
        </div>

        <h3 className="font-headline text-lg font-semibold h-12 overflow-hidden">
          <Link
            href={`/tours/${tour.slug}`}
            className="hover:text-primary transition-colors line-clamp-2"
            title={tour.name}
          >
            {tour.name}
          </Link>
        </h3>

        <div className="border-t pt-3 mt-auto flex flex-wrap gap-2 justify-between items-center">
          <p className="text-sm">
            <span className="text-muted-foreground">From </span>
            <span className="font-bold text-lg text-primary">
              ${startingPrice.toFixed(2)}
            </span>
            <span className="text-muted-foreground">/person</span>
          </p>
          <Button
            variant="ghost"
            asChild
            className="text-primary hover:text-primary"
          >
            <Link href={`/tours/${tour.slug}`}>
              Details <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}