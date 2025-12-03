import React from "react";
import { TailorMadeForm } from "./tailor-made-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tailor Made Tours | Create Your Dream Egypt Vacation",
  description: "Customize your perfect Egypt tour itinerary with our AI-powered planner. Select your preferences, dates, and budget for a personalized experience.",
};

export default function TailorMadePage() {
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero Header */}
      <div className="relative bg-primary/5 py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-headline text-4xl md:text-6xl font-bold mb-6 text-primary">
            Tailor Made Your Tour
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Design your perfect Egyptian adventure. Tell us your preferences, and our AI travel expert will craft a personalized itinerary just for you in seconds.
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="container mx-auto px-4 -mt-8 relative z-10">
        <div className="bg-card border rounded-2xl shadow-xl p-6 md:p-10 max-w-5xl mx-auto">
            <TailorMadeForm />
        </div>
      </div>
    </div>
  );
}
