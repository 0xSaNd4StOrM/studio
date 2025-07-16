"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useCart } from "@/hooks/use-cart.tsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  address: z.string().min(10, "Address is required."),
  city: z.string().min(2, "City is required."),
  country: z.string().min(2, "Country is required."),
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
      address: "",
      city: "",
      country: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log("Order placed:", {
      ...values,
      items: cartItems,
      total: getCartTotal(),
    });
    
    toast({
      title: "Order Placed!",
      description: "Thank you for your purchase. A confirmation has been sent to your email.",
    });

    clearCart();
    router.push("/checkout/success");
  }

  if (cartItems.length === 0) {
    return (
      <div className="text-center py-16">
        <h1 className="text-2xl font-bold">Your cart is empty.</h1>
        <p className="text-muted-foreground">Please add items to your cart before checking out.</p>
        <Button asChild className="mt-4">
          <a href="/">Go to Homepage</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
      <div>
        <h1 className="font-headline text-4xl font-bold text-primary mb-6">Checkout</h1>
        <Card>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardHeader>
                <CardTitle>Shipping Information</CardTitle>
                <CardDescription>Enter your details to complete the purchase.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl><Input placeholder="you@example.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl><Input placeholder="123 Adventure St" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="city" render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl><Input placeholder="Travelville" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="country" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl><Input placeholder="Wanderland" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" size="lg">Place Order</Button>
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
            {cartItems.map(item => {
               const totalPeople = (item.adults ?? 0) + (item.children ?? 0);
               const priceTier = item.tour.priceTiers.find(tier => 
                 totalPeople >= tier.minPeople && (tier.maxPeople === null || totalPeople <= tier.maxPeople)
               ) || item.tour.priceTiers[item.tour.priceTiers.length - 1];
               const itemTotal = ((item.adults ?? 0) * priceTier.pricePerAdult) + ((item.children ?? 0) * priceTier.pricePerChild);

              return (
                <div key={item.tour.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Image src={item.tour.image} alt={item.tour.name} width={64} height={64} className="rounded-md object-cover" />
                    <div>
                      <p className="font-semibold">{item.tour.name}</p>
                      <p className="text-sm text-muted-foreground">{item.adults} Adults, {item.children} Children</p>
                    </div>
                  </div>
                  <p className="font-semibold">${itemTotal.toLocaleString()}</p>
                </div>
              )
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
