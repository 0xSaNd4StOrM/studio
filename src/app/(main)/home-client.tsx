"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import type { Tour, Post } from "@/types";
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
import { Skeleton } from "@/components/ui/skeleton";
import { motion, Variants } from "framer-motion";

// Animation Variants
const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.6, ease: "easeOut" } 
  },
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.8 } },
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const categoryIcons = {
  Adventure: <Mountain className="h-8 w-8 text-primary" />,
  Relaxation: <Sailboat className="h-8 w-8 text-primary" />,
  Cultural: <Building2 className="h-8 w-8 text-primary" />,
  Culinary: <Utensils className="h-8 w-8 text-primary" />,
  Family: <FerrisWheel className="h-8 w-8 text-primary" />,
  Honeymoon: <Plane className="h-8 w-8 text-primary" />,
};

function LastMinuteOfferCard({ tour }: { tour: Tour }) {
  if (!tour || !tour.images || tour.images.length === 0) return null;
  return (
    <Link
      href={`/tours/${tour.slug}`}
      className="block group relative rounded-lg overflow-hidden shadow-lg text-white h-full"
    >
      <div className="relative h-64 w-full overflow-hidden">
        <Image
          src={tour.images[0]}
          alt={tour.name}
          fill
          className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-110"
          data-ai-hint={`${tour.destination} travel`}
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      <div className="absolute top-2 left-2 bg-primary/90 backdrop-blur-sm text-primary-foreground px-3 py-1 text-xs font-bold rounded-md shadow-md">
        -50% OFF
      </div>
      <div className="absolute bottom-0 left-0 p-4 w-full">
        <h3 className="font-bold text-xl mb-1 font-headline">{tour.destination}</h3>
        <p className="text-sm font-medium opacity-90">${tour.priceTiers[0]?.pricePerAdult}</p>
      </div>
    </Link>
  );
}

interface Testimonial {
  id: string;
  name: string;
  role: string;
  content: string;
  avatar: string;
  rating?: number;
}

interface HeroSection {
  imageUrl: string;
  imageAlt: string;
  title: string;
  subtitle: string;
}

interface Feature {
  title: string;
  description: string;
}

interface WhyChooseUsSection {
  pretitle: string;
  title: string;
  feature1: Feature;
  feature2: Feature;
  feature3: Feature;
}

interface DiscountBanner {
  title: string;
  description: string;
}

interface DiscountBannersSection {
  banner1: DiscountBanner;
  banner2: DiscountBanner;
}

interface LastMinuteOffersSection {
  discount: string;
  pretitle: string;
  title: string;
}

interface VideoSection {
  pretitle: string;
  title: string;
}

interface NewsSection {
  pretitle: string;
  title: string;
}

interface HomeContent {
  testimonials?: Testimonial[];
  hero: HeroSection;
  whyChooseUs: WhyChooseUsSection;
  discountBanners: DiscountBannersSection;
  lastMinuteOffers: LastMinuteOffersSection;
  videoSection: VideoSection;
  newsSection: NewsSection;
}

interface HomePageClientProps {
  initialTours: Tour[];
  homeContent: HomeContent | null;
  articles: Post[];
}

