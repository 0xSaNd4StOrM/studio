"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { getTours } from "@/lib/supabase/tours";
import type { Tour } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TourCard } from "@/components/tour-card";
import {
  ArrowRight,
  Plane,
  Mountain,
  Utensils,
  FerrisWheel,
  Sailboat,
  Building2,
  Quote,
  Star,
  PlayCircle,
  Calendar,
  MapPin as MapPinIcon,
} from "lucide-react";
import {
  ExclusiveTripIcon,
  ProfessionalGuideIcon,
  SafetyFirstIcon,
} from "@/components/icons";
import { CountdownTimer } from "@/components/countdown-timer";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const categoryIcons = {
  Adventure: <Mountain className="h-8 w-8 text-primary" />,
  Relaxation: <Sailboat className="h-8 w-8 text-primary" />,
  Cultural: <Building2 className="h-8 w-8 text-primary" />,
  Culinary: <Utensils className="h-8 w-8 text-primary" />,
  Family: <FerrisWheel className="h-8 w-8 text-primary" />,
  Honeymoon: <Plane className="h-8 w-8 text-primary" />,
};

const defaultContent = {
  hero: {
    title: "Let's Make Your Best<br />Trip With Us",
    subtitle:
      "Explore the world with our curated travel packages. Adventure awaits!",
    imageUrl: "https://placehold.co/1920x1080.png",
    imageAlt: "Ancient Egyptian temples",
  },
  whyChooseUs: {
    pretitle: "Why Choose Us",
    title: "Great Opportunity For<br/>Adventure & Travels",
    feature1: {
      title: "Safety First",
      description:
        "We prioritize your safety to ensure you have a worry-free and memorable experience.",
    },
    feature2: {
      title: "Professional Guide",
      description:
        "Our guides are local experts who bring destinations to life with their passion and knowledge.",
    },
    feature3: {
      title: "Exclusive Trip",
      description:
        "We offer unique itineraries and exclusive access to create once-in-a-lifetime journeys.",
    },
  },
  discountBanners: {
    banner1: {
      title: "35% OFF",
      description: "Explore The World tour Hotel Booking.",
    },
    banner2: {
      title: "35% OFF",
      description: "On Flight Ticket Grab This Now.",
    },
  },
  lastMinuteOffers: {
    discount: "50%",
    pretitle: "Deals & Offers",
    title: "Incredible Last-Minute Offers",
  },
  testimonials: [
    {
      name: "Brooklyn Simmons",
      role: "Brooklyn Simmons",
      avatar: "https://placehold.co/100x100.png",
      text:
        "Praesent ut lacus a velit tincidunt aliquam a eget urna. Sed ullamcorper tristique nisl at pharetra turpis accumsan et etiam eu sollicitudin eros. In imperdiet accumsan.",
    },
    {
      name: "Kristin Watson",
      role: "Web Designer",
      avatar: "https://placehold.co/100x100.png",
      text:
        "Praesent ut lacus a velit tincidunt aliquam a eget urna. Sed ullamcorper tristique nisl at pharetra turpis accumsan et etiam eu sollicitudin eros. In imperdiet accumsan.",
    },
    {
      name: "Wade Warren",
      role: "President Of Sales",
      avatar: "https://placehold.co/100x100.png",
      text:
        "Praesent ut lacus a velit tincidunt aliquam a eget urna. Sed ullamcorper tristique nisl at pharetra turpis accumsan et etiam eu sollicitudin eros. In imperdiet accumsan.",
    },
    {
      name: "Jane Doe",
      role: "Adventurer",
      avatar: "https://placehold.co/100x100.png",
      text:
        "Praesent ut lacus a velit tincidunt aliquam a eget urna. Sed ullamcorper tristique nisl at pharetra turpis accumsan et etiam eu sollicitudin eros. In imperdiet accumsan.",
    },
  ],
  videoSection: {
    pretitle: "Watch Our Story",
    title: "We Provide The Best Tour Facilities",
  },
  newsSection: {
    pretitle: "News & Updates",
    title: "Our Latest News & Articles",
  },
};

