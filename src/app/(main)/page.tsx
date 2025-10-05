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
import { ArrowRight, Plane, Mountain, Utensils, FerrisWheel, Sailboat, Building2, Quote, Star, PlayCircle, Calendar, MapPin as MapPinIcon } from 'lucide-react';
import { ExclusiveTripIcon, ProfessionalGuideIcon, SafetyFirstIcon } from '@/components/icons';
import { CountdownTimer } from '@/components/countdown-timer';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


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
    <Link href={`/tours/${tour.slug}`} className="block group relative rounded-lg overflow-hidden shadow-lg text-white">
      <Image 
        src={tour.images[0]}
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
        <p className="text-sm">${tour.priceTiers[0].pricePerAdult}</p>
      </div>
    </Link>
  )
}

const testimonials = [
    {
      name: 'Brooklyn Simmons',
      role: 'Brooklyn Simmons',
      avatar: 'https://placehold.co/100x100.png',
      rating: 5,
      text: 'Praesent ut lacus a velit tincidunt aliquam a eget urna. Sed ullamcorper tristique nisl at pharetra turpis accumsan et etiam eu sollicitudin eros. In imperdiet accumsan.',
    },
    {
      name: 'Kristin Watson',
      role: 'Web Designer',
      avatar: 'https://placehold.co/100x100.png',
      rating: 5,
      text: 'Praesent ut lacus a velit tincidunt aliquam a eget urna. Sed ullamcorper tristique nisl at pharetra turpis accumsan et etiam eu sollicitudin eros. In imperdiet accumsan.',
    },
    {
      name: 'Wade Warren',
      role: 'President Of Sales',
      avatar: 'https://placehold.co/100x100.png',
      rating: 5,
      text: 'Praesent ut lacus a velit tincidunt aliquam a eget urna. Sed ullamcorper tristique nisl at pharetra turpis accumsan et etiam eu sollicitudin eros. In imperdiet accumsan.',
    },
    {
      name: 'Jane Doe',
      role: 'Adventurer',
      avatar: 'https://placehold.co/100x100.png',
      rating: 5,
      text: 'Praesent ut lacus a velit tincidunt aliquam a eget urna. Sed ullamcorper tristique nisl at pharetra turpis accumsan et etiam eu sollicitudin eros. In imperdiet accumsan.',
    }
];

const articles = [
  {
    title: 'Including Animation In Your Design System',
    date: 'December 02, 2024',
    location: 'New york City',
    image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
    aiHint: 'mountain landscape'
  },
  {
    title: 'How to design a user-centric landing page',
    date: 'December 01, 2024',
    location: 'London',
    image: 'https://images.unsplash.com/photo-1483728642387-6c351b40b7de?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
    aiHint: 'norway landscape'
  },
  {
    title: '10 best practices for modern web design',
    date: 'November 30, 2024',
    location: 'Paris',
    image: 'https://images.unsplash.com/photo-1502602898657-3e91760c0337?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
    aiHint: 'norway landscape'
  },
];

const heroImages = [
  {
    src: 'https://images.unsplash.com/photo-1572252433829-d6a3c659d832?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxfHxFeWdpdCUyMHRyYXZlbHxlbnwwfHx8MTc1Mjg4MTM3Mnww&ixlib=rb-4.1.0&q=80&w=1080',
    alt: 'Ancient Egyptian temples',
    hint: 'Egypt travel'
  },
  {
    src: 'https://images.unsplash.com/photo-1567157577867-05ccb1388e66?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwzfHxFeWdpdCUyMHRyYXZlbHxlbnwwfHx8fDE3NTI4ODEzNzJ8MA&ixlib=rb-4.1.0&q=80&w=1080',
    alt: 'Hot air balloons over Luxor',
    hint: 'Egypt balloons'
  },
  {
    src: 'https://images.unsplash.com/photo-1552596455-1f6c44244246?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw1fHxFeWdpdCUyMHRyYXZlbHxlbnwwfHx8fDE3NTI4ODEzNzJ8MA&ixlib=rb-4.1.0&q=80&w=1080',
    alt: 'The Nile river at sunset',
    hint: 'Egypt nile'
  }
];

import { useRouter } from 'next/navigation';

