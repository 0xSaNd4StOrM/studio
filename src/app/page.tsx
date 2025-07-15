
"use client"

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getTours } from '@/lib/tours';
import type { Tour } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TourCard } from '@/components/tour-card';
import { ArrowRight, Plane, Mountain, Utensils, FerrisWheel, Sailboat, Building2 } from 'lucide-react';
import { ExclusiveTripIcon, ProfessionalGuideIcon, SafetyFirstIcon } from '@/components/icons';
import { CountdownTimer } from '@/components/countdown-timer';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

const categoryIcons = {
  "Adventure": <Mountain className="h-8 w-8 text-primary" />,
  "Relaxation": <Sailboat className="h-8 w-8 text-primary" />,
  "Cultural": <Building2 className="h-8 w-8 text-primary" />,
  "Culinary": <Utensils className="h-8 w-8 text-primary" />,
  "Family": <FerrisWheel className="h-8 w-8 text-primary" />,
  "Honeymoon": <Plane className="h-8 w-8 text-primary" />,
};

function LastMinuteOfferCard({ tour }: { tour: Tour }) {
  return (
    <Link href={`/tours/${tour.id}`} className="block group relative rounded-lg overflow-hidden shadow-lg text-white">
      <Image 
        src={tour.image}
        alt={tour.name}
        width={300}
        height={400}
        className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110"
        data-ai-hint={`${tour.destination} travel`}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div className="absolute top-2 left-2 bg-primary/80 text-primary-foreground px-2 py-1 text-xs font-bold rounded-md">-50% OFF</div>
      <div className="absolute bottom-0 left-0 p-4">
        <h3 className="font-bold text-lg">{tour.destination}</h3>
        <p className="text-sm">${tour.price}</p>
      </div>
    </Link>
  )
}