const articles = [
  {
    title: "Including Animation In Your Design System",
    date: "December 02, 2024",
    location: "New york City",
    image:
      "https://images.unsplash.com/photo-1519681393784-d120267933ba?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
    aiHint: "mountain landscape",
  },
  {
    title: "How to design a user-centric landing page",
    date: "December 01, 2024",
    location: "London",
    image:
      "https://images.unsplash.com/photo-1483728642387-6c351b40b7de?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
    aiHint: "norway landscape",
  },
  {
    title: "10 best practices for modern web design",
    date: "November 30, 2024",
    location: "Paris",
    image:
      "https://images.unsplash.com/photo-1502602898657-3e91760c0337?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
    aiHint: "norway landscape",
  },
];

function LastMinuteOfferCard({ tour }: { tour: Tour }) {
  if (!tour || !tour.images || tour.images.length === 0) return null;
  return (
    <Link
      href={`/tours/${tour.slug}`}
      className="block group relative rounded-lg overflow-hidden shadow-lg text-white"
    >
      <Image
        src={tour.images[0]}
        alt={tour.name}
        width={300}
        height={400}
        className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110"
        data-ai-hint={`${tour.destination} travel`}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div className="absolute top-2 left-2 bg-primary/80 text-primary-foreground px-2 py-1 text-xs font-bold rounded-md">
        -50% OFF
      </div>
      <div className="absolute bottom-0 left-0 p-4">
        <h3 className="font-bold text-lg">{tour.destination}</h3>
        <p className="text-sm">${tour.priceTiers[0]?.pricePerAdult}</p>
      </div>
    </Link>
  );
}

