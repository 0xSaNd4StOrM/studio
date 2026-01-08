"use client";

import React, { useActionState, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useFormStatus } from "react-dom";
import { useCart } from "@/hooks/use-cart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Trash2,
  ShoppingCart,
  Lightbulb,
  Loader2,
  PlusCircle,
} from "lucide-react";
import { getAiSuggestions } from "@/app/actions";
import { getUpsellItems } from "@/lib/supabase/upsell-items";
import type { CartItem, UpsellItem, Tour } from "@/types";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Lightbulb className="mr-2 h-4 w-4" />
      )}
      Get AI Suggestions
    </Button>
  );
}

export default function CartPage() {
  const { cartItems, removeFromCart, getCartTotal, addToCart, clearCart } = useCart();
  const [state, formAction] = useActionState(getAiSuggestions, {
    message: "",
    suggestions: [],
  });
  const [upsellItems, setUpsellItems] = useState<UpsellItem[]>([]);
  const [selectedUpsellVariant, setSelectedUpsellVariant] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchUpsells = async () => {
      const items = await getUpsellItems();
      setUpsellItems(items);
    };
    fetchUpsells();
  }, []);

  const tourItems = cartItems.filter((item) => item.productType === "tour") as Array<CartItem & { product: Tour }>;
  const tourDestinations = Array.from(
    new Set(tourItems.map((item) => (item.product as Tour).destination).filter(Boolean)),
  );

  const isUpsellEligible = (upsell: UpsellItem) => {
    if (!upsell.isActive) return false;
    const targeting = upsell.targeting;
    if (!targeting) return true;

    const match = targeting.match ?? "any";
    const requiredDestinations = (targeting.destinations ?? []).filter(Boolean);
    const requiredTourIds = (targeting.tourIds ?? []).filter(Boolean);

    if (requiredDestinations.length === 0 && requiredTourIds.length === 0) return true;

    const checks: boolean[] = [];
    if (requiredDestinations.length > 0) {
      checks.push(requiredDestinations.some((d) => tourDestinations.includes(d)));
    }
    if (requiredTourIds.length > 0) {
      checks.push(requiredTourIds.some((id) => tourItems.some((t) => (t.product as Tour).id === id)));
    }

    return match === "all" ? checks.every(Boolean) : checks.some(Boolean);
  };

  const getUpsellDisplay = (upsell: UpsellItem) => {
    const selected = selectedUpsellVariant[upsell.id] ?? "__base__";
    const variantId = selected === "__base__" ? undefined : selected;
    const variant =
      variantId && upsell.variants ? upsell.variants.find((v) => v.id === variantId) : undefined;
    return {
      variantId,
      variantName: variant?.name,
      price: variant?.price ?? upsell.price,
    };
  };

  const tourDescriptions = cartItems
    .filter((item) => item.productType === "tour")
    .map((item) => (item.product as Tour).description);

  const getCartItemKey = (item: CartItem) =>
    `${item.productType}-${item.product.id}-${item.packageId ?? "base"}`;

  const getItemTotal = (item: CartItem) => {
    if (item.productType === "upsell") {
      const upsell = item.product as UpsellItem;
      const variant =
        item.packageId && upsell.variants ? upsell.variants.find((v) => v.id === item.packageId) : undefined;
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
        (t) => totalPeople >= t.minPeople && (t.maxPeople === null || totalPeople <= t.maxPeople),
      ) || tiers[tiers.length - 1];

    return (item.adults || 0) * tier.pricePerAdult + (item.children || 0) * tier.pricePerChild;
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10">
      <section className="relative overflow-hidden rounded-3xl border bg-card">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
        <div className="relative p-6 md:p-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3">
              <Badge variant="secondary" className="w-fit">
                Cart
              </Badge>
              <h1 className="font-headline text-4xl font-bold tracking-tight text-foreground md:text-5xl">
                Review your trip
              </h1>
              <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
                Confirm dates, guests, and add-ons before checkout.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" variant="outline">
                <Link href="/tours">Continue Shopping</Link>
              </Button>
              <Button asChild size="lg">
                <Link href="/checkout">Checkout</Link>
              </Button>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border bg-background/70 p-4">
              <p className="text-sm font-medium">Step 1</p>
              <p className="text-sm text-muted-foreground">Cart</p>
            </div>
            <div className="rounded-2xl border bg-background/70 p-4">
              <p className="text-sm font-medium">Step 2</p>
              <p className="text-sm text-muted-foreground">Checkout</p>
            </div>
            <div className="rounded-2xl border bg-background/70 p-4">
              <p className="text-sm font-medium">Step 3</p>
              <p className="text-sm text-muted-foreground">Confirmation</p>
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
                <h2 className="text-2xl font-semibold tracking-tight">Your cart is empty</h2>
                <p className="text-muted-foreground">
                  Start by exploring tours, then come back here to checkout.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/tours">Explore Tours</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/destination">Browse Destinations</Link>
                </Button>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-accent/10 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background/70">
                  <Lightbulb className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Tip</p>
                  <p className="text-sm text-muted-foreground">
                    Use the Destination page to discover Cairo, Alexandria, Aswan, and more.
                  </p>
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
                  Items <span className="text-muted-foreground">({cartItems.length})</span>
                </h2>
                <p className="text-sm text-muted-foreground">
                  Double-check your selections, then proceed to checkout.
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={clearCart}>
                  Clear Cart
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {cartItems.map((item) => {
                const imageSrc =
                  item.productType === "tour"
                    ? (item.product as Tour).images?.[0] || "/placeholder.png"
                    : (item.product as UpsellItem).imageUrl || "/placeholder-upsell.png";
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
                                {item.productType === "tour" ? "Tour" : "Add-on"}
                              </Badge>
                              {item.productType === "tour" && (
                                <Badge variant="outline">{(item.product as Tour).destination}</Badge>
                              )}
                              {item.packageName && (
                                <Badge variant="outline">{item.packageName}</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-start">
                            <p className="text-lg font-semibold text-primary">
                              ${itemTotal.toLocaleString()}
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

                        {item.productType === "tour" && (
                          <div className="grid gap-2 rounded-2xl border bg-muted/30 p-4 sm:grid-cols-2">
                            <div className="space-y-0.5">
                              <p className="text-xs font-medium text-muted-foreground">Date</p>
                              <p className="text-sm font-medium">
                                {item.date ? format(new Date(item.date), "PPP") : "Not selected"}
                              </p>
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-xs font-medium text-muted-foreground">Guests</p>
                              <p className="text-sm font-medium">
                                {(item.adults ?? 0).toString()} Adults, {(item.children ?? 0).toString()} Children
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          <div className="space-y-6 lg:sticky lg:top-24">
            <Card className="overflow-hidden rounded-3xl border bg-card">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
                <CardDescription>
                  {cartItems.length} item{cartItems.length === 1 ? "" : "s"} in your cart
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">${getCartTotal().toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taxes & fees</span>
                  <span className="text-sm text-muted-foreground">Calculated at checkout</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>${getCartTotal().toLocaleString()}</span>
                </div>
                <div className="grid gap-2 rounded-2xl border bg-muted/30 p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Secure checkout</span>
                    <span className="font-medium">Enabled</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Support</span>
                    <span className="font-medium">24/7</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button asChild className="w-full" size="lg">
                  <Link href="/checkout">Proceed to Checkout</Link>
                </Button>
                <Button asChild className="w-full" size="lg" variant="outline">
                  <Link href="/tours">Add More Tours</Link>
                </Button>
              </CardFooter>
            </Card>

            {upsellItems.length > 0 && (
              <Card className="overflow-hidden rounded-3xl border bg-card">
                <CardHeader>
                  <CardTitle className="text-lg">Add More to Your Trip?</CardTitle>
                  <CardDescription>
                    Enhance your experience with these additional services.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {upsellItems.filter(isUpsellEligible).map((item) => {
                    const display = getUpsellDisplay(item);
                    const selectValue = display.variantId ?? "__base__";
                    const alreadyInCart = cartItems.some(
                      (cartItem) =>
                        cartItem.product.id === item.id &&
                        cartItem.productType === "upsell" &&
                        (cartItem.packageId ?? "base") === (display.variantId ?? "base"),
                    );

                    return (
                    <div
                      key={item.id}
                      className="flex flex-col gap-3 rounded-2xl border bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-12 overflow-hidden rounded-xl border">
                          <Image
                            src={item.imageUrl || "/placeholder-upsell.png"}
                            alt={item.name}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        </div>
                        <div>
                          <p className="font-semibold leading-snug">{item.name}</p>
                          {item.description ? (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {item.description}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                        {item.variants && item.variants.length > 0 ? (
                          <Select
                            value={selectValue}
                            onValueChange={(value) =>
                              setSelectedUpsellVariant((prev) => ({ ...prev, [item.id]: value }))
                            }
                          >
                            <SelectTrigger className="w-full sm:w-56">
                              <SelectValue placeholder="Select option" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__base__">Base</SelectItem>
                              {(item.variants ?? [])
                                .filter((variant): variant is { id: string; name: string; price: number } =>
                                  Boolean(variant.id),
                                )
                                .map((variant) => (
                                  <SelectItem key={variant.id} value={variant.id}>
                                    {variant.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        ) : null}
                        <span className="font-semibold">${display.price.toLocaleString()}</span>
                        <Button
                          size="sm"
                          onClick={() =>
                            addToCart(
                              item,
                              "upsell",
                              undefined,
                              undefined,
                              undefined,
                              1,
                              display.variantId,
                              display.variantName,
                            )
                          }
                          disabled={alreadyInCart}
                        >
                          <PlusCircle className="mr-1 h-4 w-4" /> Add
                        </Button>
                      </div>
                    </div>
                  )})}
                </CardContent>
              </Card>
            )}

            <Card className="overflow-hidden rounded-3xl border bg-card">
              <CardHeader>
                <CardTitle className="text-lg">Need Inspiration?</CardTitle>
                <CardDescription>Get quick ideas based on what’s in your cart.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form
                  action={formAction}
                  className="flex flex-col gap-3 sm:flex-row sm:items-center"
                >
                  {tourDescriptions.map((desc, i) => (
                    <input type="hidden" key={i} name="descriptions" value={desc} />
                  ))}
                  <SubmitButton />
                  <Button asChild variant="outline">
                    <Link href="/tours">Browse Tours</Link>
                  </Button>
                </form>
                {state.suggestions && state.suggestions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">Here are some ideas:</h4>
                    <div className="grid gap-2">
                      {state.suggestions.map((suggestion, index) => (
                        <div key={index} className="rounded-2xl border bg-muted/30 p-3 text-sm">
                          {suggestion}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {state.message && state.message !== "Success" && (
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
