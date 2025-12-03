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
      <div className="relative h-[60px] w-[60px] overflow-hidden rounded-lg">
        <Image
          src={logoUrl}
          alt={alt}
          fill
          sizes="60px"
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center bg-primary text-primary-foreground rounded-lg h-[50px] w-[50px]">
      <Plane className="h-6 w-6" />
    </div>
  );
}
