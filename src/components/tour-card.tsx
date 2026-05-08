import Link from 'next/link';
import Image from 'next/image';
import type { Tour } from '@/types';
import { useWishlist } from '@/hooks/use-wishlist';
import { useCurrency } from '@/hooks/use-currency';
import { useLanguage } from '@/hooks/use-language';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Clock, MapPin, Star, Heart, ArrowRight, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { BLUR_DATA_URL } from '@/lib/blur-data-url';

export type TourAvailabilityStatus =
  | { status: 'available' }
  | { status: 'limited'; spots?: number }
  | { status: 'soldout' }
  | { status: 'unrestricted' };

interface TourCardProps {
  tour: Tour;
  availabilityStatus?: TourAvailabilityStatus;
  compareEnabled?: boolean;
  compareSelected?: boolean;
  onToggleCompare?: (tourId: string) => void;
  compareDisabled?: boolean;
}

export function TourCard({
  tour,
  availabilityStatus,
  compareEnabled = false,
  compareSelected = false,
  onToggleCompare,
  compareDisabled = false,
}: TourCardProps) {
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { format } = useCurrency();
  const { t } = useLanguage();
  const isFavorited = isInWishlist(tour.id);

  const imageUrl = Array.isArray(tour.images) && tour.images.length > 0 ? tour.images[0] : null;

  const startingPrice = (() => {
    const prices: number[] = [];
    for (const tier of tour.priceTiers ?? []) {
      if (typeof tier?.pricePerAdult === 'number') prices.push(tier.pricePerAdult);
    }
    for (const pkg of tour.packages ?? []) {
      for (const tier of pkg.priceTiers ?? []) {
        if (typeof tier?.pricePerAdult === 'number') prices.push(tier.pricePerAdult);
      }
    }
    if (prices.length === 0) return null;
    const min = Math.min(...prices);
    return Number.isFinite(min) ? min : null;
  })();

  const durationLabel = `${tour.duration} ${t('featured.duration')}`;
  const ratingLabel =
    typeof tour.rating === 'number' && Number.isFinite(tour.rating) && tour.rating > 0
      ? tour.rating.toFixed(1)
      : t('tour.new');

  const isSoldOut = availabilityStatus?.status === 'soldout';

  const snippet = (() => {
    const desc = (tour.description ?? '').trim();
    if (!desc) return '';
    return desc.length > 140 ? `${desc.slice(0, 137)}…` : desc;
  })();

  const firstHighlight = Array.isArray(tour.highlights) ? tour.highlights[0] : undefined;

  const handleFavoriteClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (isFavorited) {
      removeFromWishlist(tour.id);
    } else {
      addToWishlist(tour);
    }
  };

  const handleCompareChange = (next: boolean | 'indeterminate') => {
    if (!onToggleCompare) return;
    if (next === 'indeterminate') return;
    onToggleCompare(tour.id);
  };

  const renderAvailabilityBadge = () => {
    if (!availabilityStatus) return null;
    if (availabilityStatus.status === 'available') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
          {t('tours.availabilityAvailable')}
        </span>
      );
    }
    if (availabilityStatus.status === 'limited') {
      const label =
        typeof availabilityStatus.spots === 'number'
          ? t('tours.availabilityFewLeftCount').replace(
              '{{count}}',
              String(availabilityStatus.spots)
            )
          : t('tours.availabilityFewLeft');
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
          {label}
        </span>
      );
    }
    if (availabilityStatus.status === 'soldout') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
          {t('tours.availabilitySoldOut')}
        </span>
      );
    }
    return null;
  };

  return (
    <Card
      className={cn(
        'group flex h-full flex-col overflow-hidden rounded-3xl border-border/60 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-500 ease-out hover:-translate-y-0.5 hover:border-border hover:shadow-[0_18px_40px_-20px_rgba(15,23,42,0.25)]',
        isSoldOut && 'opacity-90',
        compareSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        <Link href={`/tours/${tour.slug}`} className="relative block h-full w-full">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={tour.name}
              fill
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              data-ai-hint={`${tour.destination} ${(Array.isArray(tour.type) ? tour.type[0] : '') || 'travel'}`}
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
              priority={false}
            />
          ) : (
            <div className="h-full w-full bg-muted" />
          )}
        </Link>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/35 to-transparent" />
        <Badge
          variant="secondary"
          className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-foreground shadow-sm backdrop-blur"
        >
          <MapPin className="mr-1.5 h-3 w-3" />
          {tour.destination}
        </Badge>
        <Button
          variant="secondary"
          size="icon"
          className={cn(
            'absolute right-3 top-3 h-9 w-9 rounded-full bg-white/95 text-foreground shadow-sm backdrop-blur hover:bg-white',
            isFavorited && 'bg-red-50 text-red-600 hover:bg-red-50'
          )}
          onClick={handleFavoriteClick}
          aria-label={isFavorited ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-pressed={isFavorited}
          type="button"
        >
          <Heart className={cn('h-4 w-4', isFavorited && 'fill-current')} />
        </Button>
        {availabilityStatus &&
          (availabilityStatus.status === 'limited' ||
            availabilityStatus.status === 'soldout') && (
            <div className="absolute bottom-3 right-3">{renderAvailabilityBadge()}</div>
          )}
        {compareEnabled && (
          <label
            className={cn(
              'absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full bg-white/95 px-2.5 py-1 text-xs font-medium text-foreground shadow-sm backdrop-blur',
              compareDisabled && !compareSelected && 'opacity-60'
            )}
          >
            <Checkbox
              checked={compareSelected}
              disabled={compareDisabled && !compareSelected}
              onCheckedChange={handleCompareChange}
              aria-label={t('tours.compareAdd')}
            />
            {compareSelected ? t('tours.compareSelected') : t('tours.compareAdd')}
          </label>
        )}
      </div>

      <CardContent className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {durationLabel}
          </span>
          <span className="text-border" aria-hidden>
            ·
          </span>
          <span className="inline-flex items-center gap-1">
            <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
            <span className="font-semibold text-foreground">{ratingLabel}</span>
          </span>
          {availabilityStatus?.status === 'available' && (
            <>
              <span className="text-border" aria-hidden>
                ·
              </span>
              <span className="text-emerald-700">{t('tours.availabilityAvailable')}</span>
            </>
          )}
        </div>

        <h3 className="font-headline text-xl font-semibold leading-tight tracking-tight">
          <Link
            href={`/tours/${tour.slug}`}
            className="line-clamp-2 transition-colors hover:text-primary"
            title={tour.name}
          >
            {tour.name}
          </Link>
        </h3>

        {snippet && (
          <p
            className="line-clamp-2 text-sm leading-relaxed text-muted-foreground"
            title={tour.description}
          >
            {snippet}
          </p>
        )}

        {firstHighlight && (
          <div className="flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-muted/70 px-2.5 py-1 text-xs text-muted-foreground">
              <Check className="h-3 w-3" />
              <span className="line-clamp-1 max-w-[220px]">{firstHighlight}</span>
            </span>
          </div>
        )}

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-border/60 pt-4">
          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {t('featured.from')}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {startingPrice != null ? format(startingPrice) : t('tour.contactUs')}
              </span>
              {startingPrice != null && (
                <span className="text-xs text-muted-foreground">{t('tour.perPerson')}</span>
              )}
            </div>
          </div>
          <Button
            asChild
            className={cn(
              'shrink-0 rounded-full px-5 transition-transform group-hover:translate-x-0.5',
              isSoldOut && 'opacity-60'
            )}
            aria-disabled={isSoldOut}
          >
            <Link href={`/tours/${tour.slug}`}>
              {t('tours.details')} <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
