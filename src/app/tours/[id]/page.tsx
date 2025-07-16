
'use client';

import { getTourById } from '@/lib/tours';
import { notFound, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from '@/hooks/use-toast';
import { Clock, MapPin, Star, Calendar as CalendarIcon, Users, Briefcase, Tag } from 'lucide-react';

const bookingFormSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters."),
  nationality: z.string().min(2, "Nationality is required."),
  phone: z.string().min(10, "A valid phone number is required."),
  email: z.string().email("Invalid email address."),
  persons: z.coerce.number().min(1, "At least one person is required."),
  date: z.date({
    required_error: "A date for the tour is required.",
  }),
  packageType: z.enum(["car_only", "car_guide", "car_guide_tickets"]),
});

type TourDetailsPageProps = {
  params: {
    id: string;
  };
};

export default function TourDetailsPage({ params }: TourDetailsPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const tour = getTourById(params.id);

  const form = useForm<z.infer<typeof bookingFormSchema>>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      firstName: "",
      nationality: "",
      phone: "",
      email: "",
      persons: 1,
      packageType: "car_guide_tickets",
    },
  });

  if (!tour) {
    notFound();
  }

  function onSubmit(values: z.infer<typeof bookingFormSchema>) {
    console.log("Booking Inquiry:", {
      tour: tour?.name,
      tourId: tour?.id,
      ...values,
    });
    
    toast({
      title: "Inquiry Sent!",
      description: "Thank you for your interest. We will contact you shortly to confirm your booking.",
    });

    // Optionally redirect or clear form
    // form.reset();
    // router.push('/');
  }

  return (
    <div className="grid lg:grid-cols-5 gap-8">
      {/* Left Column: Tour Info */}
      <div className="lg:col-span-3 space-y-8">
        <Card className="overflow-hidden">
           <div className="relative h-96 w-full">
            <Image
              src={tour.image}
              alt={tour.name}
              fill
              className="object-cover"
              data-ai-hint={`${tour.destination} ${tour.type}`}
              priority
            />
          </div>
          <CardHeader>
            <CardTitle className="font-headline text-4xl text-primary">{tour.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">{tour.description}</p>
            <div className="grid grid-cols-2 gap-4 text-sm mb-6 border-t pt-6">
              <div className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary"/> <span>{tour.destination}</span></div>
              <div className="flex items-center gap-2"><Clock className="h-5 w-5 text-primary"/> <span>{tour.duration} days</span></div>
              <div className="flex items-center gap-2"><Star className="h-5 w-5 text-primary fill-primary"/> <span>{tour.rating}/5.0</span></div>
              <div className="flex items-center gap-2"><Tag className="h-5 w-5 text-primary"/> <span>{tour.type}</span></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-3xl">Itinerary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tour.itinerary.map(item => (
                <div key={item.day} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                      {item.day}
                    </div>
                    {item.day !== tour.itinerary.length && <div className="w-px flex-grow bg-border"></div>}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-primary">Day {item.day}</h3>
                    <p className="text-muted-foreground">{item.activity}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Booking Form */}
      <div className="lg:col-span-2">
        <Card className="sticky top-24">
          <CardHeader>
            <CardTitle className="font-headline text-3xl">Book This Tour</CardTitle>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="persons" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Persons</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="packageType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Package</FormLabel>
                       <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a package" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="car_only">Car Only</SelectItem>
                          <SelectItem value="car_guide">Car & Guide</SelectItem>
                          <SelectItem value="car_guide_tickets">Car, Guide & Tickets</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                
                <FormField control={form.control} name="date" render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Tour Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className="pl-3 text-left font-normal"
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

                <FormField control={form.control} name="firstName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="nationality" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nationality</FormLabel>
                    <FormControl><Input placeholder="e.g. American" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                 <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl><Input placeholder="+1 234 567 890" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl><Input placeholder="you@example.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

              </CardContent>
              <CardFooter>
                 <Button type="submit" className="w-full" size="lg">Send Inquiry</Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  );
}

    