"use client";

import { useForm, useFieldArray, useFormContext } from "react-hook-form";
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
import { Combobox } from "@/components/ui/combobox";
import type { Tour } from "@/types";

const priceTierSchema = z.object({
  minPeople: z.coerce.number().min(1, "Min people is required"),
  maxPeople: z.coerce.number().nullable(),
  pricePerAdult: z.coerce.number().min(0, "Price must be positive"),
  pricePerChild: z.coerce.number().min(0, "Price must be positive"),
});

const itineraryItemSchema = z.object({
  day: z.coerce.number().min(1),
  activity: z.string().min(1, "Activity is required"),
});

const destinations = [
  "Cairo",
  "Luxor",
  "Aswan",
  "Sharm El Sheikh",
  "Hurghada",
  "Alexandria",
];
const tourCategories = [
  { value: "Adventure", label: "Adventure" },
  { value: "Relaxation", label: "Relaxation" },
  { value: "Cultural", label: "Cultural" },
  { value: "Culinary", label: "Culinary" },
  { value: "Family", label: "Family" },
  { value: "Honeymoon", label: "Honeymoon" },
  { value: "Package", label: "Package" },
  { value: "Daily", label: "Daily" },
];

const packageSchema = z.object({
  id: z.string().optional(), // For internal tracking if needed, or just generate one
  name: z.string().min(1, "Package name is required"),
  description: z.string().optional(),
  priceTiers: z.array(priceTierSchema).min(1, "At least one price tier is required."),
});

export const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  slug: z
    .string()
    .min(1, "Slug is required.")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase with words separated by dashes.",
    ),
  destination: z.enum(destinations as [string, ...string[]], {
    errorMap: () => ({ message: "Please select a destination." }),
  }),
  type: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "You have to select at least one item.",
  }),
  duration: z.coerce.number().min(1, "Duration must be at least 1 day."),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters."),
  images: z.array(z.any()).min(1, "At least one image is required."),
  availability: z.boolean().default(true),
  rating: z.coerce.number().min(1).max(5),
  priceTiers: z.array(priceTierSchema).optional(), // Make optional as packages are preferred
  packages: z.array(packageSchema).optional(), // New packages field

  durationText: z.string().optional(),
  tourType: z.string().optional(),
  availabilityDescription: z.string().optional(),
  pickupAndDropoff: z.string().optional(),
  cancellationPolicy: z.string().optional(),
  itinerary: z.array(itineraryItemSchema).optional(),
  highlights: z.array(z.object({ value: z.string() })).optional(),
  includes: z.array(z.object({ value: z.string() })).optional(),
  excludes: z.array(z.object({ value: z.string() })).optional(),
});

interface TourFormProps {
  initialData?: Tour;
  onSubmit: (values: z.infer<typeof formSchema>) => void;
  formType: "new" | "edit";
}