export default function Home() {
  const [tours, setTours] = React.useState<Tour[]>([]);
  const [homeContent, setHomeContent] = React.useState<any>(defaultContent);
  const [testimonials, setTestimonials] = React.useState<any[]>(
    defaultContent.testimonials.map((t) => ({ ...t, rating: 5 })),
  );
  const categories = [
    "Adventure",
    "Relaxation",
    "Cultural",
    "Culinary",
    "Family",
    "Honeymoon",
  ];
  const egyptianDestinations = [
    "Cairo",
    "Luxor",
    "Aswan",
    "Sharm El Sheikh",
    "Hurghada",
    "Alexandria",
  ];

  React.useEffect(() => {
    const fetchTours = async () => {
      const fetchedTours = await getTours();
      setTours(fetchedTours);
    };
    fetchTours();
  }, []);

  React.useEffect(() => {
    const loadHomeContent = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("home_page_content")
          .select("data")
          .eq("id", 1)
          .maybeSingle();
        if (!error && data && (data as any).data) {
          const content = (data as any).data;
          setHomeContent({ ...defaultContent, ...content });
          if (content?.testimonials && Array.isArray(content.testimonials)) {
            setTestimonials(
              content.testimonials.map((t: any) => ({ ...t, rating: 5 })),
            );
          }
        }
      } catch (_) {
        // ignore
      }
    };
    loadHomeContent();
  }, []);

  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [destination, setDestination] = React.useState("");
  const [tourType, setTourType] = React.useState("");

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery) {
      params.set("q", searchQuery);
    }
    if (destination) {
      params.set("destination", destination);
    }
    if (tourType) {
      params.set("type", tourType);
    }
    router.push(`/tours/search?${params.toString()}`);
  };

  return (
    <div className="space-y-12 md:space-y-20">
      {/* Hero Section */}
      <section className="relative h-[70vh] md:h-[60vh] min-h-[450px] flex items-center justify-center">
        <Image
          src={homeContent.hero.imageUrl || defaultContent.hero.imageUrl}
          alt={homeContent.hero.imageAlt || defaultContent.hero.imageAlt}
          fill
          className="object-cover"
          priority
          data-ai-hint="Egypt travel"
        />
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-primary/60 via-accent/40 to-transparent" />
        <div className="relative z-20 container mx-auto px-4 text-center text-white">
          <h1
            className="font-headline text-3xl sm:text-4xl md:text-6xl font-bold leading-tight mb-4"
            dangerouslySetInnerHTML={{ __html: homeContent.hero.title }}
          />
          <p className="text-lg md:text-xl max-w-2xl mx-auto mb-8">
            {homeContent.hero.subtitle}
          </p>
          <div className="max-w-3xl mx-auto p-4 bg-white/20 backdrop-blur-sm border rounded-lg ring-1 ring-primary/30">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Input
                placeholder="Search tour..."
                className="bg-white text-foreground col-span-1 md:col-span-2 focus-visible:ring-2 focus-visible:ring-primary"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Select value={destination} onValueChange={setDestination}>
                <SelectTrigger className="bg-white text-foreground focus:ring-primary">
                  <SelectValue placeholder="Destination" />
                </SelectTrigger>
                <SelectContent>
                  {egyptianDestinations.map((dest) => (
                    <SelectItem key={dest} value={dest.toLowerCase()}>
                      {dest}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={tourType} onValueChange={setTourType}>
                <SelectTrigger className="bg-white text-foreground focus:ring-primary">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cultural">Cultural</SelectItem>
                  <SelectItem value="adventure">Adventure</SelectItem>
                  <SelectItem value="culinary">Culinary</SelectItem>
                  <SelectItem value="relaxation">Relaxation</SelectItem>
                </SelectContent>
              </Select>
              <Button size="lg" className="w-full" onClick={handleSearch}>
                Search
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="container mx-auto px-4 -mt-32 relative z-20">
        <div className="bg-background rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <h2 className="font-headline text-3xl font-bold text-foreground">
              Browse By Destination Category
            </h2>
            <p className="text-muted-foreground mt-2">
              Select a category to see our exclusive tour packages
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
            {categories.map((category) => (
              <div
                key={category}
                className="flex flex-col items-center justify-center gap-3 text-center"
              >
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center transition-all hover:bg-primary hover:[&>svg]:text-white">
                  {categoryIcons[category as keyof typeof categoryIcons]}
                </div>
                <span className="font-semibold text-foreground">
                  {category}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-primary font-medium">
              {homeContent.whyChooseUs.pretitle}
            </p>
            <h2 className="font-headline text-3xl md:text-4xl font-bold text-foreground mt-2">
              <span
                dangerouslySetInnerHTML={{
                  __html: homeContent.whyChooseUs.title,
                }}
              />
            </h2>
            <div className="space-y-6 mt-8">
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-full text-primary">
                  <SafetyFirstIcon className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">
                    {homeContent.whyChooseUs.feature1.title}
                  </h3>
                  <p className="text-muted-foreground mt-1">
                    {homeContent.whyChooseUs.feature1.description}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-full text-primary">
                  <ProfessionalGuideIcon className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">
                    {homeContent.whyChooseUs.feature2.title}
                  </h3>
                  <p className="text-muted-foreground mt-1">
                    {homeContent.whyChooseUs.feature2.description}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-full text-primary">
                  <ExclusiveTripIcon className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">
                    {homeContent.whyChooseUs.feature3.title}
                  </h3>
                  <p className="text-muted-foreground mt-1">
                    {homeContent.whyChooseUs.feature3.description}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="relative h-full min-h-[400px]">
            <Image
              src="https://images.unsplash.com/photo-1699115823831-cf1329dfc58f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw4fHxhZHZlbnR1cmUlMjB0cmF2ZWx8ZW58MHx8fHwxNzUyNjIyOTA5fDA&ixlib=rb-4.1.0&q=80&w=1080"
              alt="Adventure travel"
              fill
              style={{ objectFit: 'cover' }}
              className="rounded-lg"
              data-ai-hint="adventure travel"
            />
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
            <h2 className="font-headline text-3xl md:text-4xl font-bold text-foreground">
              Popular Tours We Offer
            </h2>
          </div>
          <Button variant="outline" asChild>
            <Link href="/tours">
              View All Tour <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tours.slice(0, 6).map((tour) => (
            <TourCard key={tour.id} tour={tour} />
          ))}
        </div>
      </section>

      {/* Discount Banners */}
      <section className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-cyan-100 rounded-lg p-8 flex items-center justify-between overflow-hidden relative">
            <div>
              <h3 className="text-3xl font-bold text-primary">
                {homeContent.discountBanners.banner1.title}
              </h3>
              <p className="text-lg text-primary/80">
                {homeContent.discountBanners.banner1.description}
              </p>
              <Button className="mt-4">
                Book Now <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <div className="relative w-48 h-32 hidden md:block">
              <Image
                src="https://placehold.co/200x150.png"
                alt="Travel items"
                data-ai-hint="travel suitcase"
                fill
                style={{ objectFit: 'contain' }}
              />
            </div>
          </div>
          <div className="bg-blue-900 text-white rounded-lg p-8 flex items-center justify-between overflow-hidden relative">
            <div>
              <h3 className="text-3xl font-bold">
                {homeContent.discountBanners.banner2.title}
              </h3>
              <p className="text-lg text-blue-200">
                {homeContent.discountBanners.banner2.description}
              </p>
              <Button variant="secondary" className="mt-4">
                Book Now <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <div className="relative w-48 h-32 hidden md:block">
              <Image
                src="https://placehold.co/200x150.png"
                alt="Flight items"
                data-ai-hint="airplane travel"
                fill
                style={{ objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Last Minute Offers */}
      <section className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 bg-cyan-500 rounded-lg overflow-hidden text-white">
          <div className="bg-slate-800 p-8 lg:p-12 flex flex-col justify-center items-center text-center">
            <h2 className="text-6xl md:text-8xl font-bold font-headline">
              {homeContent.lastMinuteOffers.discount}
              <span className="text-5xl align-top"> OFF</span>
            </h2>
            <CountdownTimer />
          </div>
          <div className="lg:col-span-2 p-8 lg:p-12 relative">
            <Plane className="absolute top-4 right-4 text-white/20 h-16 w-16 -rotate-45" />
            <p className="font-semibold text-white/80">
              {homeContent.lastMinuteOffers.pretitle}
            </p>
            <h2 className="font-headline text-3xl md:text-4xl font-bold text-white mt-2">
              {homeContent.lastMinuteOffers.title}
            </h2>
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
          <h2 className="font-headline text-3xl md:text-4xl font-bold text-foreground">
            Our Clients Feedback
          </h2>
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
              <CarouselItem
                key={index}
                className="md:basis-1/2 lg:basis-1/3 pl-4"
              >
                <div className="p-1">
                  <Card className="p-6 relative">
                    <CardContent className="p-0">
                      <div className="flex mb-4">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star
                            key={i}
                            className="h-5 w-5 text-amber-400 fill-amber-400"
                          />
                        ))}
                      </div>
                      <p className="text-muted-foreground mb-6">
                        {testimonial.text}
                      </p>
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarImage
                            src={testimonial.avatar}
                            alt={testimonial.name}
                            data-ai-hint="person portrait"
                          />
                          <AvatarFallback>
                            {testimonial.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-foreground">
                            {testimonial.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {testimonial.role}
                          </p>
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
          fill
          style={{ objectFit: 'cover' }}
          className="object-cover"
          data-ai-hint="woman cliff lake"
        />
        <div className="container mx-auto px-4 relative z-20 text-center">
          <p className="text-primary font-semibold">
            {homeContent.videoSection.pretitle}
          </p>
          <h2 className="font-headline text-3xl md:text-5xl font-bold mt-2">
            {homeContent.videoSection.title}
          </h2>
          <div className="mt-8 flex justify-center items-center gap-6">
            <Button size="lg">
              Find Out More <ArrowRight className="ml-2" />
            </Button>
            <Button
              variant="link"
              className="text-white text-lg font-semibold hover:text-primary"
            >
              <PlayCircle className="mr-2 h-8 w-8 text-primary" />
              Watch Video
            </Button>
          </div>
        </div>
      </section>

      {/* News & Articles Section */}
      <section className="container mx-auto px-4">
        <div className="text-center mb-12">
          <p className="text-primary font-medium">
            {homeContent.newsSection.pretitle}
          </p>
          <h2 className="font-headline text-3xl md:text-4xl font-bold text-foreground">
            {homeContent.newsSection.title}
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {articles.map((article, index) => (
            <Card key={index} className="overflow-hidden group">
              <div className="relative h-52">
                <Image
                  src={article.image}
                  alt={article.title}
                  fill
                  style={{ objectFit: 'cover' }}
                  className="transition-transform duration-500 group-hover:scale-110"
                  data-ai-hint={article.aiHint}
                />
              </div>
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" /> {article.date}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPinIcon className="h-4 w-4" /> {article.location}
                  </div>
                </div>
                <h3 className="text-xl font-headline font-semibold text-foreground h-16">
                  {article.title}
                </h3>
                <Button
                  variant="link"
                  asChild
                  className="p-0 h-auto text-primary"
                >
                  <Link href="#">
                    Read More <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