export default function Home() {
  const tours = getTours();
  const categories = ["Adventure", "Relaxation", "Cultural", "Culinary", "Family", "Honeymoon"];

  return (
    <div className="space-y-16 md:space-y-24">
      {/* Hero Section */}
      <section className="relative h-[80vh] min-h-[500px] flex items-center text-white">
        <div className="absolute inset-0 bg-black/50 z-10" />
        <Image
          src="https://images.unsplash.com/photo-1646194117458-49fba634fbb1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw3fHx0cm9waWNhbCUyMHBhcmFkaXNlfGVufDB8fHx8MTc1MjYyMjkwOXww&ixlib=rb-4.1.0&q=80&w=1080"
          alt="Tropical paradise"
          fill
          className="object-cover"
          priority
          data-ai-hint="tropical paradise"
        />
        <div className="container mx-auto px-4 relative z-20 text-center">
          <h1 className="font-headline text-4xl md:text-6xl font-bold leading-tight mb-4">Let's Make Your Best<br />Trip With Us</h1>
          <p className="text-lg md:text-xl max-w-2xl mx-auto mb-8">
            Explore the world with our curated travel packages. Adventure awaits!
          </p>
          <div className="max-w-3xl mx-auto p-4 bg-white/20 backdrop-blur-sm border-0 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Input placeholder="Search tour..." className="bg-white text-foreground col-span-1 md:col-span-2" />
                <Select>
                  <SelectTrigger className="bg-white text-foreground"><SelectValue placeholder="Destination" /></SelectTrigger>
                  <SelectContent>
                     {Array.from(new Set(tours.map(tour => tour.destination))).map(destination => (
                        <SelectItem key={destination} value={destination.toLowerCase()}>{destination}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                 <Select>
                  <SelectTrigger className="bg-white text-foreground"><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cultural">Cultural</SelectItem>
                    <SelectItem value="adventure">Adventure</SelectItem>
                    <SelectItem value="culinary">Culinary</SelectItem>
                    <SelectItem value="relaxation">Relaxation</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="lg" className="w-full">Search</Button>
              </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="container mx-auto px-4 -mt-32 relative z-20">
        <div className="bg-background rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <h2 className="font-headline text-3xl font-bold text-foreground">Browse By Destination Category</h2>
            <p className="text-muted-foreground mt-2">Select a category to see our exclusive tour packages</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
            {categories.map((category) => (
              <div key={category} className="flex flex-col items-center justify-center gap-3 text-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center transition-all hover:bg-primary hover:[&>svg]:text-white">
                  {categoryIcons[category as keyof typeof categoryIcons]}
                </div>
                <span className="font-semibold text-foreground">{category}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Why Choose Us Section */}
      <section className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-primary font-medium">Why Choose Us</p>
            <h2 className="font-headline text-3xl md:text-4xl font-bold text-foreground mt-2">Great Opportunity For<br/>Adventure & Travels</h2>
            <div className="space-y-6 mt-8">
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-full text-primary">
                  <SafetyFirstIcon className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">Safety First</h3>
                  <p className="text-muted-foreground mt-1">We prioritize your safety to ensure you have a worry-free and memorable experience.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-full text-primary">
                  <ProfessionalGuideIcon className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">Professional Guide</h3>
                  <p className="text-muted-foreground mt-1">Our guides are local experts who bring destinations to life with their passion and knowledge.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-full text-primary">
                  <ExclusiveTripIcon className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">Exclusive Trip</h3>
                  <p className="text-muted-foreground mt-1">We offer unique itineraries and exclusive access to create once-in-a-lifetime journeys.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="relative h-full min-h-[400px]">
            <Image src="https://images.unsplash.com/photo-1699115823831-cf1329dfc58f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw4fHxhZHZlbnR1cmUlMjB0cmF2ZWx8ZW58MHx8fHwxNzUyNjIyOTA5fDA&ixlib=rb-4.1.0&q=80&w=1080" alt="Adventure travel" layout="fill" objectFit="cover" className="rounded-lg" data-ai-hint="adventure travel" />
            <div className="absolute -bottom-8 -right-8 bg-primary text-white p-6 rounded-lg shadow-lg w-52 text-center">
              <p className="text-4xl font-bold">25+</p>
              <p>Years Of Experience</p>
            </div>
          </div>
        </div>
      </section>


      {/* Popular Destinations Section */}
      <section className="container mx-auto px-4" id="tours">
        <div className="flex justify-between items-center mb-8">
            <div>
              <p className="text-primary font-medium">Top Destinations</p>
              <h2 className="font-headline text-3xl md:text-4xl font-bold text-foreground">Popular Tours We Offer</h2>
            </div>
            <Button variant="outline" asChild>
                <Link href="#">View All Tour <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tours.slice(0, 6).map(tour => (
            <TourCard key={tour.id} tour={tour} />
          ))}
        </div>
      </section>

      {/* Discount Banners */}
      <section className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-cyan-100 rounded-lg p-8 flex items-center justify-between overflow-hidden relative">
            <div>
              <h3 className="text-3xl font-bold text-primary">35% OFF</h3>
              <p className="text-lg text-primary/80">Explore The World tour Hotel Booking.</p>
              <Button className="mt-4">Book Now <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </div>
            <div className="relative w-48 h-32 hidden md:block">
              <Image src="https://placehold.co/200x150.png" alt="Travel items" data-ai-hint="travel suitcase" layout="fill" objectFit="contain" />
            </div>
          </div>
          <div className="bg-blue-900 text-white rounded-lg p-8 flex items-center justify-between overflow-hidden relative">
            <div>
              <h3 className="text-3xl font-bold">35% OFF</h3>
              <p className="text-lg text-blue-200">On Flight Ticket Grab This Now.</p>
              <Button variant="secondary" className="mt-4">Book Now <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </div>
             <div className="relative w-48 h-32 hidden md:block">
              <Image src="https://placehold.co/200x150.png" alt="Flight items" data-ai-hint="airplane travel" layout="fill" objectFit="contain" />
            </div>
          </div>
        </div>
      </section>

      {/* Last Minute Offers */}
      <section className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 bg-cyan-500 rounded-lg overflow-hidden text-white">
          <div className="bg-slate-800 p-8 lg:p-12 flex flex-col justify-center items-center text-center">
             <h2 className="text-6xl md:text-8xl font-bold font-headline">50% <span className="text-5xl align-top">OFF</span></h2>
             <CountdownTimer />
          </div>
          <div className="lg:col-span-2 p-8 lg:p-12 relative">
            <Plane className="absolute top-4 right-4 text-white/20 h-16 w-16 -rotate-45" />
            <p className="font-semibold text-white/80">Deals & Offers</p>
            <h2 className="font-headline text-3xl md:text-4xl font-bold text-white mt-2">Incredible Last-Minute Offers</h2>
            <div className="mt-8">
              <Carousel
                opts={{
                  align: "start",
                  loop: true,
                }}
                className="w-full"
              >
                <CarouselContent>
                  {tours.slice(0, 4).map((tour, index) => (
                    <CarouselItem key={index} className="md:basis-1/2">
                      <div className="p-1">
                        <LastMinuteOfferCard tour={tour} />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <div className="absolute -top-16 right-0 flex gap-2">
                  <CarouselPrevious className="static translate-y-0 bg-white/20 hover:bg-white/40 text-white border-0" />
                  <CarouselNext className="static translate-y-0 bg-white/20 hover:bg-white/40 text-white border-0" />
                </div>
              </Carousel>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
