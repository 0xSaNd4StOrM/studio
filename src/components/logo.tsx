"use client";

import React from "react";
import Image from "next/image";
import { Plane } from "lucide-react";

type LogoProps = {
  logoUrl?: string | null;
  alt?: string;
};

export function Logo({ logoUrl, alt = "Agency Logo" }: LogoProps) {
  if (logoUrl) {
    return (
      <div className="relative h-12 w-12 overflow-hidden rounded-full ring-1 ring-border">
        <Image
          src={logoUrl}
          alt={alt}
          fill
          sizes="48px"
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center bg-primary text-primary-foreground rounded-full h-12 w-12">
      <Plane className="h-6 w-6" />
    </div>
  );
}
