'use client';

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft } from "lucide-react";
import type { UpsellItem, Tour } from "@/types";
import { useEffect, useState } from "react";
import { getTours } from "@/lib/supabase/tours";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be positive."),
  type: z.enum(["service", "tour_addon"], { errorMap: () => ({ message: "Please select a type." }) }),
  relatedTourId: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
});

interface UpsellItemFormProps {
    initialData?: UpsellItem;
    onSubmit: (values: z.infer<typeof formSchema>) => void;
    formType: 'new' | 'edit';
}

export function UpsellItemForm({ initialData, onSubmit, formType }: UpsellItemFormProps) {
  const [tours, setTours] = useState<Tour[]>([]);

  useEffect(() => {
    const fetchTours = async () => {
      const fetchedTours = await getTours();
      setTours(fetchedTours);
    };
    fetchTours();
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
        ...initialData,
        relatedTourId: initialData.relatedTourId || null, // Ensure null for select
    } : {
      name: "",
      description: "",
      price: 0,
      type: "service",
      relatedTourId: null,
      isActive: true,
    },
  });

  const pageTitle = formType === 'new' ? 'Create New Upsell Item' : 'Edit Upsell Item';
  const pageDescription = formType === 'new' 
    ? 'Define a new service or tour add-on.'
    : `Editing: "${initialData?.name}"`;
  const submitButtonText = formType === 'new' ? 'Create Item' : 'Save Changes';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
         <Button variant="outline" size="icon" asChild>
            <Link href="/admin/upsell-items">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back to upsell items</span>
            </Link>
        </Button>
        <div>
            <h2 className="text-2xl font-bold tracking-tight">{pageTitle}</h2>
            <p className="text-muted-foreground">{pageDescription}</p>
        </div>
      </div>
       <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Item Details</CardTitle>
                    <CardDescription>Provide information about the upsell item.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6">
                    <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Item Name</FormLabel>
                            <FormControl><Input placeholder="e.g., Airport Pickup" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl><Textarea placeholder="A brief description of the service..." {...field} rows={3} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="price" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Price</FormLabel>
                            <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="type" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select item type" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="service">Service</SelectItem>
                                    <SelectItem value="tour_addon">Tour Add-on</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="relatedTourId" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Related Tour (Optional)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value || null}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a related tour" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value={null}>None</SelectItem>
                                    {tours.map(tour => (
                                        <SelectItem key={tour.id} value={tour.id}>{tour.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormDescription>Link this upsell item to a specific tour if it's an add-on.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="isActive" render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                                <FormLabel>Active</FormLabel>
                                <FormDescription>Is this upsell item currently available?</FormDescription>
                            </div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button type="submit" disabled={form.formState.isSubmitting}>{submitButtonText}</Button>
                </CardFooter>
            </Card>
        </form>
      </Form>
    </div>
  );
}
