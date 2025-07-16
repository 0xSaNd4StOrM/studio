
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingCart, Search, User, Mail, Phone, MapPin, Twitter, Facebook, Instagram, ChevronDown, Heart } from 'lucide-react';
import { useCart } from '@/hooks/use-cart.tsx';
import { useWishlist } from '@/hooks/use-wishlist';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function TopBar() {
  return (
    <div className="bg-slate-100 text-slate-600 text-sm py-2 border-b">
      <div className="container flex justify-between items-center max-w-screen-2xl">
        <div className="flex items-center gap-6">
          <a href="mailto:demo@example.com" className="flex items-center gap-2 hover:text-primary">
            <Mail className="w-4 h-4" />
            <span>demo@example.com</span>
          </a>
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4" />
            <span>+990 123 456 789</span>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span>15/K, Dhaka London City, LOT</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <a href="#" className="hover:text-primary"><Twitter className="w-4 h-4" /></a>
          <a href="#" className="hover:text-primary"><Facebook className="w-4 h-4" /></a>
          <a href="#" className="hover:text-primary"><Instagram className="w-4 h-4" /></a>
        </div>
      </div>
    </div>
  );
}

export function Header() {
  const { cartItems } = useCart();
  const { wishlistItems } = useWishlist();
  const [isClient, setIsClient] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    setIsClient(true);

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const itemCount = isClient ? cartItems.reduce((sum, item) => sum + (item.adults ?? 0) + (item.children ?? 0), 0) : 0;
  const wishlistItemCount = isClient ? wishlistItems.length : 0;
  
  const headerClasses = isScrolled 
    ? 'bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-md' 
    : 'bg-background';

  const egyptianDestinations = ["Cairo", "Luxor", "Aswan", "Sharm El Sheikh", "Hurghada", "Alexandria"];

  return (
    <header className={`sticky top-0 z-50 w-full transition-all duration-300`}>
      <TopBar />
      <div className={`transition-all duration-300 ${headerClasses}`}>
        <div className="container flex h-20 max-w-screen-2xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <Logo />
            <div>
              <span className="font-headline text-2xl font-bold text-foreground">Turmet</span>
              <p className="text-xs text-muted-foreground">Explore The World</p>
            </div>
          </Link>
          
          <nav className="hidden lg:flex items-center gap-8">
            <Link href="/" className="font-medium text-foreground transition-colors hover:text-primary">Home</Link>
            <Link href="#" className="font-medium text-foreground transition-colors hover:text-primary">About Us</Link>
            
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center font-medium text-foreground transition-colors hover:text-primary focus:outline-none">
                Destination
                <ChevronDown className="relative top-[1px] ml-1 h-3 w-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {egyptianDestinations.map(destination => (
                  <DropdownMenuItem key={destination} asChild>
                    {/* In a real app, this would link to a filtered page e.g. /tours?destination=Cairo */}
                    <Link href="/#tours">{destination}</Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center font-medium text-foreground transition-colors hover:text-primary focus:outline-none">
                Tour
                <ChevronDown className="relative top-[1px] ml-1 h-3 w-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem asChild>
                  <Link href="/#tours">Package tours</Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  Daily tours
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Link href="#" className="font-medium text-foreground transition-colors hover:text-primary">Services</Link>
            <Link href="#" className="font-medium text-foreground transition-colors hover:text-primary">Blog</Link>
            <Link href="#" className="font-medium text-foreground transition-colors hover:text-primary">Contact</Link>
          </nav>

          <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon">
                  <Search className="h-5 w-5 text-foreground" />
                  <span className="sr-only">Search</span>
              </Button>
               <Button variant="ghost" size="icon" asChild className="relative">
                  <Link href="/wishlist">
                    <Heart className="h-6 w-6 text-foreground" />
                    {isClient && wishlistItemCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        {wishlistItemCount}
                      </span>
                    )}
                    <span className="sr-only">Wishlist</span>
                  </Link>
              </Button>
              <Button variant="ghost" size="icon" asChild className="relative">
                  <Link href="/cart">
                  <ShoppingCart className="h-6 w-6 text-foreground" />
                  {isClient && itemCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      {itemCount}
                      </span>
                  )}
                  <span className="sr-only">Shopping Cart</span>
                  </Link>
              </Button>
              <Button variant="ghost" size="icon">
                <User className="h-6 w-6 text-foreground" />
                <span className="sr-only">My Account</span>
              </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
