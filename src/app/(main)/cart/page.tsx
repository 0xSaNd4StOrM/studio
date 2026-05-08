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
import { Trash2, ShoppingCart, Lightbulb, Loader2, AlertTriangle } from 'lucide-react';
import { getAiSuggestions } from '@/app/actions';
import { getCartFallbackAddons } from '@/lib/supabase/addons';
import { getCartRoomLookup } from '@/lib/supabase/hotels';
import { RoomCartLine } from '@/components/cart/room-cart-line';
import { CartLineAddonsEditor } from '@/components/cart/cart-line-addons-editor';
import type { CartItem, UpsellItem, Tour, CartAddon, RoomCartAddon } from '@/types';
import { buildCartAddon, defaultAddonSelection } from '@/lib/addons/pricing';
import type { RoomCartItem } from '@/types';
import { format } from 'date-fns';

type CartUpdateTourAddons = (
  productId: string,
  packageId: string | undefined,
  addons: CartAddon[]
) => void;
type CartUpdateRoomItem = (
  lineId: string,
  patch: Partial<Omit<RoomCartItem, 'productType' | 'lineId'>>
) => void;
type CartAddToCart = (
  product: Tour | UpsellItem,
  productType: 'tour' | 'upsell',
  adults?: number,
  children?: number,
  date?: Date,
  quantity?: number,
  packageId?: string,
  packageName?: string,
  addons?: CartAddon[]
) => void;

function pricingModeLabel(mode: UpsellItem['pricingMode']): string {
  switch (mode) {
    case 'per_person':
      return 'per person';
    case 'per_hour':
      return 'per hour';
    case 'per_person_per_hour':
      return 'per person · per hour';
    case 'flat':
    default:
      return 'flat rate';
  }
}

type AttachSuggestionArgs = {
  item: UpsellItem;
  tourItems: Array<CartItem & { product: Tour }>;
  roomItems: Array<Extract<CartItem, { productType: 'room' }>>;
  updateTourItemAddons: CartUpdateTourAddons;
  updateRoomItem: CartUpdateRoomItem;
  addToCart: CartAddToCart;
};

function attachSuggestionToFirstLine({
  item,
  tourItems,
  roomItems,
  updateTourItemAddons,
  updateRoomItem,
  addToCart,
}: AttachSuggestionArgs) {
  const sel = defaultAddonSelection(item, 1);
  const cartAddon = buildCartAddon(item, sel);

  // Prefer placement-targeted lines: room → room, tour → tour, else first.
  const roomTarget =
    item.placement.roomTypeIds.length > 0 || item.placement.hotelIds.length > 0
      ? roomItems.find(
          (r) =>
            item.placement.roomTypeIds.includes(r.roomTypeId) ||
            item.placement.hotelIds.includes(r.hotelId)
        ) ?? roomItems[0]
      : null;
  const tourTarget =
    item.placement.tourIds.length > 0 || item.placement.destinations.length > 0
      ? tourItems.find(
          (t) =>
            item.placement.tourIds.includes(t.product.id) ||
            (t.product.destination && item.placement.destinations.includes(t.product.destination))
        ) ?? tourItems[0]
      : null;

  if (roomTarget) {
    const next: RoomCartAddon[] = [
      ...roomTarget.addons.filter(
        (a) => (a.upsellItemId ?? a.id) !== item.id
      ),
      {
        id: cartAddon.upsellItemId,
        upsellItemId: cartAddon.upsellItemId,
        variantId: cartAddon.variantId,
        name: cartAddon.name,
        variantName: cartAddon.variantName,
        unitPrice: cartAddon.unitPrice,
        pricingMode: cartAddon.pricingMode,
        pax: cartAddon.pax,
        hours: cartAddon.hours,
        quantity: cartAddon.quantity,
        totalPrice: cartAddon.totalPrice,
        currency: cartAddon.currency,
      },
    ];
    const subtotalBase =
      roomTarget.pricePerNightAvg * roomTarget.nights * roomTarget.unitsBooked;
    const addonsSum = next.reduce(
      (acc, a) => acc + (a.totalPrice ?? a.unitPrice * a.quantity),
      0
    );
    updateRoomItem(roomTarget.lineId, {
      addons: next,
      subtotal: subtotalBase + addonsSum,
    });
    return;
  }

  if (tourTarget) {
    const existing =
      tourTarget.productType === 'tour' ? (tourTarget.addons ?? []) : [];
    const next: CartAddon[] = [
      ...existing.filter((a) => a.upsellItemId !== item.id),
      cartAddon,
    ];
    updateTourItemAddons(tourTarget.product.id, tourTarget.packageId, next);
    return;
  }

  // No tour/room context — fall back to a standalone upsell line.
  addToCart(
    item,
    'upsell',
    undefined,
    undefined,
    undefined,
    1,
    cartAddon.variantId,
    cartAddon.variantName
  );
}

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

