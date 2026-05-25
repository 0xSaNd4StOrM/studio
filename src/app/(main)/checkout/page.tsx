'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  X,
  Tag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MagneticWrap } from '@/components/motion';
import { CountrySelect } from '@/components/country-select';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useCart } from '@/hooks/use-cart';
import { useCurrency } from '@/hooks/use-currency';
import { useLanguage } from '@/hooks/use-language';
import { useToast } from '@/hooks/use-toast';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

import { TrustBadges } from '@/components/trust-badges';
import { RoomCartLine } from '@/components/cart/room-cart-line';
import { CheckoutStepper, type CheckoutStep } from '@/components/checkout/checkout-stepper';
import { CrossSellRail, type CrossSellContext } from '@/components/cross-sell-rail';
import { AbandonedCartCapture } from '@/components/abandoned-cart-capture';
import { HoldTimer } from '@/components/hold-timer';

import { createBooking } from '@/lib/supabase/bookings';
import { classifyCheckoutError } from '@/lib/checkout-errors';
import { buildKashierHppUrl } from '@/lib/kashier';
import { getCheckoutPaymentMethodAvailability } from '@/lib/supabase/agency-content';
import { getCartRoomLookup } from '@/lib/supabase/hotels';
import { getUpsellItems } from '@/lib/supabase/upsell-items';
import { getRoomAddons } from '@/lib/supabase/room-pricing';

import type { CartItem, RoomCartAddon, Tour, UpsellItem } from '@/types';
import type { RoomAddon } from '@/types/hotel';

// ---------------------------------------------------------------------------
// Constants & helpers (unchanged from previous implementation)
// ---------------------------------------------------------------------------

type RedirectStatus = 'idle' | 'preparing' | 'redirecting';

const PROVISIONAL_ID_KEY_PREFIX = 'tourista:checkout:provisionalId:';
const LAST_SUBMIT_KEY = 'tourista:checkout:lastSubmitAt';
const RESUBMIT_GUARD_MS = 4000;

function djb2Hash(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

function computeCartFingerprint(items: CartItem[], promoCodeValue: string | null): string {
  const normalized = items.map((i) => {
    if (i.productType === 'room') {
      return {
        t: 'room' as const,
        l: i.lineId,
        r: i.roomTypeId,
        ci: i.checkInDate,
        co: i.checkOutDate,
        u: i.unitsBooked,
        a: i.adults,
        c: i.children,
        ad: i.addons.map((x) => `${x.id}:${x.quantity}`).sort(),
      };
    }
    return {
      t: i.productType,
      p: i.product.id,
      k: i.packageId ?? null,
      a: i.adults ?? null,
      c: i.children ?? null,
      q: i.quantity ?? null,
      d: i.date ? new Date(i.date).toISOString() : null,
    };
  });
  return djb2Hash(JSON.stringify({ items: normalized, promo: promoCodeValue }));
}

function getOrCreateProvisionalBookingId(fingerprint: string): string {
  const key = `${PROVISIONAL_ID_KEY_PREFIX}${fingerprint}`;
  if (typeof window === 'undefined') {
    return crypto.randomUUID();
  }
  try {
    const existing = window.sessionStorage.getItem(key);
    if (existing) return existing;
    const next = crypto.randomUUID();
    window.sessionStorage.setItem(key, next);
    return next;
  } catch {
    return crypto.randomUUID();
  }
}

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  email: z.string().email('Invalid email address.'),
  phoneNumber: z
    .string()
    .min(10, 'Phone number is required.')
    .regex(/^\+?[0-9\s\-()]*$/, 'Invalid phone number format.'),
  nationality: z.string().min(2, 'Nationality is required.'),
  paymentMethod: z.enum(['cash', 'online']),
});

type FormValues = z.infer<typeof formSchema>;
type PaymentMethod = FormValues['paymentMethod'];

