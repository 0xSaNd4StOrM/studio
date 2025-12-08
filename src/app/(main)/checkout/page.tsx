"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/hooks/use-cart";
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
import { createBooking } from "@/lib/supabase/bookings";
import { format } from "date-fns";
import { type Tour, type UpsellItem } from "@/types";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";

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
      <div className="text-center py-16">
        <h1 className="text-2xl font-bold">Your cart is empty.</h1>
        <p className="text-muted-foreground">
          Please add items to your cart before checking out.
        </p>
        <Button asChild className="mt-4">
          <Link href="/">Go to Homepage</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
      <div>
        <h1 className="font-headline text-4xl font-bold text-primary mb-6">
          Checkout
        </h1>
        <Card>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
                <CardDescription>
                  Enter your details to complete the purchase.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
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
                    <FormItem>
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
                    <FormItem>
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
                    <FormItem>
                      <FormLabel>Nationality</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., American, Egyptian"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter>
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={form.formState.isSubmitting}
                >
                  Place Order
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>
      <div className="pt-20">
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cartItems.map((item) => {
              let itemTotal = 0;
              const productName = item.product.name;
              let productDescription = "";
              let productImage = "";

              if (item.productType === "tour") {
                const tour = item.product as Tour;
                productImage = tour.images?.[0] || "";
                productDescription = `${item.adults ?? 0} Adults, ${item.children ?? 0} Children`;
                if (item.packageName) {
                  productDescription += ` • ${item.packageName}`;
                }
                if (item.date) {
                  productDescription += `, ${format(new Date(item.date), "PPP")}`;
                }
                const totalPeople = (item.adults ?? 0) + (item.children ?? 0);
                
                let priceTiers = tour.priceTiers || [];
                
                if (item.packageId && tour.packages) {
                  const selectedPackage = tour.packages.find(p => p.id === item.packageId);
                  if (selectedPackage) {
                    priceTiers = selectedPackage.priceTiers;
                  }
                }

                const priceTier =
                  priceTiers.find(
                    (tier) =>
                      totalPeople >= tier.minPeople &&
                      (tier.maxPeople === null ||
                        totalPeople <= tier.maxPeople!),
                  ) || priceTiers[priceTiers.length - 1];
                
                if (priceTier) {
                  itemTotal =
                    (item.adults ?? 0) * priceTier.pricePerAdult +
                    (item.children ?? 0) * priceTier.pricePerChild;
                }
              } else if (item.productType === "upsell") {
                const upsellItem = item.product as UpsellItem;
                productImage = upsellItem.imageUrl || "/placeholder-upsell.png"; // Use upsell item image or generic placeholder
                productDescription =
                  upsellItem.description || "Additional Service";
                itemTotal = upsellItem.price * (item.quantity ?? 1);
              }

              return (
                <div
                  key={item.product.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <Image
                      src={productImage}
                      alt={productName}
                      width={64}
                      height={64}
                      className="rounded-md object-cover"
                    />
                    <div>
                      <p className="font-semibold">{productName}</p>
                      <p className="text-sm text-muted-foreground">
                        {productDescription}
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold">${itemTotal.toLocaleString()}</p>
                </div>
              );
            })}
          </CardContent>
          <CardFooter className="flex justify-between items-center font-bold text-xl border-t pt-4 mt-4">
            <span>Total</span>
            <span>${getCartTotal().toLocaleString()}</span>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}