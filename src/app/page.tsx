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
import { ArrowRight } from 'lucide-react';

export default function Home() {
  const tours = getTours();

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
      
      {/* Discount Banners */}
      <section className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-cyan-100 rounded-lg p-8 flex items-center justify-between">
            <div>
              <h3 className="text-3xl font-bold text-primary">35% OFF</h3>
              <p className="text-lg text-primary/80">Explore The World tour Hotel Booking.</p>
              <Button className="mt-4">Book Now <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </div>
            <div className="relative w-48 h-32 hidden md:block">
              <Image src="https://placehold.co/200x150.png" alt="Travel items" data-ai-hint="travel suitcase" layout="fill" objectFit="contain" />
            </div>
          </div>
          <div className="bg-blue-900 text-white rounded-lg p-8 flex items-center justify-between">
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

      {/* Popular Destinations Section */}
      <section className="container mx-auto px-4" id="tours">
        <div className="flex justify-between items-center mb-8">
            <div>
              <p className="text-primary font-medium">Best Recommended Places</p>
              <h2 className="font-headline text-3xl md:text-4xl font-bold text-foreground">Popular Destination We Offer For All</h2>
            </div>
            <Button variant="outline" asChild>
                <Link href="#">View All Tour <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {tours.slice(0, 8).map(tour => (
            <TourCard key={tour.id} tour={tour} />
          ))}
        </div>
      </section>

    </div>
  );
}
