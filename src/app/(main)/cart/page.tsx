'use client';

import React, { useActionState, useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useFormStatus } from 'react-dom';
import { useCart } from '@/hooks/use-cart';
import { useCurrency } from '@/hooks/use-currency';
import { useLanguage } from '@/hooks/use-language';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Trash2,
  ShoppingCart,
  Lightbulb,
  Loader2,
  PlusCircle,
  AlertTriangle,
  Minus,
  Plus,
  ShieldCheck,
  Clock,
  X,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAiSuggestions } from '@/app/actions';
import { getUpsellItems } from '@/lib/supabase/upsell-items';
import { getPublicAgencyReviewStats } from '@/lib/supabase/reviews';
import { getCartTourSpotsRemaining } from '@/lib/supabase/tour-availability';
import { getCartRoomLookup } from '@/lib/supabase/hotels';
import { RoomCartLine } from '@/components/cart/room-cart-line';
import type { CartItem, UpsellItem, Tour } from '@/types';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function SubmitButton() {
  const { pending } = useFormStatus();
  const { t } = useLanguage();
  return (
    <Button type="submit" disabled={pending} className="h-11 w-full justify-center">
      {pending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Lightbulb className="mr-2 h-4 w-4" />
      )}
      {t('cart.aiSuggestions')}
    </Button>
  );
}

function QuantityStepper({
  label,
  value,
  min,
  max = 20,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  const canDec = value > min;
  const canInc = value < max;
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="inline-flex items-center gap-2 rounded-full border bg-background px-1 py-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full"
          disabled={!canDec}
          onClick={() => onChange(value - 1)}
          aria-label={`Decrease ${label}`}
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <span className="min-w-[1.5rem] text-center text-sm font-semibold">{value}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full"
          disabled={!canInc}
          onClick={() => onChange(value + 1)}
          aria-label={`Increase ${label}`}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

/**
 * Tiny live countdown for a promo code's `expiresAt`.
 *
 * - Returns null when there's no expiry, the expiry already passed, or
 *   it's more than 7 days away (no urgency yet).
 * - Within 24 hours: shows hours/minutes counting down (re-renders every
 *   30 s — sub-minute precision is overkill).
 * - 1–7 days out: shows "Expires in N days".
 */
function PromoExpiryNotice({ expiresAt }: { expiresAt?: string }) {
  const [, force] = useState(0);

  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => force((n) => n + 1), 30_000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (!expiresAt) return null;
  const exp = new Date(expiresAt);
  const ms = exp.getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  if (ms > SEVEN_DAYS) return null;

  const hours = Math.floor(ms / (60 * 60 * 1000));
  const days = Math.floor(hours / 24);
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));

  let label: string;
  if (hours < 1) {
    label = `Expires in ${minutes} minute${minutes === 1 ? '' : 's'}`;
  } else if (hours < 24) {
    label = `Expires in ${hours}h ${minutes}m`;
  } else {
    label = `Expires in ${days} day${days === 1 ? '' : 's'}`;
  }

  return (
    <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
      <Clock className="h-3 w-3" />
      {label} — lock it in now.
    </p>
  );
}

