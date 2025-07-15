"use client"

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useFormState, useFormStatus } from 'react-dom';
import { useCart } from '@/hooks/use-cart.tsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Trash2, ShoppingCart, Lightbulb, Loader2 } from 'lucide-react';
import { getAiSuggestions } from '@/app/actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
      Get AI Suggestions
    </Button>
  );
}

export default function CartPage() {
  const { cartItems, removeFromCart, getCartTotal } = useCart();
  const [state, formAction] = useFormState(getAiSuggestions, { message: '', suggestions: [] });

  const tourDescriptions = cartItems.map(item => item.tour.description);

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="font-headline text-4xl font-bold text-primary mb-8">Your Shopping Cart</h1>
      
      {cartItems.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent className="space-y-4">
            <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground" />
            <h2 className="text-2xl font-semibold">Your cart is empty</h2>
            <p className="text-muted-foreground">Looks like you haven't added any tours yet.</p>
            <Button asChild>
              <Link href="/">Explore Tours</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map(item => (
              <Card key={item.tour.id} className="flex items-center p-4">
                <Image src={item.tour.image} alt={item.tour.name} width={128} height={128} className="rounded-md object-cover h-32 w-32" data-ai-hint={`${item.tour.destination} landscape`} />
                <div className="ml-4 flex-grow">
                  <h2 className="font-bold text-lg">{item.tour.name}</h2>
                  <p className="text-sm text-muted-foreground">{item.tour.destination}</p>
                  <p className="font-bold text-primary mt-2">${item.tour.price.toLocaleString()}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.tour.id)}>
                  <Trash2 className="h-5 w-5 text-destructive" />
                  <span className="sr-only">Remove item</span>
                </Button>
              </Card>
            ))}
          </div>

          <div className="lg:col-span-1 space-y-6 sticky top-24">
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

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Need Inspiration?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">Let our AI suggest similar tours you might enjoy.</p>
                <form action={formAction}>
                  {tourDescriptions.map((desc, i) => (
                    <input type="hidden" key={i} name="descriptions" value={desc} />
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
                {state.message && state.message !== 'Success' && <p className="text-sm text-destructive mt-2">{state.message}</p>}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
