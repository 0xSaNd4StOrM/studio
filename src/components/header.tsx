"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShoppingCart,
  Search,
  Mail,
  Phone,
  MapPin,
  Twitter,
  Facebook,
  Instagram,
  Heart,
  Menu,
} from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useWishlist } from "@/hooks/use-wishlist";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";


import { createClient } from "@/lib/supabase/client";

type SettingsData = {
  agencyName?: string;
  phoneNumber?: string;
  contactEmail?: string;
  address?: string;
  aboutUs?: string;
  tagline?: string;
  navLinks?: { label: string; href: string }[];
  socialMedia?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
};

function TopBar({
  contactEmail,
  phoneNumber,
  address,
  socialMedia,
}: {
  contactEmail?: string;
  phoneNumber?: string;
  address?: string;
  socialMedia?: SettingsData["socialMedia"];
}) {
  return (
    <div className="bg-secondary text-secondary-foreground text-sm py-2 border-b">
      <div className="container flex justify-between items-center max-w-screen-2xl">
        <div className="flex items-center gap-6">
          <a
            href={contactEmail ? `mailto:${contactEmail}` : "#"}
            className="flex items-center gap-2 hover:text-primary"
          >
            <Mail className="w-4 h-4" />
            <span>{contactEmail || "contact@example.com"}</span>
          </a>
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4" />
            <span>{phoneNumber || "+990 123 456 789"}</span>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span>{address || "123 Main St, City"}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <a
            href={socialMedia?.twitter || "#"}
            className="hover:text-primary"
            aria-label="Twitter"
          >
            <Twitter className="w-4 h-4" />
          </a>
          <a
            href={socialMedia?.facebook || "#"}
            className="hover:text-primary"
            aria-label="Facebook"
          >
            <Facebook className="w-4 h-4" />
          </a>
          <a
            href={socialMedia?.instagram || "#"}
            className="hover:text-primary"
            aria-label="Instagram"
          >
            <Instagram className="w-4 h-4" />
          </a>
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
  const [settings, setSettings] = useState<{ data: SettingsData; logo_url?: string | null } | null>(null);

  useEffect(() => {
    setIsClient(true);

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const headerClasses = isScrolled
    ? "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-md"
    : "bg-background";

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("settings")
          .select("data, logo_url")
          .eq("id", 1)
          .maybeSingle();
        if (!error && data) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setSettings({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data: ((data as any).data || {}) as SettingsData,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            logo_url: (data as any).logo_url || null,
          });
        }
      } catch {
        // ignore
      }
    };
    loadSettings();
  }, []);

  const itemCount = isClient ? cartItems.length : 0;
  const wishlistItemCount = isClient ? wishlistItems.length : 0;

  return (
    <header className={`sticky top-0 z-50 w-full transition-all duration-300`}>
      <div className="hidden md:block">
        <TopBar
          contactEmail={settings?.data?.contactEmail}
          phoneNumber={settings?.data?.phoneNumber}
          address={settings?.data?.address}
          socialMedia={settings?.data?.socialMedia}
        />
      </div>
      {/* Egyptian accent bar */}
      <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
      <div className={`transition-all duration-300 ${headerClasses}`}> 
        <div className="container flex h-20 max-w-screen-2xl items-center justify-between px-4">
          <Link
            href="/"
            className="flex items-center gap-2 transition-opacity hover:opacity-80"
          >
            <Logo logoUrl={settings?.logo_url ?? undefined} alt={settings?.data?.agencyName || "Agency Logo"} />
            <div className="hidden sm:block">
              <span className="font-headline text-xl md:text-2xl font-bold text-foreground">
                {settings?.data?.agencyName || "Turmet"}
              </span>
              <p className="text-[10px] md:text-xs text-muted-foreground">{settings?.data?.tagline || "Explore The World"}</p>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-8">
            {settings?.data?.navLinks && settings.data.navLinks.length > 0 ? (
              settings.data.navLinks.map((l) => (
                <Link key={`${l.label}-${l.href}`} href={l.href} className="font-medium text-foreground transition-colors hover:text-primary">
                  {l.label}
                </Link>
              ))
            ) : (
              <>
                <Link href="/" className="font-medium text-foreground transition-colors hover:text-primary">Home</Link>
                <Link href="#" className="font-medium text-foreground transition-colors hover:text-primary">About Us</Link>
                <Link href="/#tours" className="font-medium text-foreground transition-colors hover:text-primary">Destination</Link>
                <Link href="/#tours" className="font-medium text-foreground transition-colors hover:text-primary">Tour</Link>
                <Link href="#" className="font-medium text-foreground transition-colors hover:text-primary">Services</Link>
                <Link href="/blog" className="font-medium text-foreground transition-colors hover:text-primary">Blog</Link>
                <Link href="#" className="font-medium text-foreground transition-colors hover:text-primary">Contact</Link>
              </>
            )}
          </nav>

          <div className="flex items-center gap-1 md:gap-2">
            <Button variant="ghost" size="icon" className="hidden sm:flex">
              <Search className="h-5 w-5 text-foreground" />
              <span className="sr-only">Search</span>
            </Button>
            <Button variant="ghost" size="icon" asChild className="relative">
              <Link href="/wishlist">
                <Heart className="h-5 w-5 md:h-6 md:w-6 text-foreground" />
                {isClient && wishlistItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 md:h-5 md:w-5 items-center justify-center rounded-full bg-primary text-[10px] md:text-xs font-bold text-primary-foreground">
                    {wishlistItemCount}
                  </span>
                )}
                <span className="sr-only">Wishlist</span>
              </Link>
            </Button>
            <Button variant="ghost" size="icon" asChild className="relative">
              <Link href="/cart">
                <ShoppingCart className="h-5 w-5 md:h-6 md:w-6 text-foreground" />
                {isClient && itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 md:h-5 md:w-5 items-center justify-center rounded-full bg-primary text-[10px] md:text-xs font-bold text-primary-foreground">
                    {itemCount}
                  </span>
                )}
                <span className="sr-only">Shopping Cart</span>
              </Link>
            </Button>
            
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden ml-1">
                  <Menu className="h-6 w-6 text-foreground" />
                  <span className="sr-only">Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                   <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-6 mt-8">
                  <nav className="flex flex-col gap-4">
                    {settings?.data?.navLinks && settings.data.navLinks.length > 0 ? (
                      settings.data.navLinks.map((l) => (
                        <Link key={`${l.label}-${l.href}`} href={l.href} className="text-lg font-medium text-foreground transition-colors hover:text-primary">
                          {l.label}
                        </Link>
                      ))
                    ) : (
                      <>
                        <Link href="/" className="text-lg font-medium text-foreground transition-colors hover:text-primary">Home</Link>
                        <Link href="#" className="text-lg font-medium text-foreground transition-colors hover:text-primary">About Us</Link>
                        <Link href="/#tours" className="text-lg font-medium text-foreground transition-colors hover:text-primary">Destination</Link>
                        <Link href="/#tours" className="text-lg font-medium text-foreground transition-colors hover:text-primary">Tour</Link>
                        <Link href="#" className="text-lg font-medium text-foreground transition-colors hover:text-primary">Services</Link>
                        <Link href="/blog" className="text-lg font-medium text-foreground transition-colors hover:text-primary">Blog</Link>
                        <Link href="#" className="text-lg font-medium text-foreground transition-colors hover:text-primary">Contact</Link>
                      </>
                    )}
                  </nav>
                  <div className="flex flex-col gap-4 border-t pt-6">
                    {settings?.data?.phoneNumber && (
                      <a href={`tel:${settings.data.phoneNumber}`} className="flex items-center gap-3 text-muted-foreground hover:text-primary">
                        <Phone className="w-4 h-4" />
                        <span>{settings.data.phoneNumber}</span>
                      </a>
                    )}
                    {settings?.data?.contactEmail && (
                      <a href={`mailto:${settings.data.contactEmail}`} className="flex items-center gap-3 text-muted-foreground hover:text-primary">
                        <Mail className="w-4 h-4" />
                        <span>{settings.data.contactEmail}</span>
                      </a>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}