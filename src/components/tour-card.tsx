import Link from 'next/link';
import Image from 'next/image';
import type { Tour } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, MapPin, Star, Heart, Users, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TourCardProps {
  tour: Tour;
}

export function TourCard({ tour }: TourCardProps) {
  const pricePerDay = tour.price / tour.duration;

  return (
    <Card className="flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group border rounded-lg">
      <div className="relative h-56 w-full overflow-hidden">
        <Link href={`/tours/${tour.id}`}>
          <Image
            src={tour.image}
            alt={tour.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            data-ai-hint={`${tour.destination} ${tour.type}`}
          />
        </Link>
        <Button variant="secondary" size="icon" className="absolute top-3 right-3 h-8 w-8 rounded-full bg-white/80 hover:bg-white text-gray-700">
          <Heart className="h-4 w-4" />
          <span className="sr-only">Like</span>
        </Button>
      </div>

      <CardContent className="p-4 space-y-3 flex flex-col flex-grow">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary" />
            <span>{tour.destination}</span>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
            <span>{tour.rating.toFixed(1)}</span>
          </Badge>
        </div>
        
        <h3 className="font-headline text-lg font-semibold h-12">
          <Link href={`/tours/${tour.id}`} className="hover:text-primary transition-colors">
            {tour.name}
          </Link>
        </h3>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <span>{tour.duration} Days</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            <span>50+</span>
          </div>
        </div>

        <div className="border-t pt-3 mt-auto flex justify-between items-center">
            <p className="text-sm">
                <span className="font-bold text-lg text-primary">${pricePerDay.toFixed(2)}</span>
                <span className="text-muted-foreground">/Per Day</span>
            </p>
            <Button variant="ghost" asChild className="text-primary hover:text-primary">
                <Link href={`/tours/${tour.id}`}>
                    Book Now <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}