// Sub-component for individual package editing
function PackageEditor({
  index,
  remove,
}: {
  index: number;
  remove: (index: number) => void;
}) {
  const { control } = useFormContext<z.infer<typeof formSchema>>();
  
  const {
    fields: priceTierFields,
    append: appendPriceTier,
    remove: removePriceTier,
  } = useFieldArray({
    control,
    name: `packages.${index}.priceTiers`,
  });

  return (
    <Card className="border-l-4 border-l-primary/20">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="space-y-1 flex-1">
            <FormField
              control={control}
              name={`packages.${index}.name`}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder="Package Name (e.g., Standard, Luxury)"
                      className="font-bold text-lg"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={`packages.${index}.description`}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder="Description (e.g., Includes entry fees...)"
                      className="text-sm text-muted-foreground"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive hover:bg-destructive/10 -mt-2 -mr-2"
            onClick={() => remove(index)}
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 bg-muted/20 p-4 pt-2 rounded-b-lg">
        <div className="text-sm font-semibold mb-2">Price Tiers</div>
        {priceTierFields.map((field, tierIndex) => (
          <div
            key={field.id}
            className="grid grid-cols-4 gap-4 items-end p-3 bg-background border rounded-md relative"
          >
            <FormField
              control={control}
              name={`packages.${index}.priceTiers.${tierIndex}.minPeople`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Min People</FormLabel>
                  <FormControl>
                    <Input type="number" className="h-8" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={`packages.${index}.priceTiers.${tierIndex}.maxPeople`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Max People</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="unlimited"
                      className="h-8"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={`packages.${index}.priceTiers.${tierIndex}.pricePerAdult`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Adult Price</FormLabel>
                  <FormControl>
                    <Input type="number" className="h-8" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={`packages.${index}.priceTiers.${tierIndex}.pricePerChild`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Child Price</FormLabel>
                  <FormControl>
                    <Input type="number" className="h-8" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {priceTierFields.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => removePriceTier(tierIndex)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full border-dashed"
          onClick={() =>
            appendPriceTier({
              minPeople: 1,
              maxPeople: null,
              pricePerAdult: 100,
              pricePerChild: 50,
            })
          }
        >
          <PlusCircle className="mr-2 h-3 w-3" />
          Add Price Tier
        </Button>
      </CardContent>
    </Card>
  );
}

export function TourForm({ initialData, onSubmit, formType }: TourFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData
      ? {
          ...initialData,
          highlights: initialData.highlights?.map((h) => ({ value: h })) ?? [
            { value: "" },
          ],
          includes: initialData.includes?.map((i) => ({ value: i })) ?? [
            { value: "" },
          ],
          excludes: initialData.excludes?.map((e) => ({ value: e })) ?? [
            { value: "" },
          ],
          images: initialData.images || [], // Pass existing image URLs
          packages: initialData.packages || [],
          priceTiers: initialData.priceTiers || [],
        }
      : {
          name: "",
          slug: "",
          destination: undefined,
          duration: 1,
          description: "",
          images: [],
          availability: true,
          rating: 4.5,
          priceTiers: [],
          packages: [],
          itinerary: [{ day: 1, activity: "" }],
          highlights: [{ value: "" }],
          includes: [{ value: "" }],
          excludes: [{ value: "" }],
          durationText: "",
          tourType: "",
          availabilityDescription: "",
          pickupAndDropoff: "",
          cancellationPolicy: "",
          type: [],
        },
  });

  const {
    fields: packageFields,
    append: appendPackage,
    remove: removePackage,
  } = useFieldArray({
    control: form.control,
    name: "packages",
  });

  const {
    fields: itineraryFields,
    append: appendItinerary,
    remove: removeItinerary,
  } = useFieldArray({
    control: form.control,
    name: "itinerary",
  });

  const {
    fields: highlightFields,
    append: appendHighlight,
    remove: removeHighlight,
  } = useFieldArray({
    control: form.control,
    name: "highlights",
  });

  const {
    fields: includesFields,
    append: appendIncludes,
    remove: removeIncludes,
  } = useFieldArray({
    control: form.control,
    name: "includes",
  });

  const {
    fields: excludesFields,
    append: appendExcludes,
    remove: removeExcludes,
  } = useFieldArray({
    control: form.control,
    name: "excludes",
  });

  const renderFieldArray = (
    title: string,
    fields: Record<"id", string>[],
    remove: (index: number) => void,
    append: (value: { value: string }) => void,
    fieldName: "highlights" | "includes" | "excludes",
  ) => (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.map((field, index) => (
          <FormField
            key={field.id}
            control={form.control}
            name={`${fieldName}.${index}.value`}
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-2">
                  <Input
                    {...field}
                    placeholder={`Enter a ${fieldName.slice(0, -1)}...`}
                  />
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ value: "" })}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Add {fieldName.slice(0, -1)}
        </Button>
      </CardContent>
    </Card>
  );

  const pageTitle = formType === "new" ? "Create a New Tour" : "Edit Tour";
  const pageDescription =
    formType === "new"
      ? "Fill out the details below to add a new tour package."
      : `Editing the tour: "${initialData?.name}"`;
  const submitButtonText = formType === "new" ? "Create Tour" : "Save Changes";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/admin/tours">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to tours</span>
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{pageTitle}</h2>
          <p className="text-muted-foreground">{pageDescription}</p>
        </div>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Tour Details</CardTitle>
                  <CardDescription>
                    Provide the main information about the tour.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tour Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Pyramids & Sphinx Expedition"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slug</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., pyramids-sphinx-expedition"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          A unique, URL-friendly identifier for the tour.
                        </FormDescription>
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
                            placeholder="A brief but compelling description of the tour..."
                            {...field}
                            rows={5}
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
                  <CardTitle>Tour Images</CardTitle>
                  <CardDescription>
                    Upload images for the tour. Drag and drop or click to
                    browse. The first image will be the main thumbnail. (Note:
                    for editing, you must re-upload images)
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
                            value={field.value}
                            onChange={field.onChange}
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
                  <CardTitle>Itinerary</CardTitle>
                  <CardDescription>
                    Outline the day-by-day plan for the tour.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {itineraryFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="p-4 border rounded-md relative space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <FormLabel className="font-bold">
                          Day {index + 1}
                        </FormLabel>
                        {itineraryFields.length > 1 && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => removeItinerary(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <FormField
                        control={form.control}
                        name={`itinerary.${index}.activity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea
                                placeholder="Describe the activities for this day..."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      appendItinerary({
                        day: itineraryFields.length + 1,
                        activity: "",
                      })
                    }
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Itinerary Day
                  </Button>
                </CardContent>
              </Card>

              {renderFieldArray(
                "Highlights",
                highlightFields,
                removeHighlight,
                appendHighlight,
                "highlights",
              )}

              <div className="grid md:grid-cols-2 gap-6">
                {renderFieldArray(
                  "What's Included",
                  includesFields,
                  removeIncludes,
                  appendIncludes,
                  "includes",
                )}
                {renderFieldArray(
                  "What's Excluded",
                  excludesFields,
                  removeExcludes,
                  appendExcludes,
                  "excludes",
                )}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Packages & Pricing</CardTitle>
                  <CardDescription>
                    Create different packages (e.g. Standard, Luxury) with their own pricing tiers.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {packageFields.map((field, index) => (
                    <PackageEditor
                      key={field.id}
                      index={index}
                      remove={removePackage}
                    />
                  ))}
                  
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      appendPackage({
                        id: crypto.randomUUID(),
                        name: "",
                        description: "",
                        priceTiers: [
                          {
                            minPeople: 1,
                            maxPeople: null,
                            pricePerAdult: 100,
                            pricePerChild: 50,
                          },
                        ],
                      })
                    }
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Package
                  </Button>
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-1 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Properties</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6">
                  <FormField
                    control={form.control}
                    name="destination"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Destination</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a destination" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {destinations.map((destination) => (
                              <SelectItem key={destination} value={destination}>
                                {destination}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tour Category</FormLabel>
                        <Combobox
                          options={tourCategories}
                          selected={field.value}
                          onChange={field.onChange}
                          placeholder="Select categories..."
                          className="w-full"
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tourType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tour Type</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Private Guided Tour"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          A more specific type, e.g., &apos;Luxury Nile Cruise&apos;.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (in days)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="durationText"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration Text</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., 3 Days / 2 Nights"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Overrides the number above if provided.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="rating"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rating (1-5)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pickupAndDropoff"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pickup & Drop-off</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Included from any hotel in Cairo"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="availability"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Availability</FormLabel>
                          <FormDescription>
                            Is this tour currently available for booking?
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="availabilityDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Availability Description</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Available daily. Book in advance."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cancellationPolicy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cancellation Policy</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe the cancellation terms..."
                            {...field}
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
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardFooter className="flex justify-end">
                  <Button type="submit">{submitButtonText}</Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}