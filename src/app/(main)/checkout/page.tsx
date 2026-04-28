'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { useCart } from '@/hooks/use-cart';
import { useCurrency } from '@/hooks/use-currency';
import { useLanguage } from '@/hooks/use-language';
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
import { createBooking } from '@/lib/supabase/bookings';
import { buildKashierHppUrl } from '@/lib/kashier';
import { format } from 'date-fns';
import { type Tour, type UpsellItem } from '@/types';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import { TrustBadges } from '@/components/trust-badges';
import { useEffect, useMemo, useState } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { getCheckoutPaymentMethodAvailability } from '@/lib/supabase/agency-content';
import type { CartItem } from '@/types';

type RedirectStatus = 'idle' | 'preparing' | 'redirecting';

const PROVISIONAL_ID_KEY_PREFIX = 'tourista:checkout:provisionalId:';
const LAST_SUBMIT_KEY = 'tourista:checkout:lastSubmitAt';
const RESUBMIT_GUARD_MS = 4000;

function djb2Hash(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0;
  }
  // Convert to unsigned 32-bit and base36 for compactness.
  return (hash >>> 0).toString(36);
}

function computeCartFingerprint(items: CartItem[], promoCodeValue: string | null): string {
  const normalized = items.map((i) => ({
    t: i.productType,
    p: i.product.id,
    k: i.packageId ?? null,
    a: i.adults ?? null,
    c: i.children ?? null,
    q: i.quantity ?? null,
    d: i.date ? new Date(i.date).toISOString() : null,
  }));
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

type PaymentMethod = z.infer<typeof formSchema>['paymentMethod'];

export default function CheckoutPage() {
  const { cartItems, getCartTotal, getDiscountAmount, getFinalTotal, promoCode } = useCart();
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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      phoneNumber: '',
      nationality: '',
      paymentMethod: 'online',
    },
  });

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

    return {
      cash,
      online,
      defaultMethod: fallbackDefault,
    };
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

  async function onSubmit(values: z.infer<typeof formSchema>) {
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

    // Defense-in-depth: ignore rapid re-submits within a short window.
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
        cartItems: cartItems,
        paymentMethod: values.paymentMethod,
        promoCode: promoCode?.code,
      };

      if (values.paymentMethod === 'cash') {
        const bookingId = await createBooking(bookingPayload);

        toast({
          title: 'Booking Confirmed',
          description: 'Your booking has been placed successfully.',
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
        title: 'Redirecting to Payment',
        description: 'Complete your payment to confirm the booking.',
      });

      // Note: provisional id remains in sessionStorage so that a back-and-resubmit
      // reuses the same row (backend createBooking is idempotent on bookingId).
      // The success page is responsible for clearing the key on confirmation.
      setRedirectStatus('redirecting');
      setTimeout(() => {
        window.location.href = paymentUrl;
      }, 400);
    } catch (error) {
      console.error('Error placing order:', error);
      setRedirectStatus('idle');
      toast({
        title: 'Order Failed',
        description: 'There was an error placing your order. Please try again.',
        variant: 'destructive',
      });
    }
  }

  if (cartItems.length === 0) {
    return (
      <div className="mx-auto w-full max-w-5xl py-10">
        <Card className="overflow-hidden rounded-3xl border bg-card">
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

  const getCheckoutItemKey = (item: (typeof cartItems)[number]) =>
    `${item.productType}-${item.product.id}-${item.packageId ?? 'base'}`;

  const getItemSummary = (item: (typeof cartItems)[number]) => {
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
    } else if (item.productType === 'upsell') {
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

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10">
      {redirectStatus !== 'idle' ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-[100] grid place-items-center bg-background/95 backdrop-blur-sm"
        >
          <Card className="w-full max-w-md rounded-3xl border bg-card shadow-xl">
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
                    : 'Kashier is handling your payment securely. Please don\u2019t close or refresh this tab.'}
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

      <section className="relative overflow-hidden rounded-3xl border bg-card">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
        <div className="relative p-6 md:p-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3">
              <Badge variant="secondary" className="w-fit">
                {t('checkout.badge')}
              </Badge>
              <h1 className="font-headline text-4xl font-bold tracking-tight text-foreground md:text-5xl">
                {t('checkout.title')}
              </h1>
              <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
                {t('checkout.subtitle')}
              </p>
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

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border bg-background/70 p-4">
              <p className="text-sm font-medium">{t('checkout.step1')}</p>
              <p className="text-sm text-muted-foreground">{t('checkout.stateCart')}</p>
            </div>
            <div className="rounded-2xl border bg-background/70 p-4">
              <p className="text-sm font-medium">{t('checkout.step2')}</p>
              <p className="text-sm text-muted-foreground">{t('checkout.stateCheckout')}</p>
            </div>
            <div className="rounded-2xl border bg-background/70 p-4">
              <p className="text-sm font-medium">{t('checkout.step3')}</p>
              <p className="text-sm text-muted-foreground">{t('checkout.stateConfirmation')}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-3 lg:items-start">
        <div className="lg:col-span-2">
          <Card className="overflow-hidden rounded-3xl border bg-card">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0">
                <CardHeader>
                  <CardTitle>{t('checkout.customerInfo')}</CardTitle>
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
                          <Input placeholder="John Doe" {...field} />
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
                          <Input placeholder="you@example.com" {...field} />
                        </FormControl>
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
                          <Input placeholder="+1 (555) 123-4567" {...field} />
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
                          <Input placeholder="e.g., American, Egyptian" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2 space-y-3">
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
                </CardContent>
                <CardFooter className="flex flex-col gap-3 border-t bg-muted/20">
                  <TrustBadges variant="compact" />
                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={form.formState.isSubmitting || redirectStatus !== 'idle'}
                  >
                    {form.formState.isSubmitting || redirectStatus !== 'idle' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {t('checkout.placeOrder')}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    {t('checkout.agreement')}
                  </p>
                </CardFooter>
              </form>
            </Form>
          </Card>
        </div>

        <div className="space-y-6 lg:sticky lg:top-24">
          <Card className="overflow-hidden rounded-3xl border bg-card">
            <CardHeader>
              <CardTitle>{t('checkout.orderSummary')}</CardTitle>
              <CardDescription>
                {cartItems.length} item{cartItems.length === 1 ? '' : 's'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {cartItems.map((item) => {
                  const summary = getItemSummary(item);
                  return (
                    <div
                      key={getCheckoutItemKey(item)}
                      className="flex items-start justify-between gap-4 rounded-2xl border bg-background p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative h-12 w-12 overflow-hidden rounded-xl border">
                          <Image
                            src={summary.productImage}
                            alt={summary.productName}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        </div>
                        <div className="space-y-1">
                          <p className="font-semibold leading-snug">{summary.productName}</p>
                          <p className="text-sm text-muted-foreground">
                            {summary.productDescription}
                          </p>
                        </div>
                      </div>
                      <p className="font-semibold">{formatPrice(summary.itemTotal)}</p>
                    </div>
                  );
                })}
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('checkout.subtotal')}</span>
                  <span className="font-medium">{formatPrice(getCartTotal())}</span>
                </div>
                {promoCode ? (
                  <div className="flex justify-between text-green-600">
                    <span>
                      {t('checkout.discount')} ({promoCode.code})
                    </span>
                    <span>-{formatPrice(getDiscountAmount())}</span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('checkout.taxesFees')}</span>
                  <span className="text-muted-foreground">{t('checkout.taxesCalc')}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex items-center justify-between border-t pt-4 text-lg font-bold">
              <span>{t('checkout.total')}</span>
              <span>{formatPrice(getFinalTotal())}</span>
            </CardFooter>
          </Card>

          <TrustBadges />
        </div>
      </div>
    </div>
  );
}
