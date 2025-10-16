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
  ChevronDown,
  Heart,
} from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useWishlist } from "@/hooks/use-wishlist";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
          setSettings({
            data: ((data as any).data || {}) as SettingsData,
            logo_url: (data as any).logo_url || null,
          });
        }
      } catch (_) {
        // ignore
      }
    };
    loadSettings();
  }, []);

  const itemCount = isClient ? cartItems.length : 0;
  const wishlistItemCount = isClient ? wishlistItems.length : 0;

  const headerClasses = isScrolled
    ? "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-md"
    : "bg-background";

  const egyptianDestinations = [
    "Cairo",
    "Luxor",
    "Aswan",
    "Sharm El Sheikh",
    "Hurghada",
    "Alexandria",
  ];

  return (
    <header className={`sticky top-0 z-50 w-full transition-all duration-300`}>
      <TopBar
        contactEmail={settings?.data?.contactEmail}
        phoneNumber={settings?.data?.phoneNumber}
        address={settings?.data?.address}
        socialMedia={settings?.data?.socialMedia}
      />
      {/* Egyptian accent bar */}
      <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
      <div className={`transition-all duration-300 ${headerClasses}`}> 
        <div className="container flex h-20 max-w-screen-2xl items-center justify-between px-4">
          <Link
            href="/"
            className="flex items-center gap-2 transition-opacity hover:opacity-80"
          >
            <Logo logoUrl={settings?.logo_url ?? undefined} alt={settings?.data?.agencyName || "Agency Logo"} />
            <div>
              <span className="font-headline text-2xl font-bold text-foreground">
                {settings?.data?.agencyName || "Turmet"}
              </span>
              <p className="text-xs text-muted-foreground">{settings?.data?.tagline || "Explore The World"}</p>
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
          </div>
        </div>
      </div>
    </header>
  );
}
