"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/hooks/use-cart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createBooking } from "@/lib/supabase/bookings";
import { format } from "date-fns";
import { type Tour, type UpsellItem } from "@/types";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  phoneNumber: z
    .string()
    .min(10, "Phone number is required.")
    .regex(/^\+?[0-9\s\-()]*$/, "Invalid phone number format."),
  nationality: z.string().min(2, "Nationality is required."),
});

export default function CheckoutPage() {
  const router = useRouter();
  const { cartItems, getCartTotal, clearCart } = useCart();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phoneNumber: "",
      nationality: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (cartItems.length === 0) {
      toast({
        title: "Cart is Empty",
        description: "Please add items to your cart before placing an order.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createBooking({
        customerName: values.name,
        customerEmail: values.email,
        phoneNumber: values.phoneNumber,
        nationality: values.nationality,
        cartItems: cartItems,
        totalPrice: getCartTotal(),
      });

      toast({
        title: "Order Placed!",
        description:
          "Thank you for your purchase. A confirmation has been sent to your email.",
      });

      clearCart();
      router.push("/checkout/success");
    } catch (error) {
      console.error("Error placing order:", error);
      toast({
        title: "Order Failed",
        description: "There was an error placing your order. Please try again.",
        variant: "destructive",
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
                Checkout
              </Badge>
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight">Your cart is empty</h1>
                <p className="text-muted-foreground">
                  Add a tour or service to your cart before placing an order.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/tours">Explore Tours</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/cart">Back to Cart</Link>
                </Button>
              </div>
            </div>
            <div className="rounded-2xl border bg-muted/30 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background">
                  <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="font-medium">Secure booking</p>
                  <p className="text-sm text-muted-foreground">
                    Your details are handled safely during checkout.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getCheckoutItemKey = (item: (typeof cartItems)[number]) =>
    `${item.productType}-${item.product.id}-${item.packageId ?? "base"}`;

  const getItemSummary = (item: (typeof cartItems)[number]) => {
    let itemTotal = 0;
    let productDescription = "";
    let productImage = "";

    if (item.productType === "tour") {
      const tour = item.product as Tour;
      productImage = tour.images?.[0] || "/placeholder.png";
      productDescription = `${item.adults ?? 0} Adults, ${item.children ?? 0} Children`;
      if (item.packageName) productDescription += ` • ${item.packageName}`;
      if (item.date) productDescription += ` • ${format(new Date(item.date), "PPP")}`;

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
            (tier.maxPeople === null || totalPeople <= tier.maxPeople),
        ) || priceTiers[priceTiers.length - 1];
      if (priceTier) {
        itemTotal =
          (item.adults ?? 0) * priceTier.pricePerAdult +
          (item.children ?? 0) * priceTier.pricePerChild;
      }
    } else if (item.productType === "upsell") {
      const upsellItem = item.product as UpsellItem;
      productImage = upsellItem.imageUrl || "/placeholder-upsell.png";
      productDescription = upsellItem.description || "Additional Service";
      itemTotal = upsellItem.price * (item.quantity ?? 1);
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
      <section className="relative overflow-hidden rounded-3xl border bg-card">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
        <div className="relative p-6 md:p-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3">
              <Badge variant="secondary" className="w-fit">
                Checkout
              </Badge>
              <h1 className="font-headline text-4xl font-bold tracking-tight text-foreground md:text-5xl">
                Complete your booking
              </h1>
              <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
                Enter your details, review your itinerary, and confirm your order.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" variant="outline">
                <Link href="/cart">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Cart
                </Link>
              </Button>
              <div className="flex items-center gap-2 rounded-2xl border bg-background/70 px-4 py-2">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Secure checkout</span>
              </div>
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

      <div className="grid gap-8 lg:grid-cols-3 lg:items-start">
        <div className="lg:col-span-2">
          <Card className="overflow-hidden rounded-3xl border bg-card">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0">
                <CardHeader>
                  <CardTitle>Customer Information</CardTitle>
                  <CardDescription>Enter your details to complete the purchase.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Full Name</FormLabel>
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
                        <FormLabel>Email Address</FormLabel>
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
                        <FormLabel>Phone Number</FormLabel>
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
                        <FormLabel>Nationality</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., American, Egyptian" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter className="flex flex-col gap-3 border-t bg-muted/20">
                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={form.formState.isSubmitting}
                  >
                    {form.formState.isSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Place Order
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    By placing an order, you agree to receive booking details via email.
                  </p>
                </CardFooter>
              </form>
            </Form>
          </Card>
        </div>

        <div className="space-y-6 lg:sticky lg:top-24">
          <Card className="overflow-hidden rounded-3xl border bg-card">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
              <CardDescription>
                {cartItems.length} item{cartItems.length === 1 ? "" : "s"}
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
                          <p className="text-sm text-muted-foreground">{summary.productDescription}</p>
                        </div>
                      </div>
                      <p className="font-semibold">${summary.itemTotal.toLocaleString()}</p>
                    </div>
                  );
                })}
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">${getCartTotal().toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Taxes & fees</span>
                  <span className="text-muted-foreground">Calculated at checkout</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex items-center justify-between border-t pt-4 text-lg font-bold">
              <span>Total</span>
              <span>${getCartTotal().toLocaleString()}</span>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
