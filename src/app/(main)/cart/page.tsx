"use client";

import React, { useActionState, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useFormStatus } from "react-dom";
import { useCart } from "@/hooks/use-cart";
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
import type { UpsellItem, Tour } from "@/types";
import { format } from "date-fns";

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
  const { cartItems, removeFromCart, getCartTotal, addToCart } = useCart();
  const [state, formAction] = useActionState(getAiSuggestions, {
    message: "",
    suggestions: [],
  });
  const [upsellItems, setUpsellItems] = useState<UpsellItem[]>([]);

  useEffect(() => {
    const fetchUpsells = async () => {
      const items = await getUpsellItems();
      setUpsellItems(items);
    };
    fetchUpsells();
  }, []);

  const tourDescriptions = cartItems
    .filter((item) => item.productType === "tour")
    .map((item) => (item.product as Tour).description);

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="font-headline text-3xl md:text-4xl font-bold text-primary mb-8">
        Your Shopping Cart
      </h1>

      {cartItems.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent className="space-y-4">
            <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground" />
            <h2 className="text-2xl font-semibold">Your cart is empty</h2>
            <p className="text-muted-foreground">
              Looks like you haven&apos;t added any tours yet.
            </p>
            <Button asChild>
              <Link href="/">Explore Tours</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <Card key={item.product.id} className="flex items-center p-4">
                {item.productType === "tour" ? (
                  <Image
                    src={(item.product as Tour).images?.[0] || "/placeholder.png"}
                    alt={(item.product as Tour).name}
                    width={128}
                    height={128}
                    className="rounded-md object-cover h-24 w-24 sm:h-32 sm:w-32"
                  />
                ) : (
                  <Image
                    src={
                      (item.product as UpsellItem).imageUrl ||
                      "/placeholder-upsell.png"
                    }
                    alt={item.product.name}
                    width={128}
                    height={128}
                    className="rounded-md object-cover h-24 w-24 sm:h-32 sm:w-32"
                    data-ai-hint={`${item.product.name} service`}
                  />
                )}
                <div className="ml-4 flex-grow">
                  <h2 className="font-bold text-lg">
                    {item.product.name}
                    {item.packageName && (
                      <span className="text-muted-foreground font-normal ml-2 text-base">
                        ({item.packageName})
                      </span>
                    )}
                  </h2>
                  {item.productType === "tour" && (
                    <p className="text-sm text-muted-foreground">
                      {(item.product as Tour).destination}
                    </p>
                  )}
                  <p className="font-bold text-primary mt-2">
                    $
                    {(() => {
                      if (item.productType === "upsell") {
                        return (
                          (item.product as UpsellItem).price *
                          (item.quantity || 1)
                        ).toLocaleString();
                      }
                      const tour = item.product as Tour;
                      const pkg =
                        item.packageId && tour.packages
                          ? tour.packages.find((p) => p.id === item.packageId)
                          : null;
                      const tiers = pkg ? pkg.priceTiers : tour.priceTiers;
                      const totalPeople =
                        (item.adults || 0) + (item.children || 0);
                      const tier =
                        tiers.find(
                          (t) =>
                            totalPeople >= t.minPeople &&
                            (t.maxPeople === null ||
                              totalPeople <= t.maxPeople),
                        ) || tiers[tiers.length - 1];
                      return (
                        (item.adults || 0) * tier.pricePerAdult +
                        (item.children || 0) * tier.pricePerChild
                      ).toLocaleString();
                    })()}
                  </p>
                  {item.productType === "tour" && item.date && (
                    <div className="text-sm text-muted-foreground">
                      <p>Date: {format(new Date(item.date), "PPP")}</p>
                      <p>
                        Guests: {item.adults} Adults, {item.children} Children
                      </p>
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    removeFromCart(
                      item.product.id,
                      item.productType,
                      item.packageId,
                    )
                  }
                >
                  <Trash2 className="h-5 w-5 text-destructive" />
                  <span className="sr-only">Remove item</span>
                </Button>
              </Card>
            ))}
          </div>

          <div className="lg:col-span-1 space-y-6 lg:sticky top-24">
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>${getCartTotal().toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Taxes & Fees</span>
                  <span>Calculated at checkout</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>${getCartTotal().toLocaleString()}</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link href="/checkout">Proceed to Checkout</Link>
                </Button>
              </CardFooter>
            </Card>

            {upsellItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Add More to Your Trip?
                  </CardTitle>
                  <CardDescription>
                    Enhance your experience with these additional services.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {upsellItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">
                          ${item.price.toLocaleString()}
                        </span>
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
                            )
                          }
                          disabled={cartItems.some(
                            (cartItem) =>
                              cartItem.product.id === item.id &&
                              cartItem.productType === "upsell",
                          )}
                        >
                          <PlusCircle className="h-4 w-4 mr-1" /> Add
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Need Inspiration?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Let our AI suggest similar tours you might enjoy.
                </p>
                <form action={formAction}>
                  {tourDescriptions.map((desc, i) => (
                    <input
                      type="hidden"
                      key={i}
                      name="descriptions"
                      value={desc}
                    />
                  ))}
                  <SubmitButton />
                </form>
                {state.suggestions && state.suggestions.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="font-semibold">Here are some ideas:</h4>
                    <ul className="list-disc list-inside text-sm text-muted-foreground">
                      {state.suggestions.map((suggestion, index) => (
                        <li key={index}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {state.message && state.message !== "Success" && (
                  <p className="text-sm text-destructive mt-2">
                    {state.message}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}