'use client';

import { useState, useMemo } from 'react';
import type { Tour, TourDateAvailability, UpsellItem } from '@/types';
import Image from 'next/image';
import { BLUR_DATA_URL } from '@/lib/blur-data-url';
import { useCart } from '@/hooks/use-cart';
import { useCurrency } from '@/hooks/use-currency';
import { useLanguage } from '@/hooks/use-language';

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import {
  Clock,
  MapPin,
  Star,
  Tag,
  Minus,
  Plus,
  ShoppingCart,
  CheckCircle,
  XCircle,
  ShoppingBag,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  AddonPicker,
  selectionToCartAddons,
  type AddonSelectionMap,
} from '@/components/addons/addon-picker';

interface TourDetailsClientProps {
  tour: Tour;
  availability?: TourDateAvailability[];
  addons?: UpsellItem[];
}

export function TourDetailsClient({
  tour,
  availability = [],
  addons = [],
}: TourDetailsClientProps) {
  const { addToCart } = useCart();
  const { format } = useCurrency();
  const { t } = useLanguage();
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [selectedPackageId, setSelectedPackageId] = useState<string | undefined>(
    tour.packages && tour.packages.length > 0 ? tour.packages[0].id : undefined
  );
  const [addonSelection, setAddonSelection] = useState<AddonSelectionMap>({});

  // Build blocked dates set and limited-spots modifiers from availability data
  const blockedDatesSet = useMemo(() => {
    const set = new Set<string>();
    for (const entry of availability) {
      if (entry.isBlocked) set.add(entry.date);
    }
    return set;
  }, [availability]);

  const limitedDates = useMemo(() => {
    return availability
      .filter((e) => !e.isBlocked && e.availableSpots !== null)
      .map((e) => new Date(e.date + 'T00:00:00'));
  }, [availability]);

  const availabilityMap = useMemo(() => {
    const map = new Map<string, TourDateAvailability>();
    for (const entry of availability) {
      map.set(entry.date, entry);
    }
    return map;
  }, [availability]);

  const calendarModifiers = {
    limited: limitedDates,
  };

  const calendarModifiersStyles: Record<string, React.CSSProperties> = {
    limited: {
      backgroundColor: 'hsl(45 93% 47% / 0.15)',
      borderRadius: '6px',
    },
  };

  const isDateDisabled = (d: Date) => {
    // Past dates
    if (d < new Date(new Date().setDate(new Date().getDate() - 1))) return true;
    // Blocked dates
    const dateStr = d.toISOString().split('T')[0];
    return blockedDatesSet.has(dateStr);
  };

  // Get availability info for selected date
  const selectedDateInfo = useMemo(() => {
    if (!date) return null;
    const dateStr = date.toISOString().split('T')[0];
    return availabilityMap.get(dateStr) || null;
  }, [date, availabilityMap]);

  const totalPeople = useMemo(() => adults + children, [adults, children]);

  const currentPackage = useMemo(() => {
    if (!tour.packages || tour.packages.length === 0) return null;
    return tour.packages.find((p) => p.id === selectedPackageId) || tour.packages[0];
  }, [tour.packages, selectedPackageId]);

  const currentPriceTier = useMemo(() => {
    if (!tour) return null;
    // Use package tiers if available, otherwise tour tiers
    const tiers = currentPackage?.priceTiers ?? tour.priceTiers ?? [];
    if (tiers.length === 0) return null;

    return (
      tiers.find(
        (tier) =>
          totalPeople >= tier.minPeople &&
          (tier.maxPeople === null || totalPeople <= tier.maxPeople)
      ) || tiers[tiers.length - 1]
    );
  }, [tour, totalPeople, currentPackage]);

  const tourBasePrice = useMemo(() => {
    if (!currentPriceTier) return 0;
    const adultPrice = adults * currentPriceTier.pricePerAdult;
    const childPrice = children * currentPriceTier.pricePerChild;
    return adultPrice + childPrice;
  }, [adults, children, currentPriceTier]);

  const cartAddons = useMemo(
    () => selectionToCartAddons(addons, addonSelection),
    [addons, addonSelection]
  );

  const addonsTotal = useMemo(
    () => cartAddons.reduce((acc, a) => acc + a.totalPrice, 0),
    [cartAddons]
  );

  const totalPrice = tourBasePrice + addonsTotal;

  const handleBooking = () => {
    if (tour && date) {
      addToCart(
        tour,
        'tour',
        adults,
        children,
        date,
        1,
        selectedPackageId,
        currentPackage?.name,
        cartAddons.length > 0 ? cartAddons : undefined
      );
    }
  };

  return (
    <div className="grid lg:grid-cols-5 gap-12 pb-24 lg:pb-0">
      {/* Left Column: Tour Info */}
      <div className="lg:col-span-3 space-y-8">
        <Card className="overflow-hidden">
          <Carousel className="w-full">
            <CarouselContent>
              {tour.images.map((image, index) => (
                <CarouselItem key={index}>
                  <div className="relative h-64 md:h-96 w-full">
                    <Image
                      src={image}
                      alt={`${tour.name} - image ${index + 1}`}
                      fill
                      className="object-cover"
                      data-ai-hint={`${tour.destination} ${tour.type[0]}`}
                      placeholder="blur"
                      blurDataURL={BLUR_DATA_URL}
                      priority={index === 0}
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="absolute left-4" />
            <CarouselNext className="absolute right-4" />
          </Carousel>
          <CardHeader>
            <CardTitle className="font-headline text-2xl md:text-4xl text-primary">
              {tour.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm mb-6">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" /> <span>{tour.destination}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />{' '}
                <span>{tour.durationText ?? `${tour.duration} days`}</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-primary fill-primary" />{' '}
                <span>{tour.rating}/5.0</span>
              </div>
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-primary" />{' '}
                <span>{tour.tourType ?? tour.type.join(', ')}</span>
              </div>
            </div>
            <Separator className="my-6" />
            <p className="text-muted-foreground mb-6">{tour.description}</p>

            {(tour.includes || tour.excludes) && (
              <>
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  {tour.includes && (
                    <div>
                      <h3 className="font-bold text-lg mb-2 text-green-700">
                        {t('tour.includes')}
                      </h3>
                      <ul className="space-y-2 text-sm">
                        {tour.includes.map((item, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span>
                              {(() => {
                                try {
                                  const parsed = JSON.parse(item);
                                  return parsed.value || item;
                                } catch {
                                  return item;
                                }
                              })()}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {tour.excludes && (
                    <div>
                      <h3 className="font-bold text-lg mb-2 text-destructive">
                        {t('tour.excludes')}
                      </h3>
                      <ul className="space-y-2 text-sm">
                        {tour.excludes.map((item, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <XCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                            <span>
                              {(() => {
                                try {
                                  const parsed = JSON.parse(item);
                                  return parsed.value || item;
                                } catch {
                                  return item;
                                }
                              })()}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </>
            )}

            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-xl text-primary">{t('tour.details')}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>
                  <span className="font-semibold text-foreground">{t('tour.durationLabel')}</span>{' '}
                  {tour.durationText ?? `${tour.duration} days`}
                </p>
                <p>
                  <span className="font-semibold text-foreground">{t('tour.typeLabel')}</span>{' '}
                  {tour.tourType ?? tour.type.join(', ')}
                </p>
                {tour.availabilityDescription && (
                  <p>
                    <span className="font-semibold text-foreground">
                      {t('tour.availabilityLabel')}
                    </span>{' '}
                    {tour.availabilityDescription}
                  </p>
                )}
                {tour.pickupAndDropoff && (
                  <p>
                    <span className="font-semibold text-foreground">{t('tour.pickupDropoff')}</span>{' '}
                    {tour.pickupAndDropoff}
                  </p>
                )}
              </CardContent>
            </Card>
          </CardContent>
        </Card>

        {tour.itinerary && tour.itinerary.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-2xl md:text-3xl">
                {t('tour.itinerary')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tour.itinerary.map((item) => (
                  <div key={item.day} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                        {item.day}
                      </div>
                      {item.day !== tour.itinerary.length && (
                        <div className="w-px flex-grow bg-border"></div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-primary">
                        {t('tour.dayLabel')} {item.day}
                      </h3>
                      <p className="text-muted-foreground">{item.activity}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {tour.cancellationPolicy && (
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-2xl md:text-3xl">
                {t('tour.cancellationPolicy')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">{tour.cancellationPolicy}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right Column: Pricing & Booking */}
      <div className="lg:col-span-2">
        <div className="lg:sticky top-24 space-y-6">
          {tour.highlights && (
            <Card>
              <CardHeader>
                <CardTitle className="font-headline text-2xl md:text-3xl">
                  {t('tour.highlights')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  {tour.highlights.map((highlight, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">
                        {(() => {
                          try {
                            const parsed = JSON.parse(highlight);
                            return parsed.value || highlight;
                          } catch {
                            return highlight;
                          }
                        })()}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-2xl md:text-3xl">
                {t('tour.pricing')}
              </CardTitle>
              {currentPackage && (
                <p className="text-sm text-muted-foreground">
                  {t('tour.showingPricesFor')}{' '}
                  <span className="font-semibold">{currentPackage.name}</span>
                </p>
              )}
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-semibold">{t('tour.groupSize')}</th>
                    <th className="text-center py-2 font-semibold">{t('tour.adult')}</th>
                    <th className="text-center py-2 font-semibold">{t('tour.child')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(currentPackage ? currentPackage.priceTiers : tour.priceTiers).map(
                    (tier, index) => (
                      <tr
                        key={index}
                        className={`border-b ${tier.minPeople === currentPriceTier?.minPeople ? 'bg-primary/10' : ''}`}
                      >
                        <td className="py-2 font-medium">
                          {tier.minPeople}
                          {tier.maxPeople ? ` - ${tier.maxPeople}` : '+'} {t('tour.persons')}
                        </td>
                        <td className="py-2 text-center">{format(tier.pricePerAdult)}</td>
                        <td className="py-2 text-center">{format(tier.pricePerChild)}</td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
              <p className="text-xs text-muted-foreground mt-2">{t('tour.infantsFree')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-2xl md:text-3xl">
                {t('tour.bookSpot')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {tour.packages && tour.packages.length > 0 && (
                <div>
                  <Label className="font-semibold mb-2 block">{t('tour.selectPackage')}</Label>
                  <RadioGroup
                    value={selectedPackageId}
                    onValueChange={setSelectedPackageId}
                    className="grid gap-2"
                  >
                    {tour.packages.map((pkg) => (
                      <div key={pkg.id}>
                        <RadioGroupItem value={pkg.id} id={pkg.id} className="peer sr-only" />
                        <Label
                          htmlFor={pkg.id}
                          className="flex flex-col items-start justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
                        >
                          <div className="font-semibold text-sm">{pkg.name}</div>
                          {pkg.description && (
                            <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {pkg.description}
                            </div>
                          )}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}

              <div>
                <Label className="font-semibold mb-2 block">{t('tour.selectDate')}</Label>
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  className="rounded-md border"
                  disabled={isDateDisabled}
                  modifiers={calendarModifiers}
                  modifiersStyles={calendarModifiersStyles}
                />
                {selectedDateInfo &&
                  !selectedDateInfo.isBlocked &&
                  selectedDateInfo.availableSpots !== null && (
                    <p className="mt-2 text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                      {selectedDateInfo.availableSpots}{' '}
                      {selectedDateInfo.availableSpots === 1
                        ? t('tour.spot')
                        : t('tour.spotsRemaining')}
                    </p>
                  )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="adults" className="font-semibold">
                    {t('tour.adults')}
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setAdults((v) => Math.max(1, v - 1))}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      id="adults"
                      type="text"
                      readOnly
                      value={adults}
                      className="w-12 text-center"
                    />
                    <Button variant="outline" size="icon" onClick={() => setAdults((v) => v + 1)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="children" className="font-semibold">
                    {t('tour.children')}
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setChildren((v) => Math.max(0, v - 1))}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      id="children"
                      type="text"
                      readOnly
                      value={children}
                      className="w-12 text-center"
                    />
                    <Button variant="outline" size="icon" onClick={() => setChildren((v) => v + 1)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              {addons.length > 0 && (
                <div className="rounded-2xl border bg-muted/20 p-3">
                  <AddonPicker
                    addons={addons}
                    selected={addonSelection}
                    onChange={setAddonSelection}
                    defaultPax={adults + children}
                  />
                </div>
              )}
              <Separator />
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('tour.adultsPrice')}</span>
                  <span>
                    {adults} x {format(currentPriceTier?.pricePerAdult ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('tour.childrenPrice')}</span>
                  <span>
                    {children} x {format(currentPriceTier?.pricePerChild ?? 0)}
                  </span>
                </div>
                {addonsTotal > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Extras</span>
                    <span>{format(addonsTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-xl text-primary pt-2">
                  <span>{t('tour.totalPrice')}</span>
                  <span>{format(totalPrice)}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleBooking} className="w-full" size="lg" disabled={!date}>
                <ShoppingCart className="mr-2 h-5 w-5" />
                {!date ? t('tour.selectDateFirst') : t('tour.addToCart')}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* ── Mobile sticky Book Now bar ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <div>
            {date ? (
              <>
                <p className="text-xs text-muted-foreground">{t('tour.totalLabel')}</p>
                <p className="text-lg font-bold text-primary">{format(totalPrice)}</p>
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">{t('tour.fromLabel')}</p>
                <p className="text-lg font-bold text-primary">
                  {format(
                    Math.min(
                      ...(currentPackage ? currentPackage.priceTiers : tour.priceTiers)
                        .map((t) => t.pricePerAdult)
                        .filter((p) => typeof p === 'number')
                    )
                  )}
                </p>
              </>
            )}
          </div>
          <Button
            onClick={handleBooking}
            size="lg"
            disabled={!date}
            className="flex-1 max-w-xs gap-2"
          >
            <ShoppingBag className="h-4 w-4" />
            {date
              ? `${t('tour.bookNow')} · ${adults + children} ${adults + children === 1 ? t('tour.person') : t('tour.people')}`
              : t('tour.selectDateMobile')}
          </Button>
        </div>
      </div>
    </div>
  );
}
