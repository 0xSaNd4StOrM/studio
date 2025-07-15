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

  useEffect(() => {
    setIsClient(true);
  }, []);

  const itemCount = isClient ? cartItems.reduce((sum, item) => sum + item.quantity, 0) : 0;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <Logo />
          <span className="font-headline text-2xl font-bold text-primary">Wanderlust Hub</span>
        </Link>
        <nav className="flex items-center gap-4">
          <Button variant="ghost" asChild className="relative">
            <Link href="/cart">
              <ShoppingCart className="h-5 w-5" />
              {isClient && itemCount > 0 && (
                <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                  {itemCount}
                </span>
              )}
              <span className="sr-only">Shopping Cart</span>
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