export default function HomePageClient({ initialTours, homeContent, articles = [] }: HomePageClientProps) {
  const [testimonials, setTestimonials] = React.useState<Testimonial[]>([]);
  const tours = initialTours;

  React.useEffect(() => {
    if (homeContent?.testimonials && Array.isArray(homeContent.testimonials)) {
      setTestimonials(
        homeContent.testimonials.map((t) => ({ ...t, rating: 5 })),
      );
    }
  }, [homeContent]);

  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [destination, setDestination] = React.useState("");
  const [tourType, setTourType] = React.useState("");

  if (!homeContent) {
    return (
      <div className="space-y-12 md:space-y-20">
        {/* Hero Skeleton */}
        <div className="relative h-[70vh] md:h-[80vh] min-h-[550px] w-full bg-muted animate-pulse" />
        
        {/* Categories Skeleton */}
        <div className="container mx-auto px-4 -mt-24 relative z-20">
          <div className="bg-background rounded-xl shadow-2xl p-8 border border-border/50">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex flex-col items-center gap-3">
                  <Skeleton className="h-20 w-20 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Tours Skeleton */}
        <div className="container mx-auto px-4 space-y-8 mt-20">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-64" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-[350px] w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

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

  return (
    <div className="space-y-20 md:space-y-32 overflow-hidden">
      {/* Hero Section */}
      <motion.section 
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className="relative h-[70vh] md:h-[85vh] min-h-[550px] flex items-center justify-center"
      >
        <Image
          src={homeContent.hero.imageUrl}
          alt={homeContent.hero.imageAlt}
          fill
          className="object-cover"
          priority
          data-ai-hint="Egypt travel"
        />
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-background via-background/20 to-black/40" />
        
        <div className="relative z-20 container mx-auto px-4 text-center text-white mt-10">
          <motion.h1
            variants={fadeInUp}
            className="font-headline text-4xl sm:text-5xl md:text-7xl font-bold leading-tight mb-6 drop-shadow-lg"
            dangerouslySetInnerHTML={{ __html: homeContent.hero.title }}
          />
          <motion.p 
            variants={fadeInUp}
            className="text-lg md:text-2xl max-w-3xl mx-auto mb-10 text-white/90 drop-shadow-md font-light"
          >
            {homeContent.hero.subtitle}
          </motion.p>
          
          <motion.div 
            variants={fadeInUp}
            className="max-w-4xl mx-auto p-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl ring-1 ring-white/10"
          >
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-4">
                <Input
                  placeholder="Search tour..."
                  className="bg-white/90 border-0 h-12 text-foreground focus-visible:ring-2 focus-visible:ring-primary text-base"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="md:col-span-3">
                <Select value={destination} onValueChange={setDestination}>
                  <SelectTrigger className="bg-white/90 border-0 h-12 text-foreground focus:ring-primary text-base">
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
              </div>
              <div className="md:col-span-3">
                <Select value={tourType} onValueChange={setTourType}>
                  <SelectTrigger className="bg-white/90 border-0 h-12 text-foreground focus:ring-primary text-base">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cultural">Cultural</SelectItem>
                    <SelectItem value="adventure">Adventure</SelectItem>
                    <SelectItem value="culinary">Culinary</SelectItem>
                    <SelectItem value="relaxation">Relaxation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Button size="lg" className="w-full h-12 text-base font-semibold shadow-lg hover:scale-105 transition-transform" onClick={handleSearch}>
                  Search
                </Button>
              </div>
            </div>
          </motion.div>

          <motion.div variants={fadeInUp} className="mt-8">
             <p className="text-white/90 mb-3 text-lg font-medium drop-shadow-md">Want a personalized experience?</p>
             <Button 
               size="lg" 
               variant="secondary" 
               className="h-14 px-8 text-lg font-bold rounded-full shadow-xl hover:scale-105 transition-transform bg-white text-primary hover:bg-gray-100 border-2 border-white/20"
               onClick={() => router.push('/tailor-made')}
             >
               ✨ Tailor Made Your Tour with AI
             </Button>
          </motion.div>
        </div>
      </motion.section>

      {/* Categories Section */}
      <section className="container mx-auto px-4 -mt-24 relative z-20">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeInUp}
          className="bg-card rounded-2xl shadow-2xl p-8 md:p-10 border border-border/40"
        >
          <div className="text-center mb-10">
            <h2 className="font-headline text-3xl md:text-4xl font-bold text-foreground">
              Browse By Destination Category
            </h2>
            <p className="text-muted-foreground mt-3 text-lg">
              Select a category to see our exclusive tour packages
            </p>
          </div>
          <motion.div 
            variants={staggerContainer}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8"
          >
            {categories.map((category) => (
              <motion.div
                key={category}
                variants={fadeInUp}
                whileHover={{ y: -5 }}
                className="flex flex-col items-center justify-center gap-4 text-center group cursor-pointer"
              >
                <div className="w-20 h-20 rounded-full bg-primary/5 border border-primary/10 flex items-center justify-center transition-all duration-300 group-hover:bg-primary group-hover:shadow-lg group-hover:scale-110 group-hover:[&>svg]:text-white">
                  {categoryIcons[category as keyof typeof categoryIcons]}
                </div>
                <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  {category}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Why Choose Us Section */}
      <section className="container mx-auto px-4">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="grid md:grid-cols-2 gap-16 items-center"
        >
          <motion.div variants={fadeInUp}>
            <p className="text-primary font-bold tracking-wide uppercase text-sm">
              {homeContent.whyChooseUs.pretitle}
            </p>
            <h2 className="font-headline text-4xl md:text-5xl font-bold text-foreground mt-2 mb-6 leading-tight">
              <span
                dangerouslySetInnerHTML={{
                  __html: homeContent.whyChooseUs.title,
                }}
              />
            </h2>
            <div className="space-y-8 mt-8">
              {[
                { icon: <SafetyFirstIcon className="w-8 h-8" />, feat: homeContent.whyChooseUs.feature1 },
                { icon: <ProfessionalGuideIcon className="w-8 h-8" />, feat: homeContent.whyChooseUs.feature2 },
                { icon: <ExclusiveTripIcon className="w-8 h-8" />, feat: homeContent.whyChooseUs.feature3 }
              ].map((item, i) => (
                <motion.div 
                  key={i} 
                  variants={fadeInUp}
                  className="flex items-start gap-5 group"
                >
                  <div className="bg-primary/10 p-4 rounded-2xl text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-foreground mb-2">
                      {item.feat.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {item.feat.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
          
          <motion.div 
            variants={fadeInUp}
            className="relative h-full min-h-[500px] rounded-3xl overflow-hidden shadow-2xl"
          >
            <Image
              src="https://images.unsplash.com/photo-1699115823831-cf1329dfc58f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw4fHxhZHZlbnR1cmUlMjB0cmF2ZWx8ZW58MHx8fHwxNzUyNjIyOTA5fDA&ixlib=rb-4.1.0&q=80&w=1080"
              alt="Adventure travel"
              fill
              style={{ objectFit: 'cover' }}
              className="hover:scale-105 transition-transform duration-700"
              data-ai-hint="adventure travel"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-60" />
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="absolute -bottom-8 -right-8 bg-primary text-primary-foreground p-8 rounded-tl-3xl shadow-2xl w-64 text-center z-10"
            >
              <p className="text-5xl font-bold font-headline mb-1">25+</p>
              <p className="font-medium opacity-90">Years Of Experience</p>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* Popular Destinations Section */}
      <section className="container mx-auto px-4" id="tours">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4">
            <motion.div variants={fadeInUp}>
              <p className="text-primary font-bold tracking-wide uppercase text-sm">Top Destinations</p>
              <h2 className="font-headline text-4xl md:text-5xl font-bold text-foreground mt-2">
                Popular Tours We Offer
              </h2>
            </motion.div>
            <motion.div variants={fadeInUp}>
              <Button variant="outline" className="border-primary/20 hover:border-primary text-foreground hover:text-primary hover:bg-primary/5" asChild>
                <Link href="/tours">
                  View All Tour <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </motion.div>
          </div>
          
          {tours.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {tours.slice(0, 6).map((tour, i) => (
                <motion.div key={tour.id} variants={fadeInUp} custom={i}>
                  <TourCard tour={tour} />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-muted/30 rounded-3xl border-2 border-dashed border-muted">
              <h3 className="text-xl font-semibold text-muted-foreground">
                No tours available at the moment
              </h3>
              <p className="text-muted-foreground mt-2">
                Please check back later for our exclusive packages.
              </p>
            </div>
          )}
        </motion.div>
      </section>

      {/* Discount Banners */}
      <section className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-8">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            whileHover={{ y: -5 }}
            className="bg-accent/10 border border-accent/20 rounded-2xl p-8 md:p-10 flex items-center justify-between overflow-hidden relative group"
          >
            <div className="relative z-10 max-w-[60%]">
              <h3 className="text-3xl font-bold text-foreground font-headline mb-3">
                {homeContent.discountBanners.banner1.title}
              </h3>
              <p className="text-lg text-muted-foreground mb-6">
                {homeContent.discountBanners.banner1.description}
              </p>
              <Button className="shadow-lg group-hover:scale-105 transition-transform">
                Book Now <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-48 h-48 md:w-64 md:h-64 opacity-80 group-hover:scale-110 transition-transform duration-500">
              <Image
                src="https://placehold.co/200x150.png"
                alt="Travel items"
                fill
                style={{ objectFit: 'contain' }}
              />
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            whileHover={{ y: -5 }}
            className="bg-primary text-primary-foreground rounded-2xl p-8 md:p-10 flex items-center justify-between overflow-hidden relative group shadow-xl"
          >
            <div className="relative z-10 max-w-[60%]">
              <h3 className="text-3xl font-bold font-headline mb-3">
                {homeContent.discountBanners.banner2.title}
              </h3>
              <p className="text-lg text-primary-foreground/80 mb-6">
                {homeContent.discountBanners.banner2.description}
              </p>
              <Button variant="secondary" className="shadow-lg group-hover:scale-105 transition-transform">
                Book Now <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-48 h-48 md:w-64 md:h-64 opacity-80 group-hover:scale-110 transition-transform duration-500">
              <Image
                src="https://placehold.co/200x150.png"
                alt="Flight items"
                fill
                style={{ objectFit: 'contain' }}
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Last Minute Offers */}
      <section className="container mx-auto px-4">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          className="grid grid-cols-1 lg:grid-cols-3 bg-gradient-to-br from-primary to-accent rounded-3xl overflow-hidden text-white shadow-2xl"
        >
          <div className="bg-black/20 backdrop-blur-sm p-10 lg:p-14 flex flex-col justify-center items-center text-center border-b lg:border-b-0 lg:border-r border-white/10">
            <h2 className="text-7xl md:text-9xl font-bold font-headline mb-4 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">
              {homeContent.lastMinuteOffers.discount}
              <span className="text-5xl align-top text-white">%</span>
            </h2>
            <div className="text-2xl font-light tracking-widest mb-8 uppercase">Off</div>
            <CountdownTimer />
          </div>
          <div className="lg:col-span-2 p-8 lg:p-12 relative">
            <Plane className="absolute top-8 right-8 text-white/10 h-24 w-24 -rotate-45" />
            <p className="font-semibold text-white/80 uppercase tracking-wider text-sm mb-2">
              {homeContent.lastMinuteOffers.pretitle}
            </p>
            <h2 className="font-headline text-4xl md:text-5xl font-bold text-white mb-8">
              {homeContent.lastMinuteOffers.title}
            </h2>
            <div className="relative z-10">
              {tours.length > 0 ? (
                <Carousel
                  opts={{
                    align: "start",
                    loop: true,
                  }}
                  className="w-full"
                >
                  <CarouselContent>
                    {tours.slice(0, 4).map((tour, index) => (
                      <CarouselItem key={index} className="md:basis-1/2 pl-4">
                        <div className="p-1 h-full">
                          <LastMinuteOfferCard tour={tour} />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <div className="flex gap-3 mt-6">
                    <CarouselPrevious className="static translate-y-0 bg-white/20 hover:bg-white/40 text-white border-0 h-10 w-10" />
                    <CarouselNext className="static translate-y-0 bg-white/20 hover:bg-white/40 text-white border-0 h-10 w-10" />
                  </div>
                </Carousel>
              ) : (
                <div className="text-white/80 text-center py-8">
                  No offers available at the moment.
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </section>

      {/* Testimonials Section */}
      <section className="container mx-auto px-4">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="text-center mb-12"
        >
          <motion.p variants={fadeInUp} className="text-primary font-bold tracking-wide uppercase text-sm">Testimonial</motion.p>
          <motion.h2 variants={fadeInUp} className="font-headline text-4xl md:text-5xl font-bold text-foreground mt-2">
            Our Clients Feedback
          </motion.h2>
        </motion.div>
        
        {testimonials.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <Carousel
              opts={{
                align: "start",
                loop: true,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-4 pb-4">
                {testimonials.map((testimonial, index) => (
                  <CarouselItem
                    key={index}
                    className="md:basis-1/2 lg:basis-1/3 pl-4"
                  >
                    <div className="p-1 h-full">
                      <Card className="p-8 h-full relative border-border/40 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-card/50 backdrop-blur-sm">
                        <CardContent className="p-0 h-full flex flex-col">
                          <div className="flex mb-6">
                            {[...Array(testimonial.rating)].map((_, i) => (
                              <Star
                                key={i}
                                className="h-5 w-5 text-amber-400 fill-amber-400"
                              />
                            ))}
                          </div>
                          <p className="text-muted-foreground mb-8 flex-grow italic text-lg leading-relaxed">
                            {testimonial.content}
                          </p>
                          <div className="flex items-center gap-4 mt-auto pt-6 border-t border-border/30">
                            <Avatar className="h-12 w-12 border-2 border-primary/20">
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
                              <p className="font-bold text-foreground">
                                {testimonial.name}
                              </p>
                              <p className="text-sm text-primary font-medium">
                                {testimonial.role}
                              </p>
                            </div>
                          </div>
                          <Quote className="absolute top-8 right-8 h-12 w-12 text-primary/5 rotate-180" />
                        </CardContent>
                      </Card>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <div className="flex justify-center gap-4 mt-10">
                <CarouselPrevious className="static translate-y-0 h-12 w-12 border-primary/20 hover:bg-primary/5 hover:border-primary hover:text-primary transition-all" />
                <CarouselNext className="static translate-y-0 h-12 w-12 border-primary/20 hover:bg-primary/5 hover:border-primary hover:text-primary transition-all" />
              </div>
            </Carousel>
          </motion.div>
        ) : (
           <div className="text-center py-12 text-muted-foreground">
              No testimonials yet.
           </div>
        )}
      </section>

      {/* Video Section */}
      <section className="relative py-24 md:py-40 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black/50 z-10" />
        <motion.div 
          initial={{ scale: 1.1 }}
          whileInView={{ scale: 1 }}
          transition={{ duration: 10, ease: "linear" }}
          className="absolute inset-0"
        >
          <Image
            src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
            alt="Woman in a boat on a lake with dramatic cliffs"
            fill
            style={{ objectFit: 'cover' }}
            className="object-cover"
            data-ai-hint="woman cliff lake"
          />
        </motion.div>
        
        <div className="container mx-auto px-4 relative z-20 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.p variants={fadeInUp} className="text-primary font-bold tracking-widest uppercase text-sm">
              {homeContent.videoSection.pretitle}
            </motion.p>
            <motion.h2 variants={fadeInUp} className="font-headline text-4xl md:text-6xl font-bold mb-10 leading-tight max-w-4xl mx-auto drop-shadow-xl">
              {homeContent.videoSection.title}
            </motion.h2>
            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row justify-center items-center gap-6">
              <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-xl hover:scale-105 transition-transform">
                Find Out More <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                className="text-white text-lg font-semibold hover:text-primary hover:bg-white/10 h-14 px-8 rounded-full group transition-all"
              >
                <PlayCircle className="mr-3 h-10 w-10 text-primary group-hover:scale-110 transition-transform" />
                Watch Video
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* News & Articles Section */}
      <section className="container mx-auto px-4">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          <div className="text-center mb-12">
            <motion.p variants={fadeInUp} className="text-primary font-bold tracking-wide uppercase text-sm">
              {homeContent.newsSection.pretitle}
            </motion.p>
            <motion.h2 variants={fadeInUp} className="font-headline text-4xl md:text-5xl font-bold text-foreground mt-2">
              {homeContent.newsSection.title}
            </motion.h2>
          </div>
          
          {articles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {articles.map((article, index) => (
                <motion.div key={article.id || index} variants={fadeInUp}>
                  <Card className="overflow-hidden group h-full border-border/40 shadow-lg hover:shadow-2xl transition-all duration-300">
                    <div className="relative h-60 overflow-hidden">
                      <div className="absolute top-4 left-4 z-10 bg-black/50 backdrop-blur-md text-white px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {new Date(article.createdAt).toLocaleDateString()}
                      </div>
                      <Image
                        src={article.featuredImage || "https://placehold.co/600x400.png"}
                        alt={article.title}
                        fill
                        style={{ objectFit: 'cover' }}
                        className="transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-center gap-2 text-xs font-medium text-primary">
                        {article.tags && article.tags.length > 0 && (
                          <span className="bg-primary/10 px-2 py-1 rounded-full">
                            {article.tags[0]}
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-headline font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 h-14">
                        {article.title}
                      </h3>
                      <Button
                        variant="link"
                        asChild
                        className="p-0 h-auto text-primary group-hover:translate-x-2 transition-transform"
                      >
                        <Link href={`/blog/${article.slug}`}>
                          Read More <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No articles available at the moment.
            </div>
          )}
        </motion.div>
      </section>
    </div>
  );
}