"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2, ChevronsUpDown, Info } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { generateTailorMadeTourAction } from "@/app/actions";

// Extended schema for form handling
const FormSchema = z.object({
  arrivalDate: z.date({
    required_error: "Arrival date is required.",
  }),
  region: z.array(z.string()).min(1, "Please select at least one region."),
  duration: z.coerce.number().min(1, "Duration must be at least 1 day."),
  participants: z.coerce.number().min(1, "At least 1 participant required.").max(20, "Maximum 20 participants."),
  accommodation: z.enum([
    "3-star hotel accommodation",
    "4-star hotel accommodation",
    "5-star hotel accommodation",
    "Self-booked accommodation"
  ], {
    required_error: "Please select accommodation.",
  }),
  budgetAmount: z.coerce.number().min(1, "Budget is required."),
  budgetCurrency: z.string().default("USD"),
  inclusions: z.array(z.string()),
  interests: z.array(z.string()).min(1, "Select at least one interest."),
  customPreferences: z.string().optional(),
});

type TourResult = {
  tourName: string;
  summary: string;
  totalPrice: number;
  currency: string;
  itinerary: {
    day: number;
    title: string;
    description: string;
    activities: string[];
    accommodation: string;
    meals: string[];
  }[];
  inclusions: string[];
  exclusions: string[];
  transportationDetails: string;
};

const inclusionOptions = [
  { id: "breakfast", label: "Breakfast included" },
  { id: "lunch", label: "Lunch included" },
  { id: "dinner", label: "Dinner included" },
  { id: "tickets", label: "Entrance tickets for all tours" },
  { id: "camel", label: "Camel ride experience" },
  { id: "guide", label: "Private tour guide" },
  { id: "transfer", label: "Airport transfers" },
  { id: "transport", label: "Local transportation" },
];

const interestOptions = [
  { id: "history", label: "History & Culture" },
  { id: "adventure", label: "Adventure & Safari" },
  { id: "relaxation", label: "Relaxation & Beach" },
  { id: "food", label: "Food & Culinary" },
  { id: "nature", label: "Nature & Wildlife" },
  { id: "religious", label: "Religious Sites" },
  { id: "shopping", label: "Shopping & Markets" },
  { id: "photography", label: "Photography" },
];

