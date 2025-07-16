
'use client';

import { useState, useMemo } from 'react';
import { getTourById } from '@/lib/tours';
import { notFound, useParams } from 'next/navigation';
import Image from 'next/image';
import { useCart } from '@/hooks/use-cart.tsx';

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Clock, MapPin, Star, Tag, Users, Minus, Plus, ShoppingCart, CheckCircle, XCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function TourDetailsPage() {
  const params = useParams();
  const { addToCart } = useCart();
  const tour = getTourById(params.id as string);

  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);

  const totalPeople = useMemo(() => adults + children, [adults, children]);

  const currentPriceTier = useMemo(() => {
    if (!tour) return null;
    return tour.priceTiers.find(tier => 
      totalPeople >= tier.minPeople && (tier.maxPeople === null || totalPeople <= tier.maxPeople)
    ) || tour.priceTiers[tour.priceTiers.length - 1];
  }, [tour, totalPeople]);

  const totalPrice = useMemo(() => {
    if (!currentPriceTier) return 0;
    const adultPrice = adults * currentPriceTier.pricePerAdult;
    const childPrice = children * currentPriceTier.pricePerChild;
    return adultPrice + childPrice;
  }, [adults, children, currentPriceTier]);

  if (!tour) {
    notFound();
  }

  const handleBooking = () => {
    if (tour) {
      addToCart(tour, adults, children);
    }
  }

  return (
    <div className="grid lg:grid-cols-5 gap-12">
      {/* Left Column: Tour Info */}
      <div className="lg:col-span-3 space-y-8">
        <Card className="overflow-hidden">
           <div className="relative h-96 w-full">
            <Image
              src={tour.image}
              alt={tour.name}
              fill
              className="object-cover"
              data-ai-hint={`${tour.destination} ${tour.type}`}
              priority
            />
          </div>
          <CardHeader>
            <CardTitle className="font-headline text-4xl text-primary">{tour.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm mb-6">
              <div className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary"/> <span>{tour.destination}</span></div>
              <div className="flex items-center gap-2"><Clock className="h-5 w-5 text-primary"/> <span>{tour.durationText ?? `${tour.duration} days`}</span></div>
              <div className="flex items-center gap-2"><Star className="h-5 w-5 text-primary fill-primary"/> <span>{tour.rating}/5.0</span></div>
              <div className="flex items-center gap-2"><Tag className="h-5 w-5 text-primary"/> <span>{tour.tourType ?? tour.type}</span></div>
            </div>
            <Separator className="my-6" />
            <p className="text-muted-foreground mb-6">{tour.description}</p>
            
            {(tour.includes || tour.excludes) && (
              <>
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  {tour.includes && (
                    <div>
                      <h3 className="font-bold text-lg mb-2 text-green-700">Tour Includes</h3>
                      <ul className="space-y-2 text-sm">
                        {tour.includes.map((item, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {tour.excludes && (
                     <div>
                      <h3 className="font-bold text-lg mb-2 text-destructive">Tour Excludes</h3>
                      <ul className="space-y-2 text-sm">
                        {tour.excludes.map((item, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <XCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </>
            )}

            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-xl text-primary">Tour Details</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p><span className="font-semibold text-foreground">Duration:</span> {tour.durationText ?? `${tour.duration} days`}</p>
                <p><span className="font-semibold text-foreground">Type:</span> {tour.tourType ?? tour.type}</p>
                {tour.availabilityDescription && <p><span className="font-semibold text-foreground">Availability:</span> {tour.availabilityDescription}</p>}
                {tour.pickupAndDropoff && <p><span className="font-semibold text-foreground">Pick up & drop off:</span> {tour.pickupAndDropoff}</p>}
              </CardContent>
            </Card>

          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-3xl">Itinerary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tour.itinerary.map(item => (
                <div key={item.day} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                      {item.day}
                    </div>
                    {item.day !== tour.itinerary.length && <div className="w-px flex-grow bg-border"></div>}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-primary">Day {item.day}</h3>
                    <p className="text-muted-foreground">{item.activity}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {tour.cancellationPolicy && (
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-3xl">Cancellation Policy</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">{tour.cancellationPolicy}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right Column: Pricing & Booking */}
      <div className="lg:col-span-2">
        <div className="sticky top-24 space-y-6">
          {tour.highlights && (
             <Card>
              <CardHeader>
                <CardTitle className="font-headline text-3xl">Highlights</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  {tour.highlights.map((highlight, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{highlight}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-3xl">Pricing</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-semibold">Group Size</th>
                    <th className="text-center py-2 font-semibold">Adult</th>
                    <th className="text-center py-2 font-semibold">Child</th>
                  </tr>
                </thead>
                <tbody>
                  {tour.priceTiers.map((tier, index) => (
                    <tr key={index} className={`border-b ${tier.minPeople === currentPriceTier?.minPeople ? 'bg-primary/10' : ''}`}>
                      <td className="py-2 font-medium">{tier.minPeople}{tier.maxPeople ? ` - ${tier.maxPeople}` : '+'} persons</td>
                      <td className="py-2 text-center">${tier.pricePerAdult}</td>
                      <td className="py-2 text-center">${tier.pricePerChild}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-muted-foreground mt-2">*Infants travel for free.</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-3xl">Book Your Spot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="adults" className="font-semibold">Adults</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Button variant="outline" size="icon" onClick={() => setAdults(v => Math.max(1, v - 1))}><Minus className="h-4 w-4" /></Button>
                    <Input id="adults" type="text" readOnly value={adults} className="w-12 text-center" />
                    <Button variant="outline" size="icon" onClick={() => setAdults(v => v + 1)}><Plus className="h-4 w-4" /></Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="children" className="font-semibold">Children</Label>
                   <div className="flex items-center gap-2 mt-1">
                    <Button variant="outline" size="icon" onClick={() => setChildren(v => Math.max(0, v - 1))}><Minus className="h-4 w-4" /></Button>
                    <Input id="children" type="text" readOnly value={children} className="w-12 text-center" />
                    <Button variant="outline" size="icon" onClick={() => setChildren(v => v + 1)}><Plus className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Adults Price</span>
                  <span>{adults} x ${currentPriceTier?.pricePerAdult.toLocaleString()}</span>
                </div>
                 <div className="flex justify-between">
                  <span className="text-muted-foreground">Children Price</span>
                  <span>{children} x ${currentPriceTier?.pricePerChild.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-xl text-primary pt-2">
                  <span>Total Price</span>
                  <span>${totalPrice.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
                 <Button onClick={handleBooking} className="w-full" size="lg">
                    <ShoppingCart className="mr-2 h-5 w-5"/>
                    Add to Cart
                </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