export default function CartPage() {
  const {
    cartItems,
    removeFromCart,
    removeRoomItem,
    updateTourItem,
    getCartTotal,
    addToCart,
    clearCart,
    applyPromoCode,
    removePromoCode,
    getDiscountAmount,
    getFinalTotal,
    promoCode,
  } = useCart();
  const { format: formatPrice } = useCurrency();
  const { t } = useLanguage();
  const [state, formAction] = useActionState(getAiSuggestions, {
    message: '',
    suggestions: [],
  });
  const [upsellItems, setUpsellItems] = useState<UpsellItem[]>([]);
  const [selectedUpsellVariant, setSelectedUpsellVariant] = useState<Record<string, string>>({});
  const [reviewStats, setReviewStats] = useState<{ average: number; count: number } | null>(null);
  /** Map keyed `${tourId}|${date}` → spots remaining. Drives "Only N spots left" pills. */
  const [tourSpotsRemaining, setTourSpotsRemaining] = useState<Record<string, number>>({});

  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [aiSuggestionsDismissed, setAiSuggestionsDismissed] = useState(false);

  const handleApplyPromo = async () => {
    if (!promoCodeInput) return;
    setIsApplyingPromo(true);
    try {
      await applyPromoCode(promoCodeInput);
      setPromoCodeInput('');
    } catch {
      // Toast handled in hook
    } finally {
      setIsApplyingPromo(false);
    }
  };

  useEffect(() => {
    const fetchUpsells = async () => {
      const items = await getUpsellItems();
      setUpsellItems(items);
    };
    fetchUpsells();

    // Best-effort social proof — failures stay silent (the snippet just won't render).
    getPublicAgencyReviewStats()
      .then((stats) => setReviewStats(stats))
      .catch(() => undefined);
  }, []);

  // Fetch remaining-spots for each tour item currently in the cart.
  // Re-runs when items are added/removed or their dates change.
  const tourSpotsLookupKey = useMemo(() => {
    return cartItems
      .filter((i): i is Extract<CartItem, { productType: 'tour' }> => i.productType === 'tour')
      .filter((i) => i.date)
      .map((i) => `${i.product.id}|${new Date(i.date as Date).toISOString().split('T')[0]}`)
      .sort()
      .join(',');
  }, [cartItems]);

  useEffect(() => {
    if (!tourSpotsLookupKey) {
      setTourSpotsRemaining({});
      return;
    }
    const pairs = tourSpotsLookupKey.split(',').map((entry) => {
      const [tourId, date] = entry.split('|');
      return { tourId, date };
    });
    let cancelled = false;
    getCartTourSpotsRemaining(pairs)
      .then((res) => {
        if (!cancelled) setTourSpotsRemaining(res);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [tourSpotsLookupKey]);

  const roomItems = useMemo(
    () =>
      cartItems.filter(
        (i): i is Extract<CartItem, { productType: 'room' }> => i.productType === 'room'
      ),
    [cartItems]
  );

  const roomHotelIds = useMemo(
    () => Array.from(new Set(roomItems.map((i) => i.hotelId))),
    [roomItems]
  );

  const [hotelLookup, setHotelLookup] = useState<{
    hotels: Record<string, { name: string; slug: string }>;
    singleHotelMode: boolean;
  }>({ hotels: {}, singleHotelMode: false });

  useEffect(() => {
    if (roomHotelIds.length === 0) {
      setHotelLookup({ hotels: {}, singleHotelMode: false });
      return;
    }
    let cancelled = false;
    void getCartRoomLookup(roomHotelIds)
      .then((res) => {
        if (cancelled) return;
        const map: Record<string, { name: string; slug: string }> = {};
        for (const h of res.hotels) map[h.id] = { name: h.name, slug: h.slug };
        setHotelLookup({ hotels: map, singleHotelMode: res.singleHotelMode });
      })
      .catch(() => {
        // Non-blocking; cart still renders without hotel name/edit link.
      });
    return () => {
      cancelled = true;
    };
  }, [roomHotelIds]);

  const currencyWarning = useMemo(() => {
    const set = new Set(roomItems.map((i) => i.currency));
    return set.size > 1 ? Array.from(set).join(', ') : null;
  }, [roomItems]);

  const tourItems = cartItems.filter((item) => item.productType === 'tour') as Array<
    CartItem & { product: Tour }
  >;
  const tourDestinations = Array.from(
    new Set(tourItems.map((item) => (item.product as Tour).destination).filter(Boolean))
  );

  const isUpsellEligible = (upsell: UpsellItem) => {
    if (!upsell.isActive) return false;
    const targeting = upsell.targeting;
    if (!targeting) return true;

    const match = targeting.match ?? 'any';
    const requiredDestinations = (targeting.destinations ?? []).filter(Boolean);
    const requiredTourIds = (targeting.tourIds ?? []).filter(Boolean);

    if (requiredDestinations.length === 0 && requiredTourIds.length === 0) return true;

    const checks: boolean[] = [];
    if (requiredDestinations.length > 0) {
      checks.push(requiredDestinations.some((d) => tourDestinations.includes(d)));
    }
    if (requiredTourIds.length > 0) {
      checks.push(
        requiredTourIds.some((id) => tourItems.some((t) => (t.product as Tour).id === id))
      );
    }

    return match === 'all' ? checks.every(Boolean) : checks.some(Boolean);
  };

  const getUpsellDisplay = (upsell: UpsellItem) => {
    const selected = selectedUpsellVariant[upsell.id] ?? '__base__';
    const variantId = selected === '__base__' ? undefined : selected;
    const variant =
      variantId && upsell.variants ? upsell.variants.find((v) => v.id === variantId) : undefined;
    return {
      variantId,
      variantName: variant?.name,
      price: variant?.price ?? upsell.price,
    };
  };

  const tourDescriptions = cartItems
    .filter((item) => item.productType === 'tour')
    .map((item) => (item.product as Tour).description);

  const getCartItemKey = (item: CartItem) =>
    `${item.productType}-${item.product.id}-${item.packageId ?? 'base'}`;

  const getItemTotal = (item: CartItem) => {
    if (item.productType === 'upsell') {
      const upsell = item.product as UpsellItem;
      const variant =
        item.packageId && upsell.variants
          ? upsell.variants.find((v) => v.id === item.packageId)
          : undefined;
      const price = variant?.price ?? upsell.price;
      return price * (item.quantity || 1);
    }

    const tour = item.product as Tour;
    const pkg =
      item.packageId && tour.packages ? tour.packages.find((p) => p.id === item.packageId) : null;
    const tiers = pkg ? pkg.priceTiers : tour.priceTiers;
    const totalPeople = (item.adults || 0) + (item.children || 0);
    const tier =
      tiers.find(
        (t) => totalPeople >= t.minPeople && (t.maxPeople === null || totalPeople <= t.maxPeople)
      ) || tiers[tiers.length - 1];

    return (item.adults || 0) * tier.pricePerAdult + (item.children || 0) * tier.pricePerChild;
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 pb-[calc(theme(spacing.28)+env(safe-area-inset-bottom))] lg:pb-0">
      <section className="relative overflow-hidden rounded-2xl border bg-card">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
        <div className="relative p-6 md:p-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3">
              <Badge variant="secondary" className="w-fit">
                {t('cart.badge')}
              </Badge>
              <h1 className="font-headline text-4xl font-bold tracking-tight text-foreground md:text-5xl">
                {t('cart.title')}
              </h1>
              <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
                {t('cart.subtitle')}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" variant="outline">
                <Link href="/tours">{t('cart.continueShopping')}</Link>
              </Button>
              <Button asChild size="lg">
                <Link href="/checkout">{t('cart.checkoutBtn')}</Link>
              </Button>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border bg-background/70 p-4">
              <p className="text-sm font-medium">{t('cart.step1')}</p>
              <p className="text-sm text-muted-foreground">{t('cart.stateCart')}</p>
            </div>
            <div className="rounded-2xl border bg-background/70 p-4">
              <p className="text-sm font-medium">{t('cart.step2')}</p>
              <p className="text-sm text-muted-foreground">{t('cart.stateCheckout')}</p>
            </div>
            <div className="rounded-2xl border bg-background/70 p-4">
              <p className="text-sm font-medium">{t('cart.step3')}</p>
              <p className="text-sm text-muted-foreground">{t('cart.stateConfirmation')}</p>
            </div>
          </div>
        </div>
      </section>

      {cartItems.length === 0 ? (
        <Card className="overflow-hidden rounded-2xl border bg-card">
          <CardContent className="grid gap-8 p-8 md:grid-cols-2 md:p-10">
            <div className="space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ShoppingCart className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight">{t('cart.empty')}</h2>
                <p className="text-muted-foreground">{t('cart.emptyDesc')}</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/tours">{t('cart.exploreTours')}</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/destination">{t('cart.browseDestinations')}</Link>
                </Button>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-accent/10 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background/70">
                  <Lightbulb className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">How it works</p>
                  <p className="text-sm text-muted-foreground">
                    Three steps to lock in your trip.
                  </p>
                </div>
              </div>
              <ol className="space-y-3 text-sm">
                {[
                  { n: 1, title: 'Pick a tour or stay', desc: 'Tap "Details" on any card to view.' },
                  { n: 2, title: 'Add to cart', desc: 'Choose date, package, and guests.' },
                  { n: 3, title: 'Confirm & pay', desc: 'Cash on arrival or secure card.' },
                ].map((step) => (
                  <li key={step.n} className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">
                      {step.n}
                    </span>
                    <div className="space-y-0.5">
                      <p className="font-semibold leading-tight">{step.title}</p>
                      <p className="text-xs text-muted-foreground leading-tight">{step.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-8 lg:grid-cols-3 lg:items-start">
          <div className="space-y-6 lg:col-span-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold tracking-tight">
                  {t('cart.items')}{' '}
                  <span className="text-muted-foreground">({cartItems.length})</span>
                </h2>
                <p className="text-sm text-muted-foreground">{t('cart.doubleCheck')}</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={clearCart}>
                  {t('cart.clearCart')}
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {currencyWarning ? (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/40 dark:border-amber-700 dark:text-amber-100">
                  <AlertTriangle className="mt-0.5 h-4 w-4" />
                  <span>
                    Your cart contains items in multiple currencies ({currencyWarning}). Totals are
                    displayed in your selected currency; the agency will charge in its primary
                    currency at checkout.
                  </span>
                </div>
              ) : null}
              {cartItems
                .filter(
                  (item): item is Exclude<typeof item, { productType: 'room' }> =>
                    item.productType !== 'room'
                )
                .map((item) => {
                  const imageSrc =
                    item.productType === 'tour'
                      ? (item.product as Tour).images?.[0] || '/placeholder.png'
                      : (item.product as UpsellItem).imageUrl || '/placeholder-upsell.png';
                  const itemTotal = getItemTotal(item);

                  return (
                    <Card
                      key={getCartItemKey(item)}
                      className="overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-lg"
                    >
                      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-5">
                        <div className="relative h-44 w-full overflow-hidden rounded-2xl border sm:h-28 sm:w-40">
                          <Image
                            src={imageSrc}
                            alt={item.product.name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 100vw, 160px"
                            data-ai-hint={`${item.product.name} egypt`}
                          />
                        </div>

                        <div className="flex-1 space-y-2">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="space-y-1">
                              <p className="text-lg font-semibold leading-snug">
                                {item.product.name}
                              </p>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="secondary">
                                  {item.productType === 'tour'
                                    ? t('cart.tourBadge')
                                    : t('cart.addonBadge')}
                                </Badge>
                                {item.productType === 'tour' &&
                                  (() => {
                                    const tour = item.product as Tour;
                                    const list =
                                      tour.destinations && tour.destinations.length > 0
                                        ? tour.destinations
                                        : tour.destination
                                          ? [tour.destination]
                                          : [];
                                    if (list.length === 0) return null;
                                    return (
                                      <Badge variant="outline">
                                        {list.length > 1 ? list.join(' · ') : list[0]}
                                      </Badge>
                                    );
                                  })()}
                                {item.packageName && (
                                  <Badge variant="outline">{item.packageName}</Badge>
                                )}
                                {item.productType === 'tour' &&
                                  item.date &&
                                  (() => {
                                    const dateStr = new Date(item.date as Date)
                                      .toISOString()
                                      .split('T')[0];
                                    const spots =
                                      tourSpotsRemaining[`${item.product.id}|${dateStr}`];
                                    if (spots == null || spots <= 0 || spots > 6) return null;
                                    return (
                                      <Badge
                                        variant="secondary"
                                        className="bg-amber-100 text-amber-900 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-200"
                                      >
                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                        Only {spots} spot{spots === 1 ? '' : 's'} left
                                      </Badge>
                                    );
                                  })()}
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-start">
                              <p className="text-lg font-semibold text-primary">
                                {formatPrice(itemTotal)}
                              </p>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  removeFromCart(item.product.id, item.productType, item.packageId)
                                }
                              >
                                <Trash2 className="h-5 w-5 text-destructive" />
                                <span className="sr-only">Remove item</span>
                              </Button>
                            </div>
                          </div>

                          {item.productType === 'tour' && (
                            <div className="grid gap-3 rounded-2xl border bg-muted/30 p-4 sm:grid-cols-3">
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">
                                  {t('cart.date')}
                                </p>
                                <p className="text-sm font-medium">
                                  {item.date
                                    ? format(new Date(item.date), 'PPP')
                                    : t('cart.notSelected')}
                                </p>
                              </div>
                              <QuantityStepper
                                label="Adults"
                                value={item.adults ?? 1}
                                min={1}
                                onChange={(v) =>
                                  updateTourItem(item.product.id, item.packageId, { adults: v })
                                }
                              />
                              <QuantityStepper
                                label="Children"
                                value={item.children ?? 0}
                                min={0}
                                onChange={(v) =>
                                  updateTourItem(item.product.id, item.packageId, { children: v })
                                }
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              {roomItems.map((roomItem) => {
                const hotel = hotelLookup.hotels[roomItem.hotelId];
                return (
                  <RoomCartLine
                    key={roomItem.lineId}
                    item={roomItem}
                    hotelName={hotel?.name}
                    hotelSlug={hotel?.slug}
                    linkContext={{ singleHotelMode: hotelLookup.singleHotelMode }}
                    onRemove={removeRoomItem}
                  />
                );
              })}
            </div>
          </div>

          <div className="space-y-6 lg:sticky lg:top-24">
            <Card className="overflow-hidden rounded-2xl border bg-card">
              <CardHeader>
                <CardTitle>{t('cart.orderSummary')}</CardTitle>
                <CardDescription>
                  {cartItems.length} item{cartItems.length === 1 ? '' : 's'} in your cart
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('cart.subtotal')}</span>
                  <span className="font-medium">{formatPrice(getCartTotal())}</span>
                </div>

                {promoCode ? (
                  <>
                    <div className="flex justify-between text-green-600 dark:text-green-400">
                      <span>
                        {t('cart.discount')} ({promoCode.code})
                      </span>
                      <span>-{formatPrice(getDiscountAmount())}</span>
                    </div>
                    <PromoExpiryNotice expiresAt={promoCode.expiresAt} />
                  </>
                ) : null}

                <div className="flex gap-2">
                  <Input
                    placeholder={t('cart.promoPlaceholder')}
                    value={promoCodeInput}
                    onChange={(e) => setPromoCodeInput(e.target.value)}
                    disabled={!!promoCode}
                    className="bg-background"
                  />
                  {promoCode ? (
                    <Button variant="outline" onClick={removePromoCode}>
                      {t('cart.remove')}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleApplyPromo}
                      disabled={!promoCodeInput || isApplyingPromo}
                      variant="outline"
                    >
                      {isApplyingPromo ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        t('cart.apply')
                      )}
                    </Button>
                  )}
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('cart.taxesFees')}</span>
                  <span className="text-sm text-muted-foreground">{t('cart.taxesCalc')}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>{t('cart.total')}</span>
                  <span>{formatPrice(getFinalTotal())}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 rounded-2xl border bg-muted/30 p-3 text-xs">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-green-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold leading-tight">{t('cart.secureCheckout')}</p>
                      <p className="text-muted-foreground leading-tight">{t('cart.enabled')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold leading-tight">{t('cart.support')}</p>
                      <p className="text-muted-foreground leading-tight">{t('cart.support247')}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                {reviewStats && reviewStats.count >= 3 && (
                  <div className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                    <div className="flex items-center gap-0.5" aria-hidden>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            'h-3.5 w-3.5',
                            i < Math.round(reviewStats.average)
                              ? 'fill-amber-500 text-amber-500'
                              : 'fill-amber-200 text-amber-200 dark:fill-amber-900 dark:text-amber-900'
                          )}
                        />
                      ))}
                    </div>
                    <span className="font-semibold">{reviewStats.average.toFixed(1)}</span>
                    <span className="text-amber-800/80 dark:text-amber-200/80">
                      from {reviewStats.count.toLocaleString()} happy travelers
                    </span>
                  </div>
                )}
                <Button asChild className="w-full" size="lg">
                  <Link href="/checkout">{t('cart.proceedCheckout')}</Link>
                </Button>
                <Button asChild className="w-full" size="lg" variant="outline">
                  <Link href="/tours">{t('cart.addMoreTours')}</Link>
                </Button>
                <p className="text-center text-[11px] text-muted-foreground">
                  <Link
                    href="/policy-security"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    Flexible cancellation policy
                  </Link>{' '}
                  · No card charged until we confirm
                </p>
              </CardFooter>
            </Card>

            {upsellItems.length > 0 && (
              <Card className="overflow-hidden rounded-2xl border bg-card">
                <CardHeader>
                  <CardTitle className="text-lg">{t('cart.addMore')}</CardTitle>
                  <CardDescription>{t('cart.enhanceExp')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {upsellItems.filter(isUpsellEligible).map((item) => {
                    const display = getUpsellDisplay(item);
                    const selectValue = display.variantId ?? '__base__';
                    const alreadyInCart = cartItems.some(
                      (cartItem) =>
                        cartItem.product.id === item.id &&
                        cartItem.productType === 'upsell' &&
                        (cartItem.packageId ?? 'base') === (display.variantId ?? 'base')
                    );

                    return (
                      <div
                        key={item.id}
                        className="grid gap-3 rounded-2xl border bg-background p-4"
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border">
                            <Image
                              src={item.imageUrl || '/placeholder-upsell.png'}
                              alt={item.name}
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold leading-snug">{item.name}</p>
                            {item.description ? (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {item.description}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        <div className="grid w-full gap-2">
                          {item.variants && item.variants.length > 0 ? (
                            <Select
                              value={selectValue}
                              onValueChange={(value) =>
                                setSelectedUpsellVariant((prev) => ({ ...prev, [item.id]: value }))
                              }
                            >
                              <SelectTrigger className="h-11 w-full min-w-0">
                                <SelectValue placeholder={t('cart.selectOption')} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__base__">{t('cart.base')}</SelectItem>
                                {(item.variants ?? [])
                                  .filter(
                                    (
                                      variant
                                    ): variant is { id: string; name: string; price: number } =>
                                      Boolean(variant.id)
                                  )
                                  .map((variant) => (
                                    <SelectItem key={variant.id} value={variant.id}>
                                      {variant.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          ) : null}
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="min-w-0 break-words text-sm font-semibold text-primary">
                              {formatPrice(display.price)}
                            </span>
                            <Button
                              size="sm"
                              className="h-11 flex-1 px-3"
                              onClick={() =>
                                addToCart(
                                  item,
                                  'upsell',
                                  undefined,
                                  undefined,
                                  undefined,
                                  1,
                                  display.variantId,
                                  display.variantName
                                )
                              }
                              disabled={alreadyInCart}
                            >
                              <PlusCircle className="mr-1 h-4 w-4" /> {t('cart.addBtn')}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {!aiSuggestionsDismissed && (
            <Card className="overflow-hidden rounded-2xl border bg-card">
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                <div>
                  <CardTitle className="text-lg">{t('cart.needInspiration')}</CardTitle>
                  <CardDescription>{t('cart.getIdeas')}</CardDescription>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 -mr-2 -mt-1 shrink-0"
                  onClick={() => setAiSuggestionsDismissed(true)}
                  aria-label="Dismiss AI suggestions"
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <form action={formAction} className="grid gap-3">
                  {tourDescriptions.map((desc, i) => (
                    <input type="hidden" key={i} name="descriptions" value={desc} />
                  ))}
                  <SubmitButton />
                  <Button asChild variant="outline" className="h-11 w-full justify-center">
                    <Link href="/tours">{t('cart.browseToursBtn')}</Link>
                  </Button>
                </form>
                {state.suggestions && state.suggestions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">{t('cart.hereAreIdeas')}</h4>
                    <div className="grid gap-2">
                      {state.suggestions.map((suggestion, index) => (
                        <div key={index} className="rounded-2xl border bg-muted/30 p-3 text-sm">
                          {suggestion}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {state.message && state.message !== 'Success' && (
                  <p className="text-sm text-destructive">{state.message}</p>
                )}
              </CardContent>
            </Card>
            )}
          </div>
        </div>
      )}

      {cartItems.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 py-3 pb-[max(theme(spacing.3),env(safe-area-inset-bottom))] shadow-lg backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{t('cart.total')}</p>
              <p className="text-lg font-bold text-primary">{formatPrice(getFinalTotal())}</p>
            </div>
            <Button asChild size="lg" className="shrink-0">
              <Link href="/checkout">{t('cart.checkoutBtn')}</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
