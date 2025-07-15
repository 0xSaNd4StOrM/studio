"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/hooks/use-cart.tsx';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';

export function Header() {
  const { cartItems } = useCart();
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

  const itemCount = isClient ? cartItems.reduce((sum, item) => sum + item.quantity, 0) : 0;
  
  // Use text-foreground when scrolled, and a specific dark color when not.
  // This avoids making it white on a transparent background over a light image.
  const textColor = isScrolled ? 'text-foreground' : 'text-foreground';

  return (
    <header className={`sticky top-0 z-50 w-full transition-all duration-300 ${isScrolled ? 'border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60' : 'bg-transparent'}`}>
      <div className="container flex h-20 max-w-screen-2xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <Logo />
          <span className={`font-headline text-2xl font-bold ${textColor}`}>Wanderlust Hub</span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/#tours" className={`font-medium transition-colors hover:text-primary ${textColor}`}>Tours</Link>
          <Link href="/#destinations" className={`font-medium transition-colors hover:text-primary ${textColor}`}>Destinations</Link>
          <Link href="#" className={`font-medium transition-colors hover:text-primary ${textColor}`}>About</Link>
        </nav>

        <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild className="relative">
                <Link href="/cart">
                <ShoppingCart className={`h-6 w-6 transition-colors ${textColor}`} />
                {isClient && itemCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {itemCount}
                    </span>
                )}
                <span className="sr-only">Shopping Cart</span>
                </Link>
            </Button>
        </div>
      </div>
    </header>
  );
}