/** Fields validated when leaving step 0 (Guest details). */
const GUEST_GATE_FIELDS = ['name', 'email', 'phoneNumber', 'nationality'] as const;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CheckoutPage() {
  const {
    cartItems,
    getCartTotal,
    getDiscountAmount,
    getFinalTotal,
    promoCode,
    applyPromoCode,
    removePromoCode,
    addToCart,
    updateRoomItem,
    refreshRoomHold,
  } = useCart();
  const { format: formatPrice, convertTo } = useCurrency();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [paymentConfig, setPaymentConfig] = useState<{
    cash: boolean;
    online: boolean;
    defaultMethod: PaymentMethod;
    onlineConfigured: boolean;
  } | null>(null);
  const [redirectStatus, setRedirectStatus] = useState<RedirectStatus>('idle');
  const [redirectMode, setRedirectMode] = useState<'online' | 'cash'>('online');
  const [promoInput, setPromoInput] = useState('');
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setIsApplyingPromo(true);
    try {
      await applyPromoCode(promoInput.trim());
      setPromoInput('');
    } catch {
      // Toast handled in hook
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      phoneNumber: '',
      nationality: '',
      paymentMethod: 'online',
    },
  });

  // -------------------------------------------------------------------------
  // Stepper state
  // -------------------------------------------------------------------------
  const [currentStep, setCurrentStep] = useState(0);
  const [maxReachedStep, setMaxReachedStep] = useState(0);

  const steps: ReadonlyArray<CheckoutStep> = useMemo(
    () => [
      { id: 'guest', label: 'Your details', description: 'Takes about 2 minutes' },
      { id: 'addons', label: 'Make it yours', description: 'Optional extras — skip any time' },
      { id: 'payment', label: 'Almost there', description: 'Review & pay' },
    ],
    []
  );

  const goToStep = useCallback(
    (next: number) => {
      const clamped = Math.min(Math.max(next, 0), steps.length - 1);
      setCurrentStep(clamped);
      setMaxReachedStep((m) => Math.max(m, clamped));
    },
    [steps.length]
  );

  // -------------------------------------------------------------------------
  // Payment method availability (unchanged behavior)
  // -------------------------------------------------------------------------
  const paymentMethodsEnabled = useMemo(() => {
    let cash = paymentConfig?.cash ?? true;
    let online = paymentConfig?.online ?? true;
    const defaultMethod = paymentConfig?.defaultMethod ?? 'online';

    if (!cash && !online) {
      cash = true;
      online = true;
    }

    const fallbackDefault: PaymentMethod =
      defaultMethod === 'cash' ? (cash ? 'cash' : 'online') : online ? 'online' : 'cash';

    return { cash, online, defaultMethod: fallbackDefault };
  }, [paymentConfig]);

  useEffect(() => {
    let cancelled = false;

    async function loadPaymentMethods() {
      try {
        const availability = await getCheckoutPaymentMethodAvailability();
        if (cancelled) return;

        const cash = availability?.cash ?? true;
        const online = availability?.online ?? true;
        const defaultMethod: PaymentMethod =
          availability?.defaultMethod === 'cash' || availability?.defaultMethod === 'online'
            ? availability.defaultMethod
            : 'online';
        const onlineConfigured = availability?.onlineConfigured ?? true;

        const normalizedCash = cash || (!cash && !online);
        const normalizedOnline = online || (!cash && !online);

        const nextDefault: PaymentMethod =
          defaultMethod === 'cash'
            ? normalizedCash
              ? 'cash'
              : 'online'
            : normalizedOnline
              ? 'online'
              : 'cash';

        setPaymentConfig({
          cash: normalizedCash,
          online: normalizedOnline,
          defaultMethod: nextDefault,
          onlineConfigured,
        });

        form.setValue('paymentMethod', nextDefault, { shouldValidate: true });
      } catch {
        if (cancelled) return;
        setPaymentConfig({
          cash: true,
          online: false,
          defaultMethod: 'cash',
          onlineConfigured: false,
        });
        form.setValue('paymentMethod', 'cash', { shouldValidate: true });
      }
    }

    void loadPaymentMethods();

    return () => {
      cancelled = true;
    };
  }, [form]);

  // -------------------------------------------------------------------------
  // Hotel lookup for room cart items (unchanged)
  // -------------------------------------------------------------------------
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
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [roomHotelIds]);

  const currencyWarning = useMemo(() => {
    const set = new Set(roomItems.map((i) => i.currency));
    return set.size > 1 ? Array.from(set).join(', ') : null;
  }, [roomItems]);

  // -------------------------------------------------------------------------
  // Step 2 data: tour upsells + room addons
  // -------------------------------------------------------------------------
  const tourItems = useMemo(
    () =>
      cartItems.filter(
        (i): i is Extract<CartItem, { productType: 'tour' }> => i.productType === 'tour'
      ),
    [cartItems]
  );

  const tourDestinations = useMemo(
    () => Array.from(new Set(tourItems.map((i) => i.product.destination).filter(Boolean))),
    [tourItems]
  );

  const [upsellCatalog, setUpsellCatalog] = useState<UpsellItem[]>([]);
  useEffect(() => {
    let cancelled = false;
    if (tourItems.length === 0) {
      setUpsellCatalog([]);
      return;
    }
    void getUpsellItems()
      .then((items) => {
        if (!cancelled) setUpsellCatalog(items);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [tourItems.length]);

  const isUpsellEligible = useCallback(
    (upsell: UpsellItem) => {
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
          requiredTourIds.some((id) => tourItems.some((tItem) => tItem.product.id === id))
        );
      }
      return match === 'all' ? checks.every(Boolean) : checks.some(Boolean);
    },
    [tourDestinations, tourItems]
  );

  const eligibleUpsells = useMemo(
    () => upsellCatalog.filter((u) => isUpsellEligible(u)),
    [upsellCatalog, isUpsellEligible]
  );

  const upsellAlreadyInCart = useCallback(
    (upsellId: string) =>
      cartItems.some((i) => i.productType === 'upsell' && i.product.id === upsellId),
    [cartItems]
  );

  // Visible upsells cap. Showing 10–20+ extras was a known abandonment
  // point — we cap to the top 5 by default and reveal the rest behind
  // a "Show all" toggle.
  const UPSELL_VISIBLE_LIMIT = 5;
  const [showAllUpsells, setShowAllUpsells] = useState(false);
  const visibleUpsells = useMemo(
    () => (showAllUpsells ? eligibleUpsells : eligibleUpsells.slice(0, UPSELL_VISIBLE_LIMIT)),
    [eligibleUpsells, showAllUpsells]
  );
  const hiddenUpsellCount = Math.max(0, eligibleUpsells.length - UPSELL_VISIBLE_LIMIT);

  // Has the user added ANY add-on this session? Drives the "Skip" vs
  // "Continue" CTA copy at the bottom of step 2.
  const hasAnyAddons = useMemo(() => {
    const upsellAdded = cartItems.some((i) => i.productType === 'upsell');
    const roomAddonAdded = cartItems.some(
      (i) => i.productType === 'room' && (i.addons?.length ?? 0) > 0
    );
    return upsellAdded || roomAddonAdded;
  }, [cartItems]);

  // Room addons: keyed by roomTypeId since multiple lines may share a room type.
  const [roomAddonsByType, setRoomAddonsByType] = useState<Record<string, RoomAddon[]>>({});
  const uniqueRoomTypeIds = useMemo(
    () => Array.from(new Set(roomItems.map((r) => r.roomTypeId))),
    [roomItems]
  );

  useEffect(() => {
    let cancelled = false;
    if (uniqueRoomTypeIds.length === 0) {
      setRoomAddonsByType({});
      return;
    }
    void Promise.all(uniqueRoomTypeIds.map(async (id) => [id, await getRoomAddons(id)] as const))
      .then((entries) => {
        if (cancelled) return;
        const next: Record<string, RoomAddon[]> = {};
        for (const [id, addons] of entries) {
          next[id] = addons.filter((a) => a.isActive);
        }
        setRoomAddonsByType(next);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [uniqueRoomTypeIds]);

  // -------------------------------------------------------------------------
  // Step transitions (validation gates)
  // -------------------------------------------------------------------------

  /**
   * Step 1 → Step 2 gate. Validates required guest fields and, on success,
   * fires a `checkout:email-captured` browser event so a future task can
   * hook abandoned-cart logic in without modifying this UI.
   *
   * EXTENSION POINT (abandoned-cart): listen to
   *   window.addEventListener('checkout:email-captured', ...)
   */
  const handleGuestContinue = useCallback(async () => {
    const ok = await form.trigger([...GUEST_GATE_FIELDS]);
    if (!ok) return;

    if (typeof window !== 'undefined') {
      try {
        const values = form.getValues();
        window.dispatchEvent(
          new CustomEvent('checkout:email-captured', {
            detail: {
              email: values.email,
              name: values.name,
              phoneNumber: values.phoneNumber,
              nationality: values.nationality,
            },
          })
        );
      } catch {
        // CustomEvent unavailable; fail silently.
      }
    }

    toast({
      title: '✓ Step 1 of 3',
      description: 'Now make it yours, or skip straight to payment.',
    });
    goToStep(1);
  }, [form, goToStep, toast]);

  /** Step 2 → Step 3 gate. Add-ons are optional, so this always passes.
   *  Also reconcile the selected payment method against current availability
   *  so the user lands on step 3 with a valid default already chosen. */
  const handleAddonsContinue = useCallback(() => {
    const current = form.getValues('paymentMethod');
    const fallback = paymentMethodsEnabled.defaultMethod;
    if (current === 'online' && !paymentMethodsEnabled.online) {
      form.setValue('paymentMethod', fallback, { shouldValidate: true });
      toast({
        title: 'Online payment unavailable',
        description: 'We\'ve selected cash on arrival for you.',
      });
    } else if (current === 'cash' && !paymentMethodsEnabled.cash) {
      form.setValue('paymentMethod', fallback, { shouldValidate: true });
    } else {
      toast({
        title: '✓ Step 2 of 3',
        description: 'One more step — pick how to pay and you\'re booked.',
      });
    }
    goToStep(2);
  }, [form, goToStep, paymentMethodsEnabled, toast]);

  // -------------------------------------------------------------------------
  // Submit (unchanged behavior — same `createBooking` call as today)
  // -------------------------------------------------------------------------

  async function onSubmit(values: FormValues) {
    // Safety net: onSubmit is only wired to explicit button clicks on step 2,
    // but guard here in case it is ever called from another path.
    if (currentStep !== 2) return;

    if (cartItems.length === 0) {
      toast({
        title: 'Cart is Empty',
        description: 'Please add items to your cart before placing an order.',
        variant: 'destructive',
      });
      return;
    }

    if (values.paymentMethod === 'online' && paymentConfig?.onlineConfigured === false) {
      toast({
        title: 'Online Payment Unavailable',
        description:
          'Online payment is not configured at the moment. Please choose cash or contact support.',
        variant: 'destructive',
      });
      return;
    }

    if (typeof window !== 'undefined') {
      try {
        const lastRaw = window.sessionStorage.getItem(LAST_SUBMIT_KEY);
        const last = lastRaw ? Number(lastRaw) : 0;
        if (Number.isFinite(last) && last > 0 && Date.now() - last < RESUBMIT_GUARD_MS) {
          toast({
            title: 'Hold on',
            description: "Just a moment, we're still preparing your payment…",
          });
          return;
        }
        window.sessionStorage.setItem(LAST_SUBMIT_KEY, String(Date.now()));
      } catch {
        // sessionStorage unavailable; proceed without guard.
      }
    }

    setRedirectMode(values.paymentMethod);
    setRedirectStatus('preparing');

    try {
      const bookingPayload = {
        customerName: values.name,
        customerEmail: values.email,
        phoneNumber: values.phoneNumber,
        nationality: values.nationality,
        cartItems,
        paymentMethod: values.paymentMethod,
        promoCode: promoCode?.code,
      };

      if (values.paymentMethod === 'cash') {
        const bookingId = await createBooking(bookingPayload);

        toast({
          title: '✅ Booking confirmed',
          description:
            'Your booking is locked in. Check your email for the confirmation and voucher.',
        });
        const successUrl = `/checkout/success?merchantOrderId=${encodeURIComponent(bookingId)}`;
        setRedirectStatus('redirecting');
        setTimeout(() => {
          window.location.href = successUrl;
        }, 400);
        return;
      }

      const fingerprint = computeCartFingerprint(cartItems, promoCode?.code ?? null);
      const provisionalBookingId = getOrCreateProvisionalBookingId(fingerprint);
      const kashierAmountInEgp = convertTo(getFinalTotal(), 'EGP');

      const paymentUrl = await buildKashierHppUrl({
        merchantOrderId: provisionalBookingId,
        amount: kashierAmountInEgp,
        customer: {
          name: values.name,
          email: values.email,
          mobile: values.phoneNumber,
        },
      });

      await createBooking({
        ...bookingPayload,
        bookingId: provisionalBookingId,
      });

      toast({
        title: '🔒 Redirecting to secure payment',
        description:
          'You\'re heading to Kashier to complete payment. Your booking stays pending until they confirm.',
      });

      setRedirectStatus('redirecting');
      setTimeout(() => {
        window.location.href = paymentUrl;
      }, 400);
    } catch (error) {
      console.error('Error placing order:', error);
      setRedirectStatus('idle');
      const classified = classifyCheckoutError(error);
      toast({
        title: classified.title,
        description: classified.description,
        variant: 'destructive',
      });
    }
  }

  // -------------------------------------------------------------------------
  // Item summary helpers (unchanged)
  // -------------------------------------------------------------------------
  const getCheckoutItemKey = (item: CartItem) =>
    item.productType === 'room'
      ? `room-${item.lineId}`
      : `${item.productType}-${item.product.id}-${item.packageId ?? 'base'}`;

  const getNonRoomItemSummary = (item: Exclude<CartItem, { productType: 'room' }>) => {
    let itemTotal = 0;
    let productDescription = '';
    let productImage = '';

    if (item.productType === 'tour') {
      const tour = item.product as Tour;
      productImage = tour.images?.[0] || '/placeholder.png';
      productDescription = `${item.adults ?? 0} Adults, ${item.children ?? 0} Children`;
      if (item.packageName) productDescription += ` • ${item.packageName}`;
      if (item.date) productDescription += ` • ${format(new Date(item.date), 'PPP')}`;

      const totalPeople = (item.adults ?? 0) + (item.children ?? 0);
      let priceTiers = tour.priceTiers || [];
      if (item.packageId && tour.packages) {
        const selectedPackage = tour.packages.find((p) => p.id === item.packageId);
        if (selectedPackage) priceTiers = selectedPackage.priceTiers;
      }
      const priceTier =
        priceTiers.find(
          (tier) =>
            totalPeople >= tier.minPeople &&
            (tier.maxPeople === null || totalPeople <= tier.maxPeople)
        ) || priceTiers[priceTiers.length - 1];
      if (priceTier) {
        itemTotal =
          (item.adults ?? 0) * priceTier.pricePerAdult +
          (item.children ?? 0) * priceTier.pricePerChild;
      }
    } else {
      const upsellItem = item.product as UpsellItem;
      productImage = upsellItem.imageUrl || '/placeholder-upsell.png';
      productDescription = upsellItem.description || 'Additional Service';
      const variant =
        item.packageId && upsellItem.variants
          ? upsellItem.variants.find((v) => v.id === item.packageId)
          : undefined;
      const price = variant?.price ?? upsellItem.price;
      itemTotal = price * (item.quantity ?? 1);
    }

    return {
      itemTotal,
      productName: item.product.name,
      productDescription,
      productImage,
    };
  };

  // -------------------------------------------------------------------------
  // Order summary block (shared between desktop rail + mobile accordion)
  // -------------------------------------------------------------------------
  // -------------------------------------------------------------------------
  // Order summary block (shared between desktop rail + mobile accordion)
  // -------------------------------------------------------------------------

  // Resolve current agency id once for cross-sell rail. Prefer the agencyId
  // already present on a room cart item (zero round-trip); fall back to the
  // server action when only tours are in cart.
  const [resolvedAgencyId, setResolvedAgencyId] = useState<string | null>(null);
  useEffect(() => {
    const fromRoom = roomItems.find((r) => Boolean(r.agencyId))?.agencyId ?? null;
    if (fromRoom) {
      setResolvedAgencyId(fromRoom);
      return;
    }
    let cancelled = false;
    void import('@/lib/supabase/agency-actions')
      .then((m) => m.getCurrentAgencyIdAction())
      .then((id) => {
        if (!cancelled) setResolvedAgencyId(id);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [roomItems]);

  const crossSellContext = useMemo<CrossSellContext | null>(() => {
    if (!resolvedAgencyId) return null;
    if (roomItems.length > 0) {
      let earliest = roomItems[0].checkInDate;
      let latest = roomItems[0].checkOutDate;
      for (const r of roomItems) {
        if (r.checkInDate < earliest) earliest = r.checkInDate;
        if (r.checkOutDate > latest) latest = r.checkOutDate;
      }
      return {
        kind: 'room-stay',
        agencyId: resolvedAgencyId,
        checkIn: earliest,
        checkOut: latest,
      };
    }
    const firstTour = cartItems.find(
      (i): i is Extract<CartItem, { productType: 'tour' }> => i.productType === 'tour' && !!i.date
    );
    if (firstTour && firstTour.date) {
      const d = new Date(firstTour.date);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      return { kind: 'tour-date', agencyId: resolvedAgencyId, date: iso };
    }
    return null;
  }, [resolvedAgencyId, roomItems, cartItems]);

  // Earliest hold expiry across room lines — one countdown is friendlier
  // than one per line in the order summary.
  const earliestHold = useMemo(() => {
    let candidate: { lineId: string; expiresAt: string } | null = null;
    for (const r of roomItems) {
      if (!r.holdExpiresAt) continue;
      if (!candidate || r.holdExpiresAt < candidate.expiresAt) {
        candidate = { lineId: r.lineId, expiresAt: r.holdExpiresAt };
      }
    }
    return candidate;
  }, [roomItems]);

  const orderSummaryBody = (
    <div className="space-y-4">
      {earliestHold ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-muted/30 px-3 py-2 text-xs">
          <span className="font-medium text-foreground">Your room is held</span>
          <HoldTimer
            expiresAt={earliestHold.expiresAt}
            onRefresh={() => refreshRoomHold(earliestHold.lineId)}
            compact
          />
        </div>
      ) : null}
      {currencyWarning ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/40 dark:border-amber-700 dark:text-amber-100">
          Cart contains items in multiple currencies ({currencyWarning}). Charged in agency&apos;s
          primary currency.
        </div>
      ) : null}
      <div className="space-y-3">
        {cartItems.map((item) => {
          if (item.productType === 'room') {
            const hotel = hotelLookup.hotels[item.hotelId];
            return (
              <RoomCartLine
                key={getCheckoutItemKey(item)}
                item={item}
                hotelName={hotel?.name}
                hotelSlug={hotel?.slug}
                linkContext={{ singleHotelMode: hotelLookup.singleHotelMode }}
                variant="summary"
              />
            );
          }
          const summary = getNonRoomItemSummary(item);
          return (
            <div key={getCheckoutItemKey(item)} className="rounded-2xl border bg-background p-4">
              <div className="flex min-w-0 items-start gap-3">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border">
                  <Image
                    src={summary.productImage}
                    alt={summary.productName}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="break-words font-semibold leading-snug">{summary.productName}</p>
                  <p className="break-words text-sm text-muted-foreground">
                    {summary.productDescription}
                  </p>
                </div>
              </div>
              <p className="mt-3 break-words text-right font-semibold text-primary">
                {formatPrice(summary.itemTotal)}
              </p>
            </div>
          );
        })}
      </div>

      <Separator />

      <div className="space-y-2 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <span className="text-muted-foreground">{t('checkout.subtotal')}</span>
          <span className="break-words text-right font-medium">{formatPrice(getCartTotal())}</span>
        </div>
        {promoCode ? (
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 text-green-600 dark:text-green-400">
            <span className="inline-flex min-w-0 flex-1 items-center gap-1.5 break-words">
              <Tag className="h-3.5 w-3.5 shrink-0" />
              {t('checkout.discount')} ({promoCode.code})
              <button
                type="button"
                onClick={removePromoCode}
                className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-green-700/70 hover:bg-green-100 hover:text-green-700 dark:text-green-300/70 dark:hover:bg-green-950/40 dark:hover:text-green-300"
                aria-label="Remove promo code"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
            <span className="shrink-0 break-words text-right">
              -{formatPrice(getDiscountAmount())}
            </span>
          </div>
        ) : (
          <div className="flex gap-2 pt-1">
            <Input
              placeholder={t('cart.promoPlaceholder')}
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value)}
              className="h-9 bg-background"
              disabled={isApplyingPromo}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9"
              onClick={handleApplyPromo}
              disabled={!promoInput.trim() || isApplyingPromo}
            >
              {isApplyingPromo ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t('cart.apply')
              )}
            </Button>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <span className="text-muted-foreground">{t('checkout.taxesFees')}</span>
          <span className="break-words text-right text-muted-foreground">
            {t('checkout.taxesCalc')}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t pt-3 text-lg font-bold">
        <span>{t('checkout.total')}</span>
        <span className="break-words text-right">{formatPrice(getFinalTotal())}</span>
      </div>
    </div>
  );

  // -------------------------------------------------------------------------
  // Empty cart short-circuit (unchanged)
  // -------------------------------------------------------------------------
  if (cartItems.length === 0) {
    return (
      <div className="mx-auto w-full max-w-5xl py-10">
        <Card className="overflow-hidden rounded-2xl border bg-card">
          <CardContent className="grid gap-8 p-8 md:grid-cols-2 md:p-10">
            <div className="space-y-4">
              <Badge variant="secondary" className="w-fit">
                {t('checkout.badge')}
              </Badge>
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight">{t('checkout.emptyCart')}</h1>
                <p className="text-muted-foreground">{t('checkout.emptyDesc')}</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/tours">{t('checkout.exploreTours')}</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/cart">{t('checkout.backToCart')}</Link>
                </Button>
              </div>
            </div>
            <div className="rounded-2xl border bg-muted/30 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background">
                  <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="font-medium">{t('checkout.secureBooking')}</p>
                  <p className="text-sm text-muted-foreground">{t('checkout.secureBookingDesc')}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const isSubmitting = form.formState.isSubmitting || redirectStatus !== 'idle';
  const selectedPaymentMethod = form.watch('paymentMethod');
  // Continue-CTA label changes on step 2 (add-ons) based on whether the
  // user has actually picked any add-on. "Skip to payment" makes the
  // optionality explicit for users who don't want extras.
  const continueLabel =
    currentStep === 0
      ? 'Continue to add-ons'
      : hasAnyAddons
        ? 'Continue to payment'
        : 'Skip to payment';
  const finalLabel =
    selectedPaymentMethod === 'cash'
      ? t('checkout.confirmCashBooking')
      : t('checkout.continueToSecurePayment');
  const mobileFinalLabel =
    selectedPaymentMethod === 'cash' ? t('checkout.confirm') : t('checkout.payOnline');

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 pb-[calc(theme(spacing.28)+env(safe-area-inset-bottom))] lg:pb-10">
      {redirectStatus !== 'idle' ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-[100] grid place-items-center bg-background/95 backdrop-blur-sm"
        >
          <Card className="w-full max-w-md rounded-2xl border bg-card shadow-xl">
            <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold tracking-tight">
                  {redirectMode === 'cash'
                    ? redirectStatus === 'preparing'
                      ? 'Confirming your booking…'
                      : 'Taking you to confirmation…'
                    : redirectStatus === 'preparing'
                      ? 'Securing your booking…'
                      : 'Redirecting to secure payment…'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {redirectMode === 'cash'
                    ? 'Please don\u2019t close this tab while we finalize your reservation.'
                    : 'Your booking is pending while Kashier opens the secure payment page.'}
                </p>
              </div>
              {redirectMode === 'online' ? (
                <div className="flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>256-bit encrypted via Kashier</span>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border bg-card">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
        <div className="relative p-6 md:p-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3">
              <Badge variant="secondary" className="w-fit">
                {t('checkout.badge')}
              </Badge>
              <h1 className="font-headline text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                {t('checkout.title')}
              </h1>
              <p className="max-w-2xl text-base text-muted-foreground">{t('checkout.subtitle')}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" variant="outline">
                <Link href="/cart">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t('checkout.backToCart')}
                </Link>
              </Button>
              <div className="flex items-center gap-2 rounded-2xl border bg-background/70 px-4 py-2">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {t('checkout.secureCheckout')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mounts the abandoned-cart capture listener while the user is on /checkout. */}
      <AbandonedCartCapture />

      {/* Stepper */}
      <CheckoutStepper
        steps={steps}
        currentStep={currentStep}
        maxReachedStep={maxReachedStep}
        onStepSelect={(idx) => {
          if (idx <= maxReachedStep) setCurrentStep(idx);
        }}
      />

      <Form {...form}>
        <form
          onSubmit={(e) => e.preventDefault()}
          className="grid gap-8 lg:grid-cols-3 lg:items-start"
        >
          <div className="space-y-6 lg:col-span-2">
            {/* Mobile collapsible order summary at top of each step */}
            <div className="lg:hidden">
              <Accordion type="single" collapsible className="rounded-2xl border bg-card">
                <AccordionItem value="summary" className="border-0">
                  <AccordionTrigger className="px-4 py-3">
                    <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                      <ShoppingBag className="h-4 w-4 shrink-0" />
                      <span className="truncate">
                        Order summary · {formatPrice(getFinalTotal())}
                      </span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">{orderSummaryBody}</AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {/* Step 1 — Guest details */}
            <section
              aria-labelledby="step-guest-heading"
              hidden={currentStep !== 0}
              aria-live="polite"
            >
              <Card className="overflow-hidden rounded-2xl border bg-card">
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle id="step-guest-heading">
                      Where should we send your confirmation?
                    </CardTitle>
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Takes about 2 minutes
                    </span>
                  </div>
                  <CardDescription>{t('checkout.customerInfoDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>{t('checkout.fullName')}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="John Doe"
                            autoComplete="name"
                            autoCapitalize="words"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-1">
                        <FormLabel>{t('checkout.emailAddress')}</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            inputMode="email"
                            placeholder="you@example.com"
                            autoComplete="email"
                            autoCapitalize="none"
                            spellCheck={false}
                            {...field}
                          />
                        </FormControl>
                        <p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <ShieldCheck className="h-3 w-3 text-green-600 dark:text-green-400" />
                          We&apos;ll send your voucher here. Never shared.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-1">
                        <FormLabel>{t('checkout.phoneNumber')}</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            inputMode="tel"
                            placeholder="+1 (555) 123-4567"
                            autoComplete="tel"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nationality"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>{t('checkout.nationality')}</FormLabel>
                        <FormControl>
                          <CountrySelect
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select your country"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </section>

            {/* Step 2 — Add-ons / Upsells */}
            <section
              aria-labelledby="step-addons-heading"
              hidden={currentStep !== 1}
              aria-live="polite"
            >
              <Card className="overflow-hidden rounded-2xl border bg-card">
                <CardHeader>
                  <CardTitle id="step-addons-heading">Make it yours ✨</CardTitle>
                  <CardDescription>
                    Optional extras curated for your trip. Skip any time — your booking still
                    holds.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/*
                    EXTENSION POINT (cross-sell): the CrossSellRail component
                    will be implemented in a separate task and rendered here.
                    Until then, render nothing.
                  */}
                  {crossSellContext ? <CrossSellRail context={crossSellContext} /> : null}

                  {/* Tour upsells — capped at top N to reduce overwhelm */}
                  {tourItems.length > 0 ? (
                    eligibleUpsells.length > 0 ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <h3 className="text-sm font-semibold">Recommended add-ons</h3>
                            <p className="text-sm text-muted-foreground">
                              Hand-picked for your trip — cheapest when bundled.
                            </p>
                          </div>
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                            <Tag className="h-3 w-3" />
                            Best bundled
                          </span>
                        </div>
                        <ul className="grid gap-3 sm:grid-cols-2">
                          {visibleUpsells.map((upsell, idx) => (
                            <UpsellOption
                              key={upsell.id}
                              upsell={upsell}
                              alreadyInCart={upsellAlreadyInCart(upsell.id)}
                              isPopular={idx === 0 && eligibleUpsells.length > 1}
                              onAdd={(variantId, variantName) =>
                                addToCart(
                                  upsell,
                                  'upsell',
                                  undefined,
                                  undefined,
                                  undefined,
                                  1,
                                  variantId,
                                  variantName
                                )
                              }
                              formatPrice={formatPrice}
                            />
                          ))}
                        </ul>
                        {hiddenUpsellCount > 0 && (
                          <button
                            type="button"
                            onClick={() => setShowAllUpsells((v) => !v)}
                            className="text-sm font-medium text-primary hover:underline"
                          >
                            {showAllUpsells
                              ? 'Show fewer add-ons'
                              : `Show all ${eligibleUpsells.length} add-ons (${hiddenUpsellCount} more)`}
                          </button>
                        )}
                      </div>
                    ) : (
                      <p className="rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground">
                        No matching add-ons for the tours in your cart.
                      </p>
                    )
                  ) : null}

                  {/* Room addons per room line */}
                  {roomItems.length > 0 ? (
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-sm font-semibold">Room extras</h3>
                        <p className="text-sm text-muted-foreground">
                          Optional services for each room in your cart.
                        </p>
                      </div>
                      <div className="space-y-4">
                        {roomItems.map((room) => {
                          const available = roomAddonsByType[room.roomTypeId] ?? [];
                          return (
                            <RoomAddonsBlock
                              key={room.lineId}
                              roomName={room.name}
                              nights={room.nights}
                              available={available}
                              selected={room.addons}
                              formatPrice={formatPrice}
                              onToggle={(addon, checked) => {
                                const next: RoomCartAddon[] = checked
                                  ? [
                                      ...room.addons.filter((a) => a.id !== addon.id),
                                      {
                                        id: addon.id,
                                        name: addon.name,
                                        unitPrice: addon.price,
                                        quantity: 1,
                                        currency: addon.currency,
                                      },
                                    ]
                                  : room.addons.filter((a) => a.id !== addon.id);
                                updateRoomItem(room.lineId, { addons: next });
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {tourItems.length === 0 && roomItems.length === 0 ? (
                    <p className="rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground">
                      No add-ons available for the items in your cart. You can continue to payment.
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </section>

            {/* Step 3 — Payment */}
            <section
              aria-labelledby="step-payment-heading"
              hidden={currentStep !== 2}
              aria-live="polite"
            >
              <Card className="overflow-hidden rounded-2xl border bg-card">
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle
                      id="step-payment-heading"
                      className="inline-flex items-center gap-2"
                    >
                      <Sparkles className="h-5 w-5 text-primary" />
                      Almost there — last step
                    </CardTitle>
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-950/50 dark:text-green-200">
                      <Check className="h-3 w-3" />
                      Step 3 of 3
                    </span>
                  </div>
                  <CardDescription>Pick how to pay and you&apos;re done.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {paymentConfig != null &&
                    !paymentMethodsEnabled.online &&
                    paymentMethodsEnabled.cash && (
                      <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:border-amber-700 dark:text-amber-100">
                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                          Online card payment isn&apos;t available right now. You can pay
                          cash on arrival — no card details needed.
                        </span>
                      </div>
                    )}
                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>{t('checkout.paymentMethod')}</FormLabel>
                        <FormControl>
                          <RadioGroup
                            value={field.value}
                            onValueChange={field.onChange}
                            className="grid gap-3 sm:grid-cols-2"
                          >
                            {paymentMethodsEnabled.cash ? (
                              <label
                                htmlFor="payment-cash"
                                className="flex cursor-pointer items-start gap-3 rounded-2xl border bg-background p-4"
                              >
                                <RadioGroupItem value="cash" id="payment-cash" />
                                <div className="space-y-1">
                                  <p className="text-sm font-medium leading-none">
                                    {t('checkout.cashLabel')}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {t('checkout.cashDesc')}
                                  </p>
                                </div>
                              </label>
                            ) : null}
                            {paymentMethodsEnabled.online ? (
                              <label
                                htmlFor="payment-online"
                                className="flex cursor-pointer items-start gap-3 rounded-2xl border bg-background p-4"
                              >
                                <RadioGroupItem value="online" id="payment-online" />
                                <div className="space-y-1">
                                  <p className="text-sm font-medium leading-none">
                                    {t('checkout.onlineLabel')}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {t('checkout.onlineDesc')}
                                  </p>
                                </div>
                              </label>
                            ) : null}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="rounded-2xl border bg-muted/30 p-4">
                    <p className="text-sm font-semibold">Final review</p>
                    <p className="text-sm text-muted-foreground">
                      {cartItems.length} item{cartItems.length === 1 ? '' : 's'} ·{' '}
                      {formatPrice(getFinalTotal())} total
                    </p>
                  </div>

                  {/* Risk reversal: cancellation policy + (online-only) card-charge clarity */}
                  <div className="grid gap-2 rounded-2xl border border-green-200 bg-green-50/60 p-3 text-xs text-green-900 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-100">
                    <div className="flex items-start gap-2">
                      <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-green-700 dark:text-green-400" />
                      <p className="leading-snug">
                        <span className="font-semibold">Flexible cancellation</span> — see our{' '}
                        <Link
                          href="/policy-security"
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold underline underline-offset-2 hover:text-green-700 dark:hover:text-green-300"
                        >
                          cancellation &amp; refund policy
                        </Link>
                        .
                      </p>
                    </div>
                    {form.watch('paymentMethod') === 'online' && (
                      <div className="flex items-start gap-2">
                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-green-700 dark:text-green-400" />
                        <p className="leading-snug">
                          <span className="font-semibold">Your card is only charged</span> after we
                          confirm availability. Until then, your booking sits in pending.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3 border-t bg-muted/20">
                  <TrustBadges variant="compact" />
                  <p className="text-center text-xs text-muted-foreground">
                    By placing this order you agree to our{' '}
                    <Link
                      href="/terms-and-condition"
                      target="_blank"
                      rel="noreferrer"
                      className="underline underline-offset-2 hover:text-foreground"
                    >
                      terms
                    </Link>
                    {' '}and{' '}
                    <Link
                      href="/policy-security"
                      target="_blank"
                      rel="noreferrer"
                      className="underline underline-offset-2 hover:text-foreground"
                    >
                      policy
                    </Link>
                    .
                  </p>
                </CardFooter>
              </Card>
            </section>

            {/* Inline navigation row (desktop). Mobile uses sticky bottom bar. */}
            <div className="hidden items-center justify-between gap-3 lg:flex">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => goToStep(currentStep - 1)}
                disabled={currentStep === 0 || isSubmitting}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>

              {currentStep < 2 ? (
                <Button
                  type="button"
                  size="lg"
                  onClick={currentStep === 0 ? handleGuestContinue : handleAddonsContinue}
                  disabled={isSubmitting}
                >
                  {continueLabel}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <MagneticWrap>
                  <Button
                    type="button"
                    size="lg"
                    disabled={isSubmitting}
                    onClick={() => form.handleSubmit(onSubmit)()}
                  >
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {finalLabel}
                  </Button>
                </MagneticWrap>
              )}
            </div>
          </div>

          {/* Desktop right rail summary */}
          <aside className="hidden lg:sticky lg:top-24 lg:block">
            <div className="space-y-6">
              <Card className="overflow-hidden rounded-2xl border bg-card">
                <CardHeader>
                  <CardTitle>{t('checkout.orderSummary')}</CardTitle>
                  <CardDescription>
                    {cartItems.length} item{cartItems.length === 1 ? '' : 's'}
                  </CardDescription>
                </CardHeader>
                <CardContent>{orderSummaryBody}</CardContent>
              </Card>
              <TrustBadges />
            </div>
          </aside>

          {/* Mobile sticky bottom bar */}
          <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 py-3 pb-[max(theme(spacing.3),env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-xs text-muted-foreground">
                  Total · {cartItems.length} item{cartItems.length === 1 ? '' : 's'}
                </p>
                <p className="truncate text-base font-bold">{formatPrice(getFinalTotal())}</p>
              </div>
              <div className="flex items-center gap-2">
                {currentStep > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => goToStep(currentStep - 1)}
                    disabled={isSubmitting}
                    aria-label="Go back to previous step"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                ) : null}
                {currentStep < 2 ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={currentStep === 0 ? handleGuestContinue : handleAddonsContinue}
                    disabled={isSubmitting}
                  >
                    Continue
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    disabled={isSubmitting}
                    onClick={() => form.handleSubmit(onSubmit)()}
                  >
                    {isSubmitting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                    {mobileFinalLabel}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Local subcomponents
// ---------------------------------------------------------------------------

type UpsellOptionProps = {
  upsell: UpsellItem;
  alreadyInCart: boolean;
  /** Show a "Most popular" badge on the image. */
  isPopular?: boolean;
  onAdd: (variantId: string | undefined, variantName: string | undefined) => void;
  formatPrice: (value: number) => string;
};

function UpsellOption({
  upsell,
  alreadyInCart,
  isPopular,
  onAdd,
  formatPrice,
}: UpsellOptionProps) {
  const [variantId, setVariantId] = useState<string | undefined>(undefined);
  const variant = useMemo(
    () => (variantId ? upsell.variants?.find((v) => v.id === variantId) : undefined),
    [variantId, upsell.variants]
  );
  const price = variant?.price ?? upsell.price;
  const hasVariants = (upsell.variants?.length ?? 0) > 0;

  const idRef = useRef(`upsell-variant-${upsell.id}`);

  return (
    <li
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border bg-background transition-shadow',
        alreadyInCart ? 'opacity-90' : 'hover:shadow-md'
      )}
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
        <Image
          src={upsell.imageUrl || '/placeholder-upsell.png'}
          alt={upsell.name}
          fill
          className={cn(
            'object-cover transition-transform duration-500',
            !alreadyInCart && 'group-hover:scale-105'
          )}
          sizes="(max-width: 640px) 100vw, 50vw"
        />
        {isPopular && !alreadyInCart && (
          <div className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white shadow">
            <Star className="h-3 w-3 fill-current" />
            Most popular
          </div>
        )}
        {alreadyInCart && (
          <div className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-green-600 px-2.5 py-1 text-xs font-medium text-white shadow">
            <Check className="h-3 w-3" />
            Added
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="space-y-1">
          <p className="font-semibold leading-snug">{upsell.name}</p>
          {upsell.description ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">{upsell.description}</p>
          ) : null}
        </div>

        {hasVariants ? (
          <div className="space-y-1">
            <label htmlFor={idRef.current} className="text-xs font-medium text-muted-foreground">
              Option
            </label>
            <select
              id={idRef.current}
              className="h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={variantId ?? ''}
              onChange={(e) => setVariantId(e.target.value || undefined)}
              disabled={alreadyInCart}
            >
              <option value="">Standard</option>
              {upsell.variants?.map((v) => (
                <option key={v.id ?? v.name} value={v.id ?? ''}>
                  {v.name} · {formatPrice(v.price)}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-3 border-t pt-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">From</p>
            <p className="text-base font-bold text-primary">{formatPrice(price)}</p>
          </div>
          <Button
            type="button"
            size="sm"
            className="shrink-0"
            variant={alreadyInCart ? 'secondary' : 'default'}
            disabled={alreadyInCart}
            onClick={() => onAdd(variantId, variant?.name)}
          >
            {alreadyInCart ? (
              <>
                <Check className="mr-1.5 h-4 w-4" />
                Added
              </>
            ) : (
              <>
                <Plus className="mr-1.5 h-4 w-4" />
                Add
              </>
            )}
          </Button>
        </div>
      </div>
    </li>
  );
}

type RoomAddonsBlockProps = {
  roomName: string;
  /** Nights the user is booking — drives "Suggested" heuristics. */
  nights?: number;
  available: RoomAddon[];
  selected: RoomCartAddon[];
  formatPrice: (value: number) => string;
  onToggle: (addon: RoomAddon, checked: boolean) => void;
};

/**
 * Name-based "Suggested for you" heuristic.
 *
 * Travel-industry common upsells fall into a small set of keyword
 * buckets. We never auto-select on the user's behalf — only badge them
 * so the obvious-good-fit options stand out. The user always opts in.
 */
function isAddonSuggested(addon: RoomAddon, nights: number): boolean {
  const name = addon.name.toLowerCase();
  if (/breakfast|morning meal|buffet/.test(name) && nights >= 3) return true;
  if (/airport.*transfer|pickup|shuttle/.test(name)) return true;
  if (/late check.?out|early check.?in/.test(name) && nights <= 2) return true;
  return false;
}

function RoomAddonsBlock({
  roomName,
  nights = 0,
  available,
  selected,
  formatPrice,
  onToggle,
}: RoomAddonsBlockProps) {
  if (available.length === 0) return null;
  const selectedIds = new Set(selected.map((s) => s.id));
  return (
    <div className="rounded-2xl border bg-background p-4">
      <p className="text-sm font-semibold">{roomName}</p>
      <ul className="mt-3 space-y-2">
        {available.map((addon) => {
          const id = `room-addon-${addon.id}`;
          const checked = selectedIds.has(addon.id);
          const suggested = isAddonSuggested(addon, nights);
          return (
            <li key={addon.id} className="flex min-w-0 items-start gap-3">
              <Checkbox
                id={id}
                checked={checked}
                className="mt-0.5 shrink-0"
                onCheckedChange={(value) => onToggle(addon, value === true)}
              />
              <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer text-sm">
                <span className="grid gap-1 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-3">
                  <span className="flex flex-wrap items-center gap-1.5 break-words font-medium">
                    {addon.name}
                    {suggested && !checked && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                        <Star className="h-2.5 w-2.5 fill-current" />
                        Suggested
                      </span>
                    )}
                  </span>
                  <span className="break-words font-semibold text-primary sm:text-right">
                    {formatPrice(addon.price)}
                  </span>
                </span>
                {addon.description ? (
                  <span className="block break-words text-xs text-muted-foreground">
                    {addon.description}
                  </span>
                ) : null}
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
