'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import type { Tour } from '@/types';
import { useWishlist } from '@/hooks/use-wishlist';
import { useCurrency } from '@/hooks/use-currency';
import { useLanguage } from '@/hooks/use-language';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Clock, Star, Heart, ArrowUpRight } from 'lucide-react';
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
  /** Index for staggered entrance animations driven by the parent grid. */
  index?: number;
}

const EASE_OUT_EXPO = [0.22, 1, 0.36, 1] as [number, number, number, number];

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: EASE_OUT_EXPO, delay: i * 0.05 },
  }),
};

export function TourCard({
  tour,
  availabilityStatus,
  compareEnabled = false,
  compareSelected = false,
  onToggleCompare,
  compareDisabled = false,
  index = 0,
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
  const isLimited = availabilityStatus?.status === 'limited';

  const handleFavoriteClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
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

  const indexLabel = String((index % 99) + 1).padStart(2, '0');

  return (
    <motion.article
      variants={cardVariants}
      custom={index}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-80px' }}
      className={cn(
        'group relative flex h-full flex-col',
        compareSelected && 'ring-2 ring-primary ring-offset-4 ring-offset-background rounded-[28px]'
      )}
    >
      <Link
        href={`/tours/${tour.slug}`}
        className="relative block overflow-hidden rounded-[24px] bg-muted"
        aria-label={`View ${tour.name}`}
      >
        {/* Portrait image — boutique editorial proportions */}
        <div className="relative aspect-[4/5] w-full overflow-hidden">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={tour.name}
              fill
              className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.06]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              data-ai-hint={`${tour.destination} ${(Array.isArray(tour.type) ? tour.type[0] : '') || 'travel'}`}
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
              priority={false}
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-muted to-secondary" />
          )}

          {/* Permanent base gradient for text legibility */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/10" />

          {/* Hover dim — deepens on hover for cinematic feel */}
          <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-500 group-hover:bg-black/20" />

          {/* Top-left index numeral, editorial style */}
          <div className="pointer-events-none absolute left-5 top-5 text-[11px] font-medium uppercase tracking-[0.32em] text-white/70">
            № {indexLabel}
          </div>

          {/* Top-right wishlist + availability stack */}
          <div className="absolute right-4 top-4 flex flex-col items-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-10 w-10 rounded-full bg-white/15 text-white backdrop-blur-md transition-all hover:bg-white/30 hover:scale-110',
                isFavorited && 'bg-white text-rose-600 hover:bg-white'
              )}
              onClick={handleFavoriteClick}
              aria-label={isFavorited ? 'Remove from wishlist' : 'Add to wishlist'}
              aria-pressed={isFavorited}
              type="button"
            >
              <Heart className={cn('h-4 w-4', isFavorited && 'fill-current')} />
            </Button>
            {isLimited && (
              <span className="rounded-full bg-amber-400/95 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-950 shadow">
                {availabilityStatus?.status === 'limited' && availabilityStatus.spots
                  ? `${availabilityStatus.spots} ${t('tours.availabilityFewLeft').toLowerCase()}`
                  : t('tours.availabilityFewLeft')}
              </span>
            )}
            {isSoldOut && (
              <span className="rounded-full bg-rose-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white shadow">
                {t('tours.availabilitySoldOut')}
              </span>
            )}
          </div>

          {/* Compare checkbox stays bottom-right of image */}
          {compareEnabled && (
            <label
              className={cn(
                'absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-white backdrop-blur-md',
                compareDisabled && !compareSelected && 'opacity-60'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <Checkbox
                checked={compareSelected}
                disabled={compareDisabled && !compareSelected}
                onCheckedChange={handleCompareChange}
                aria-label={t('tours.compareAdd')}
                className="border-white data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
              />
              {compareSelected ? t('tours.compareSelected') : t('tours.compareAdd')}
            </label>
          )}

          {/* Overlaid editorial info — destination + title sit ON the image */}
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-6 text-white">
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-primary" aria-hidden />
              <span className="text-[10px] font-semibold uppercase tracking-[0.32em] text-white/85">
                {tour.destination}
              </span>
            </div>
            <h3 className="font-headline text-[26px] font-medium leading-[1.05] tracking-tight transition-transform duration-500 group-hover:-translate-y-0.5 sm:text-[28px]">
              <span className="line-clamp-2">{tour.name}</span>
            </h3>

            {/* Slide-up reveal: meta and CTA fade in on hover */}
            <div className="flex items-end justify-between gap-3 pt-1">
              <div className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.18em] text-white/85">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  {durationLabel}
                </span>
                <span className="text-white/40" aria-hidden>
                  ·
                </span>
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3 w-3 fill-primary text-primary" />
                  {ratingLabel}
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white opacity-0 transition-all duration-500 group-hover:translate-x-0 group-hover:opacity-100 -translate-x-2">
                {t('tours.details')}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        </div>
      </Link>

      {/* Below-image price block, serif numerals, gold accent line */}
      <div className="mt-5 flex items-center justify-between gap-3 px-1">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            {t('featured.from')}
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-headline text-3xl font-medium tracking-tight text-foreground">
              {startingPrice != null ? format(startingPrice) : t('tour.contactUs')}
            </span>
            {startingPrice != null && (
              <span className="text-xs italic text-muted-foreground">/ {t('tour.perPerson')}</span>
            )}
          </div>
          <div className="mt-2 h-px w-10 bg-primary transition-all duration-500 group-hover:w-20" />
        </div>
        <Button
          asChild
          variant="outline"
          className={cn(
            'shrink-0 rounded-none border-0 border-b-2 border-foreground bg-transparent px-0 pb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground transition-all hover:border-primary hover:bg-transparent hover:text-primary',
            isSoldOut && 'opacity-60'
          )}
          aria-disabled={isSoldOut}
        >
          <Link href={`/tours/${tour.slug}`}>
            {t('tours.details')}
            <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </motion.article>
  );
}