export function TailorMadeForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TourResult | null>(null);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      duration: 7,
      participants: 1,
      budgetCurrency: "USD",
      inclusions: [],
      interests: [],
      region: [],
      accommodation: "4-star hotel accommodation", // Default value
      customPreferences: "",
    },
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setIsLoading(true);
    setResult(null);

    try {
      // Transform form data to match TourInputSchema
      const apiInput = {
        travelDates: {
          arrival: format(data.arrivalDate, "yyyy-MM-dd"),
          departure: format(new Date(data.arrivalDate.getTime() + data.duration * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
        },
        region: data.region,
        duration: data.duration,
        participants: data.participants,
        accommodation: data.accommodation,
        budget: {
          amount: data.budgetAmount,
          currency: data.budgetCurrency,
        },
        inclusions: data.inclusions,
        interests: data.interests,
        customPreferences: data.customPreferences,
      };

      const response = await generateTailorMadeTourAction(apiInput);

      if (response.success && response.data) {
        setResult(response.data);
        toast({
          title: "Tour Generated!",
          description: "Your personalized itinerary is ready.",
        });
      } else {
        throw new Error(response.message || "Failed to generate tour");
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const regions = [
    "Cairo & Giza",
    "Luxor & Aswan",
    "Red Sea (Hurghada/Sharm)",
    "Alexandria & North Coast",
    "Western Desert Oases",
    "Sinai Peninsula",
    "All Major Regions (Grand Tour)",
  ];

  if (result) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
               <h2 className="text-3xl font-bold text-primary mb-2">{result.tourName}</h2>
               <p className="text-muted-foreground">{result.summary}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{result.totalPrice} {result.currency}</p>
              <p className="text-sm text-muted-foreground">Estimated Price</p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-muted/30 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Inclusions</h4>
              <ul className="list-disc list-inside text-sm space-y-1">
                {result.inclusions.map((inc, i) => <li key={i}>{inc}</li>)}
              </ul>
            </div>
            <div className="bg-muted/30 p-4 rounded-lg">
               <h4 className="font-semibold mb-2">Transportation</h4>
               <p className="text-sm">{result.transportationDetails}</p>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-xl font-semibold">Day by Day Itinerary</h3>
            {result.itinerary.map((day) => (
              <div key={day.day} className="border-l-4 border-primary pl-4 py-2">
                <h4 className="font-bold text-lg">Day {day.day}: {day.title}</h4>
                <p className="text-sm text-muted-foreground mb-2">{day.description}</p>
                <div className="grid sm:grid-cols-2 gap-2 text-sm mt-2">
                   <p><strong>Activities:</strong> {day.activities.join(", ")}</p>
                   <p><strong>Stay:</strong> {day.accommodation}</p>
                   <p><strong>Meals:</strong> {day.meals.join(", ")}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex gap-4 justify-center">
           <Button onClick={() => setResult(null)} variant="outline">Create Another Tour</Button>
           <Button onClick={() => window.print()}>Print Itinerary</Button>
           <Button className="bg-green-600 hover:bg-green-700">Book This Tour</Button>
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid gap-6 md:grid-cols-2">
          
          {/* Travel Details Section */}
          <div className="space-y-6 bg-muted/20 p-6 rounded-xl border">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-primary" /> Travel Details
            </h3>
            
            <FormField
              control={form.control}
              name="arrivalDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Arrival Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date < new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Duration (Days)</FormLabel>
                    <FormControl>
                        <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="participants"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Participants</FormLabel>
                    <FormControl>
                        <Input 
                          type="number" 
                          min={1}
                          max={20}
                          {...field} 
                          value={field.value || ""} 
                          onChange={(e) => field.onChange(e.target.valueAsNumber || e.target.value)}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>

            <FormField
            control={form.control}
            name="region"
            render={() => (
                <FormItem>
                <div className="mb-4">
                  <FormLabel className="text-base">Preferred Regions</FormLabel>
                  <FormDescription>
                    Select the regions you would like to visit.
                  </FormDescription>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {regions.map((region) => (
                        <FormField
                        key={region}
                        control={form.control}
                        name="region"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={region}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(region)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, region])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== region
                                          )
                                        )
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal text-sm cursor-pointer">
                                {region}
                              </FormLabel>
                            </FormItem>
                          )
                        }}
                      />
                    ))}
                </div>
                <FormMessage />
                </FormItem>
            )}
            />
          </div>

          {/* Accommodation & Budget Section */}
          <div className="space-y-6 bg-muted/20 p-6 rounded-xl border">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Info className="w-5 h-5 text-primary" /> Accommodation & Budget
            </h3>

            <FormField
              control={form.control}
              name="accommodation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Accommodation Preference</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select accommodation" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="3-star hotel accommodation">3-star hotel accommodation</SelectItem>
                      <SelectItem value="4-star hotel accommodation">4-star hotel accommodation</SelectItem>
                      <SelectItem value="5-star hotel accommodation">5-star hotel accommodation</SelectItem>
                      <SelectItem value="Self-booked accommodation">Self-booked accommodation</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
                <FormField
                control={form.control}
                name="budgetAmount"
                render={({ field }) => (
                    <FormItem className="col-span-2">
                    <FormLabel>Budget (Per Person)</FormLabel>
                    <FormControl>
                        <Input 
                          type="number" 
                          placeholder="1500" 
                          {...field} 
                          value={field.value || ""} 
                          onChange={(e) => field.onChange(e.target.valueAsNumber || e.target.value)}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="budgetCurrency"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="USD" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                            <SelectItem value="GBP">GBP</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
          </div>

          {/* Inclusions Section */}
          <div className="space-y-6 bg-muted/20 p-6 rounded-xl border md:col-span-2">
             <h3 className="text-xl font-semibold flex items-center gap-2">
              <ChevronsUpDown className="w-5 h-5 text-primary" /> Tour Inclusions
            </h3>

            <FormField
              control={form.control}
              name="inclusions"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Select your tour inclusions</FormLabel>
                    <FormDescription>
                      Check the services you want included in your package.
                    </FormDescription>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {inclusionOptions.map((item) => (
                      <FormField
                        key={item.id}
                        control={form.control}
                        name="inclusions"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={item.id}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(item.label)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, item.label])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== item.label
                                          )
                                        )
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal text-sm cursor-pointer">
                                {item.label}
                              </FormLabel>
                            </FormItem>
                          )
                        }}
                      />
                    ))}
                    
                     <div className="flex flex-row items-start space-x-3 space-y-0">
                        <Checkbox disabled />
                        <span className="font-normal text-sm text-muted-foreground">Special activities (specify in comments)</span>
                     </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Preferences Section */}
          <div className="space-y-6 bg-muted/20 p-6 rounded-xl border md:col-span-2">
             <h3 className="text-xl font-semibold flex items-center gap-2">
              <ChevronsUpDown className="w-5 h-5 text-primary" /> Interests & Extras
            </h3>

            <FormField
              control={form.control}
              name="interests"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Interests</FormLabel>
                    <FormDescription>
                      Select what interests you most.
                    </FormDescription>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {interestOptions.map((item) => (
                      <FormField
                        key={item.id}
                        control={form.control}
                        name="interests"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={item.id}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(item.label)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, item.label])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== item.label
                                          )
                                        )
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal text-sm cursor-pointer">
                                {item.label}
                              </FormLabel>
                            </FormItem>
                          )
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="customPreferences"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comments & Special Requests</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Mention special activities, dietary requirements, accessibility needs, or specific places you want to visit."
                      className="resize-none h-32"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="flex justify-end">
            <Button type="submit" size="lg" className="w-full md:w-auto text-lg h-12 px-8" disabled={isLoading}>
                {isLoading ? (
                    <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating Itinerary...
                    </>
                ) : (
                    "Generate My Tailor-Made Tour"
                )}
            </Button>
        </div>
      </form>
    </Form>
  );
}