export default function Home() {
  const tours = getTours();
  const categories = ["Adventure", "Relaxation", "Cultural", "Culinary", "Family", "Honeymoon"];
  const egyptianDestinations = ["Cairo", "Luxor", "Aswan", "Sharm El Sheikh", "Hurghada", "Alexandria"];

  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [destination, setDestination] = React.useState('');
  const [tourType, setTourType] = React.useState('');

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery) {
      params.set('q', searchQuery);
    }
    if (destination) {
      params.set('destination', destination);
    }
    if (tourType) {
      params.set('type', tourType);
    }
    router.push(`/tours/search?${params.toString()}`);
  };

  return (
    <div className="space-y-16 md:space-y-24">
      {/* Hero Section */}
      <section className="relative h-[60vh] min-h-[400px] flex items-center justify-center">
        <Image
          src="https://images.unsplash.com/photo-1572252433829-d6a3c659d832?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxfHxFeWdpdCUyMHRyYXZlbHxlbnwwfHx8MTc1Mjg4MTM3Mnww&ixlib=rb-4.1.0&q=80&w=1080"
          alt="Ancient Egyptian temples"
          fill
          className="object-cover"
          priority
          data-ai-hint="Egypt travel"
        />
        <div className="absolute inset-0 bg-black/50 z-10" />
        <div className="relative z-20 container mx-auto px-4 text-center text-white">
          <h1 className="font-headline text-4xl md:text-6xl font-bold leading-tight mb-4">Let's Make Your Best<br />Trip With Us</h1>
          <p className="text-lg md:text-xl max-w-2xl mx-auto mb-8">
            Explore the world with our curated travel packages. Adventure awaits!
          </p>
          <div className="max-w-3xl mx-auto p-4 bg-white/20 backdrop-blur-sm border-0 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Input 
                  placeholder="Search tour..." 
                  className="bg-white text-foreground col-span-1 md:col-span-2"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Select value={destination} onValueChange={setDestination}>
                  <SelectTrigger className="bg-white text-foreground"><SelectValue placeholder="Destination" /></SelectTrigger>
                  <SelectContent>
                    {egyptianDestinations.map(dest => (
                        <SelectItem key={dest} value={dest.toLowerCase()}>{dest}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Select value={tourType} onValueChange={setTourType}>
                  <SelectTrigger className="bg-white text-foreground"><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cultural">Cultural</SelectItem>
                    <SelectItem value="adventure">Adventure</SelectItem>
                    <SelectItem value="culinary">Culinary</SelectItem>
                    <SelectItem value="relaxation">Relaxation</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="lg" className="w-full" onClick={handleSearch}>Search</Button>
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
                <Link href="/tours">View All Tour <ArrowRight className="ml-2 h-4 w-4" /></Link>
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

      {/* Testimonials Section */}
      <section className="container mx-auto px-4">
        <div className="text-center mb-12">
            <p className="text-primary font-medium">Testimonial</p>
            <h2 className="font-headline text-3xl md:text-4xl font-bold text-foreground">Our Clients Feedback</h2>
        </div>
        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-4">
            {testimonials.map((testimonial, index) => (
              <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3 pl-4">
                <div className="p-1">
                   <Card className="p-6 relative">
                      <CardContent className="p-0">
                        <div className="flex mb-4">
                          {[...Array(testimonial.rating)].map((_, i) => <Star key={i} className="h-5 w-5 text-amber-400 fill-amber-400" />)}
                        </div>
                        <p className="text-muted-foreground mb-6">{testimonial.text}</p>
                        <div className="flex items-center gap-4">
                          <Avatar>
                            <AvatarImage src={testimonial.avatar} alt={testimonial.name} data-ai-hint="person portrait" />
                            <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-foreground">{testimonial.name}</p>
                            <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                          </div>
                        </div>
                        <Quote className="absolute bottom-6 right-6 h-12 w-12 text-primary/10" />
                      </CardContent>
                   </Card>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="flex justify-center gap-4 mt-8">
              <CarouselPrevious className="static translate-y-0" />
              <CarouselNext className="static translate-y-0" />
          </div>
        </Carousel>
      </section>

      {/* Video Section */}
      <section className="relative py-20 md:py-32 text-white">
        <div className="absolute inset-0 bg-black/60 z-10" />
        <Image
          src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
          alt="Woman in a boat on a lake with dramatic cliffs"
          layout="fill"
          objectFit="cover"
          className="object-cover"
          data-ai-hint="woman cliff lake"
        />
        <div className="container mx-auto px-4 relative z-20 text-center">
          <p className="text-primary font-semibold">Watch Our Story</p>
          <h2 className="font-headline text-3xl md:text-5xl font-bold mt-2">We Provide The Best Tour Facilities</h2>
          <div className="mt-8 flex justify-center items-center gap-6">
            <Button size="lg">Find Out More <ArrowRight className="ml-2" /></Button>
            <Button variant="link" className="text-white text-lg font-semibold hover:text-primary">
              <PlayCircle className="mr-2 h-8 w-8 text-primary" />
              Watch Video
            </Button>
          </div>
        </div>
      </section>
      
      {/* News & Articles Section */}
      <section className="container mx-auto px-4">
        <div className="text-center mb-12">
            <p className="text-primary font-medium">News & Updates</p>
            <h2 className="font-headline text-3xl md:text-4xl font-bold text-foreground">Our Latest News & Articles</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {articles.map((article, index) => (
            <Card key={index} className="overflow-hidden group">
              <div className="relative h-52">
                <Image src={article.image} alt={article.title} layout="fill" objectFit="cover" className="transition-transform duration-500 group-hover:scale-110" data-ai-hint={article.aiHint} />
              </div>
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {article.date}</div>
                  <div className="flex items-center gap-1.5"><MapPinIcon className="h-4 w-4" /> {article.location}</div>
                </div>
                <h3 className="text-xl font-headline font-semibold text-foreground h-16">{article.title}</h3>
                <Button variant="link" asChild className="p-0 h-auto text-primary">
                  <Link href="#">Read More <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

    </div>
  );
}