export default function CartPage() {
  const {
    cartItems,
    removeFromCart,
    removeRoomItem,
    updateRoomItem,
    updateTourItemAddons,
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
  const [suggestionAddons, setSuggestionAddons] = useState<UpsellItem[]>([]);

  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

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
  const tourDestinations = useMemo(
    () =>
      Array.from(
        new Set(tourItems.map((item) => (item.product as Tour).destination).filter(Boolean))
      ),
    [tourItems]
  );
  const tourIds = useMemo(() => tourItems.map((t) => (t.product as Tour).id), [tourItems]);
  const cartRoomTypeIds = useMemo(() => roomItems.map((r) => r.roomTypeId), [roomItems]);
  const cartHotelIds = useMemo(() => roomItems.map((r) => r.hotelId), [roomItems]);

  // Stable string keys so the suggestion fetch doesn't re-run on every render.
  const cartCtxKey = useMemo(
    () =>
      JSON.stringify({
        t: tourIds.slice().sort(),
        d: tourDestinations.slice().sort(),
        r: cartRoomTypeIds.slice().sort(),
        h: cartHotelIds.slice().sort(),
      }),
    [tourIds, tourDestinations, cartRoomTypeIds, cartHotelIds]
  );

  useEffect(() => {
    if (cartItems.length === 0) {
      setSuggestionAddons([]);
      return;
    }
    let cancelled = false;
    void getCartFallbackAddons({
      tourIds,
      destinations: tourDestinations,
      roomTypeIds: cartRoomTypeIds,
      hotelIds: cartHotelIds,
    })
      .then((items) => {
        if (cancelled) return;
        setSuggestionAddons(items);
      })
      .catch(() => {
        if (cancelled) return;
        setSuggestionAddons([]);
      });
    return () => {
      cancelled = true;
    };
    // cartCtxKey captures the deduped, order-stable inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartCtxKey, cartItems.length]);

  // Hide suggestion addons that are already attached to any cart line.
  const attachedUpsellIds = useMemo(() => {
    const ids = new Set<string>();
    for (const item of cartItems) {
      if (item.productType === 'tour') {
        for (const a of item.addons ?? []) ids.add(a.upsellItemId);
      } else if (item.productType === 'room') {
        for (const a of item.addons ?? []) ids.add(a.upsellItemId ?? a.id);
      }
    }
    return ids;
  }, [cartItems]);

  const visibleSuggestions = useMemo(
    () => suggestionAddons.filter((a) => !attachedUpsellIds.has(a.id)),
    [suggestionAddons, attachedUpsellIds]
  );

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

    const base =
      (item.adults || 0) * tier.pricePerAdult + (item.children || 0) * tier.pricePerChild;
    if (item.productType === 'tour') {
      const addonsTotal = (item.addons ?? []).reduce(
        (acc, a) => acc + (a.totalPrice ?? a.unitPrice * a.quantity),
        0
      );
      return base + addonsTotal;
    }
    return base;
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10">
      <section className="relative overflow-hidden rounded-3xl border bg-card">
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
        <Card className="overflow-hidden rounded-3xl border bg-card">
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
            <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-accent/10 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background/70">
                  <Lightbulb className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">{t('cart.tip')}</p>
                  <p className="text-sm text-muted-foreground">{t('cart.tipDesc')}</p>
                </div>
              </div>
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
                <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
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
                      className="overflow-hidden rounded-3xl border bg-card transition-shadow hover:shadow-lg"
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
                                {item.productType === 'tour' && (
                                  <Badge variant="outline">
                                    {(item.product as Tour).destination}
                                  </Badge>
                                )}
                                {item.packageName && (
                                  <Badge variant="outline">{item.packageName}</Badge>
                                )}
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
                            <>
                              <div className="grid gap-2 rounded-2xl border bg-muted/30 p-4 sm:grid-cols-2">
                                <div className="space-y-0.5">
                                  <p className="text-xs font-medium text-muted-foreground">
                                    {t('cart.date')}
                                  </p>
                                  <p className="text-sm font-medium">
                                    {item.date
                                      ? format(new Date(item.date), 'PPP')
                                      : t('cart.notSelected')}
                                  </p>
                                </div>
                                <div className="space-y-0.5">
                                  <p className="text-xs font-medium text-muted-foreground">
                                    {t('cart.guests')}
                                  </p>
                                  <p className="text-sm font-medium">
                                    {(item.adults ?? 0).toString()} Adults,{' '}
                                    {(item.children ?? 0).toString()} Children
                                  </p>
                                </div>
                              </div>
                              <CartLineAddonsEditor
                                kind="tour"
                                tourId={(item.product as Tour).id}
                                destination={(item.product as Tour).destination}
                                defaultPax={(item.adults ?? 0) + (item.children ?? 0) || 1}
                                attached={(item.addons ?? []) as CartAddon[]}
                                onChange={(next) =>
                                  updateTourItemAddons(
                                    (item.product as Tour).id,
                                    item.packageId,
                                    next
                                  )
                                }
                              />
                            </>
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
                    onAddonsChange={(lineId, next: RoomCartAddon[]) => {
                      const subtotalBase =
                        roomItem.pricePerNightAvg * roomItem.nights * roomItem.unitsBooked;
                      const addonsSum = next.reduce(
                        (acc, a) => acc + (a.totalPrice ?? a.unitPrice * a.quantity),
                        0
                      );
                      updateRoomItem(lineId, {
                        addons: next,
                        subtotal: subtotalBase + addonsSum,
                      });
                    }}
                  />
                );
              })}
            </div>
          </div>

          <div className="space-y-6 lg:sticky lg:top-24">
            <Card className="overflow-hidden rounded-3xl border bg-card">
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
                  <div className="flex justify-between text-green-600">
                    <span>
                      {t('cart.discount')} ({promoCode.code})
                    </span>
                    <span>-{formatPrice(getDiscountAmount())}</span>
                  </div>
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
                <div className="grid gap-2 rounded-2xl border bg-muted/30 p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('cart.secureCheckout')}</span>
                    <span className="font-medium">{t('cart.enabled')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('cart.support')}</span>
                    <span className="font-medium">{t('cart.support247')}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button asChild className="w-full" size="lg">
                  <Link href="/checkout">{t('cart.proceedCheckout')}</Link>
                </Button>
                <Button asChild className="w-full" size="lg" variant="outline">
                  <Link href="/tours">{t('cart.addMoreTours')}</Link>
                </Button>
              </CardFooter>
            </Card>

            {visibleSuggestions.length > 0 && (
              <Card className="overflow-hidden rounded-3xl border bg-card">
                <CardHeader>
                  <CardTitle className="text-lg">{t('cart.addMore')}</CardTitle>
                  <CardDescription>{t('cart.enhanceExp')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {visibleSuggestions.map((item) => (
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
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {formatPrice(Number(item.price))} · {pricingModeLabel(item.pricingMode)}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="h-10"
                        onClick={() =>
                          attachSuggestionToFirstLine({
                            item,
                            tourItems,
                            roomItems,
                            updateTourItemAddons,
                            updateRoomItem,
                            addToCart,
                          })
                        }
                      >
                        Attach to my booking
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card className="overflow-hidden rounded-3xl border bg-card">
              <CardHeader>
                <CardTitle className="text-lg">{t('cart.needInspiration')}</CardTitle>
                <CardDescription>{t('cart.getIdeas')}</CardDescription>
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
          </div>
        </div>
      )}
    </div>
  );
}
