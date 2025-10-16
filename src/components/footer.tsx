"use client";

import React from "react";
import Link from "next/link";
import { Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Instagram, ArrowRight } from "lucide-react";
import { Logo } from "@/components/logo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

export function Footer() {
  const [settings, setSettings] = React.useState<{ data: SettingsData; logo_url?: string | null } | null>(null);

  React.useEffect(() => {
    const loadSettings = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("settings")
          .select("data, logo_url")
          .eq("id", 1)
          .maybeSingle();
        if (!error && data) {
          setSettings({ data: ((data as any).data || {}) as SettingsData, logo_url: (data as any).logo_url || null });
        }
      } catch (_) {
        // ignore
      }
    };
    loadSettings();
  }, []);

  const agencyName = settings?.data?.agencyName || "Turmet";
  const tagline = settings?.data?.tagline || "Explore The World";
  const contactEmail = settings?.data?.contactEmail || "info@turmet.com";
  const phoneNumber = settings?.data?.phoneNumber || "+256 214 203 215";
  const address = settings?.data?.address || "9550 Bolsa Ave #126, United States";

  return (
    <footer className="bg-[#181E29] text-gray-300">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          {/* Column 1: Logo, Newsletter, Socials */}
          <div className="space-y-6">
            <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
              <Logo logoUrl={settings?.logo_url ?? undefined} alt={agencyName} />
              <div>
                <span className="font-headline text-2xl font-bold text-white">{agencyName}</span>
                <p className="text-xs text-gray-400">{tagline}</p>
              </div>
            </Link>
            <h3 className="font-headline font-semibold text-white">Subscribe Newsletter</h3>
            <p className="text-sm">Get Our Latest Deals and Update</p>
            <form className="space-y-3">
              <Input type="email" placeholder="Your Email Address" className="bg-white text-gray-900 border-0 rounded-lg" />
              <Button type="submit" className="w-full rounded-lg">
                Subscribe <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
            <div className="flex space-x-3 pt-2">
              <a href={settings?.data?.socialMedia?.facebook || "#"} className="h-9 w-9 flex items-center justify-center rounded-full bg-white text-primary hover:bg-primary hover:text-white transition-colors" aria-label="Facebook">
                <Facebook className="h-5 w-5" />
              </a>
              <a href={settings?.data?.socialMedia?.twitter || "#"} className="h-9 w-9 flex items-center justify-center rounded-full bg-white text-primary hover:bg-primary hover:text-white transition-colors" aria-label="Twitter">
                <Twitter className="h-5 w-5" />
              </a>
              <a href={settings?.data?.socialMedia?.linkedin || "#"} className="h-9 w-9 flex items-center justify-center rounded-full bg-white text-primary hover:bg-primary hover:text-white transition-colors" aria-label="LinkedIn">
                <Linkedin className="h-5 w-5" />
              </a>
              <a href={settings?.data?.socialMedia?.instagram || "#"} className="h-9 w-9 flex items-center justify-center rounded-full bg-white text-primary hover:bg-primary hover:text-white transition-colors" aria-label="Instagram">
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Column 2: Quick Links (from settings if available) */}
          <div>
            <h3 className="font-headline font-semibold text-white mb-6 relative after:content-[''] after:absolute after:left-0 after:-bottom-2 after:w-10 after:h-0.5 after:bg-primary">Quick Links</h3>
            <ul className="space-y-3">
              {settings?.data?.navLinks && settings.data.navLinks.length > 0 ? (
                settings.data.navLinks.slice(0, 6).map((l) => (
                  <li key={`${l.label}-${l.href}`}>
                    <a href={l.href} className="hover:text-primary transition-colors">{l.label}</a>
                  </li>
                ))
              ) : (
                <>
                  <li><a href="/" className="hover:text-primary transition-colors">Home</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">About Us</a></li>
                  <li><a href="/blog" className="hover:text-primary transition-colors">Blog</a></li>
                  <li><a href="/#services" className="hover:text-primary transition-colors">Services</a></li>
                  <li><a href="/#tours" className="hover:text-primary transition-colors">Tour</a></li>
                </>
              )}
            </ul>
          </div>

          {/* Column 3: Services */}
          <div>
            <h3 className="font-headline font-semibold text-white mb-6 relative after:content-[''] after:absolute after:left-0 after:-bottom-2 after:w-10 after:h-0.5 after:bg-primary">Services</h3>
            <ul className="space-y-3">
              <li>
                <a href="#" className="hover:text-primary transition-colors">Wanderlust Adventures</a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">Globe Trotters Travel</a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">Odyssey Travel Services</a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">Jet Set Journeys</a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">Dream Destinations Travel</a>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact Us */}
          <div>
            <h3 className="font-headline font-semibold text-white mb-6 relative after:content-[''] after:absolute after:left-0 after:-bottom-2 after:w-10 after:h-0.5 after:bg-primary">Contact Us</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="h-9 w-9 flex-shrink-0 flex items-center justify-center rounded-md bg-primary text-white">
                  <MapPin className="h-5 w-5" />
                </div>
                <span>{address}</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="h-9 w-9 flex-shrink-0 flex items-center justify-center rounded-md bg-primary text-white">
                  <Mail className="h-5 w-5" />
                </div>
                <span>{contactEmail}</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="h-9 w-9 flex-shrink-0 flex items-center justify-center rounded-md bg-primary text-white">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <p>{phoneNumber}</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-gray-700">
        <div className="container mx-auto px-4 py-6 flex flex-col md:flex-row justify-between items-center text-sm">
          <p>&copy; {new Date().getFullYear()} {agencyName}. All Rights Reserved.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="hover:text-primary">Terms of use</a>
            <a href="#" className="hover:text-primary">Privacy Policy</a>
            <a href="#" className="hover:text-primary">Environmental Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}