"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, PlusCircle, Trash2 } from "lucide-react";
import { ImageUploader } from "@/components/admin/image-uploader";
import type { UpsellItem, Tour } from "@/types";
import { useEffect, useState } from "react";
import { getToursSelect } from "@/lib/supabase/tours-client";
import { Combobox } from "@/components/ui/combobox";

const variantSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Variant name is required"),
  price: z.coerce.number().min(0, "Price must be positive."),
});

const targetingSchema = z.object({
  match: z.enum(["any", "all"]).default("any"),
  destinations: z.array(z.string()).default([]),
  tourIds: z.array(z.string()).default([]),
});

export const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be positive."),
  variants: z.array(variantSchema).optional(),
  targeting: targetingSchema.optional(),
  type: z.enum(["service", "tour_addon"], {
    errorMap: () => ({ message: "Please select a type." }),
  }),
  relatedTourId: z.string().nullable().optional(),
  images: z.array(z.any()).optional(), // For image upload
  isActive: z.boolean().default(true),
});

interface UpsellItemFormProps {
  initialData?: UpsellItem;
  onSubmit: (values: z.infer<typeof formSchema>) => Promise<void> | void;
  formType: "new" | "edit";
}

export function UpsellItemForm({
  initialData,
  onSubmit,
  formType,
}: UpsellItemFormProps) {
  const [tours, setTours] = useState<Array<Pick<Tour, "id" | "name" | "destination">>>([]);

  useEffect(() => {
    const fetchTours = async () => {
      try {
        const fetchedTours = await getToursSelect();
        setTours(fetchedTours);
      } catch (e) {
        console.error("Failed to fetch tours for select:", e);
        setTours([]);
      }
    };
    fetchTours();
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData
      ? {
          ...initialData,
          relatedTourId: initialData.relatedTourId || null,
          variants: initialData.variants ?? [],
          targeting: initialData.targeting ?? { match: "any", destinations: [], tourIds: [] },
          images: initialData.imageUrl ? [initialData.imageUrl] : [], // Pre-populate if image exists
        }
      : {
          name: "",
          description: "",
          price: 0,
          variants: [],
          targeting: { match: "any", destinations: [], tourIds: [] },
          type: "service",
          relatedTourId: null,
          images: [],
          isActive: true,
        },
  });

  const variantsFieldArray = useFieldArray({
    control: form.control,
    name: "variants",
    keyName: "fieldId",
  });

  const destinationOptions = Array.from(
    new Set(tours.map((tour) => tour.destination).filter((v) => v && v.length > 0)),
  )
    .sort((a, b) => a.localeCompare(b))
    .map((destination) => ({ value: destination, label: destination }));

  const tourOptions = tours.map((tour) => ({ value: tour.id, label: tour.name }));

  const pageTitle =
    formType === "new" ? "Create New Upsell Item" : "Edit Upsell Item";
  const pageDescription =
    formType === "new"
      ? "Define a new service or tour add-on."
      : `Editing: "${initialData?.name}"`;
  const submitButtonText = formType === "new" ? "Create Item" : "Save Changes";

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
              <CardDescription>
                Provide information about the upsell item.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Airport Pickup" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="A brief description of the service..."
                        {...field}
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Card>
                <CardHeader>
                  <CardTitle>Pricing rules / variants</CardTitle>
                  <CardDescription>
                    Add optional variants with their own prices.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {variantsFieldArray.fields.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No variants added. The base price will be used.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {variantsFieldArray.fields.map((variant, index) => (
                        <div
                          key={variant.fieldId}
                          className="grid gap-3 rounded-2xl border bg-muted/20 p-4 sm:grid-cols-[1fr_160px_auto]"
                        >
                          <FormField
                            control={form.control}
                            name={`variants.${index}.name`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Variant name</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., 5GB SIM" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`variants.${index}.price`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Variant price</FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.01" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="flex items-end justify-end">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => variantsFieldArray.remove(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => variantsFieldArray.append({ name: "", price: 0 })}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add variant
                  </Button>
                </CardContent>
              </Card>
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
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
                )}
              />
              <FormField
                control={form.control}
                name="relatedTourId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Related Tour (Optional)</FormLabel>
                    <Select
                      value={field.value ?? "__none__"}
                      onValueChange={(value) =>
                        field.onChange(value === "__none__" ? null : value)
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a related tour" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {tours.map((tour) => (
                          <SelectItem key={tour.id} value={tour.id}>
                            {tour.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Link this upsell item to a specific tour if it&apos;s an
                      add-on.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Card>
                <CardHeader>
                  <CardTitle>Upsell targeting &amp; rules</CardTitle>
                  <CardDescription>
                    Control where this upsell appears in the cart.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6">
                  <FormField
                    control={form.control}
                    name="targeting.match"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Match mode</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select match mode" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="any">Any</SelectItem>
                            <SelectItem value="all">All</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="targeting.destinations"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Destinations</FormLabel>
                        <FormControl>
                          <Combobox
                            options={destinationOptions}
                            selected={field.value ?? []}
                            onChange={field.onChange}
                            placeholder="Select destinations..."
                            className="w-full"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="targeting.tourIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Specific tours</FormLabel>
                        <FormControl>
                          <Combobox
                            options={tourOptions}
                            selected={field.value ?? []}
                            onChange={field.onChange}
                            placeholder="Select tours..."
                            className="w-full"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Item Image</CardTitle>
                  <CardDescription>
                    Upload an image for the upsell item.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="images"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <ImageUploader
                            value={field.value || []}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>
                        Is this upsell item currently available?
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {submitButtonText}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}
