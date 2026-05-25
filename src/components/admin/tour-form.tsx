'use client';

import { useState } from 'react';
import { useForm, useFieldArray, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  ArrowLeft,
  Loader2,
  PlusCircle,
  Trash2,
  Map,
  Calendar,
  CalendarCheck,
  DollarSign,
  Image as ImageIcon,
  Settings,
  List,
  AlertCircle,
  Package,
  Users,
  ChevronDown,
  ChevronUp,
  Copy,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { TourAvailabilityManager } from '@/components/admin/tour-availability-manager';
import { ImageUploader } from '@/components/admin/image-uploader';
import { UnsavedChangesWarning } from '@/components/admin/unsaved-changes-warning';
import { Combobox } from '@/components/ui/combobox';
import type { Tour } from '@/types';

const priceTierSchema = z.object({
  minPeople: z.coerce.number().min(1, 'Min people is required'),
  maxPeople: z.preprocess(
    (val) => (val === undefined || val === null || val === '' ? null : val),
    z.coerce.number().nullable()
  ),
  pricePerAdult: z.coerce.number().min(0, 'Price must be positive'),
  pricePerChild: z.coerce.number().min(0, 'Price must be positive'),
});

const itineraryItemSchema = z.object({
  day: z.coerce.number().min(1),
  activity: z.string().min(1, 'Activity is required'),
});

const packageSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Package name is required'),
  description: z.string().nullish(),
  priceTiers: z.array(priceTierSchema).min(1, 'At least one price tier is required.'),
});

export const formSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters.'),
    slug: z
      .string()
      .min(1, 'Slug is required.')
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        'Slug must be lowercase with words separated by dashes.'
      ),
    // Legacy single destination — kept in sync with `destinations[0]` server-side.
    // `destinations` is the source of truth; the singular field is preserved
    // for backwards compatibility with read sites that haven't been migrated yet.
    destination: z.string().min(1, 'Please select at least one destination.'),
    destinations: z
      .array(z.string())
      .min(1, 'Select at least one destination.'),
    type: z.array(z.string()).refine((value) => value.length > 0, {
      message: 'You have to select at least one item.',
    }),
    duration: z.coerce.number().min(1, 'Duration must be at least 1 day.'),
    description: z.string().min(10, 'Description must be at least 10 characters.'),
    images: z.array(z.any()).min(1, 'At least one image is required.'),
    availability: z.boolean().default(true),
    rating: z.coerce.number().min(1).max(5),
    priceTiers: z.array(priceTierSchema).optional(),
    packages: z.array(packageSchema).optional(),

    durationText: z.string().optional(),
    tourType: z.string().optional(),
    availabilityDescription: z.string().optional(),
    pickupAndDropoff: z.string().optional(),
    cancellationPolicy: z.string().optional(),
    itinerary: z.array(itineraryItemSchema).optional(),
    highlights: z.array(z.object({ value: z.string() })).optional(),
    includes: z.array(z.object({ value: z.string() })).optional(),
    excludes: z.array(z.object({ value: z.string() })).optional(),
  })
  .refine((data) => (data.packages?.length ?? 0) > 0 || (data.priceTiers?.length ?? 0) > 0, {
    message: 'You must add at least one package with pricing.',
    path: ['packages'],
  });

interface TourFormProps {
  initialData?: Tour;
  onSubmit: (values: z.infer<typeof formSchema>) => void | Promise<void>;
  formType: 'new' | 'edit';
  categories?: string[];
  destinations?: string[];
}

// Sub-component for individual package editing
const PACKAGE_COLORS = [
  'border-l-primary',
  'border-l-blue-500',
  'border-l-amber-500',
  'border-l-emerald-500',
] as const;

function PackageEditor({
  index,
  remove,
  onDuplicate,
}: {
  index: number;
  remove: (index: number) => void;
  onDuplicate: (index: number) => void;
}) {
  const { control, watch } = useFormContext<z.infer<typeof formSchema>>();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const {
    fields: priceTierFields,
    append: appendPriceTier,
    remove: removePriceTier,
  } = useFieldArray({
    control,
    name: `packages.${index}.priceTiers`,
  });

  const packageName = watch(`packages.${index}.name`);
  const borderColor = PACKAGE_COLORS[index % PACKAGE_COLORS.length];

  return (
    <Card className={`border-l-4 ${borderColor} overflow-hidden`}>
      {/* Collapsible Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <Badge variant="secondary" className="shrink-0 font-mono text-xs">
          {index + 1}
        </Badge>
        <span className="font-semibold truncate flex-1">
          {packageName || <span className="text-muted-foreground italic">Unnamed Package</span>}
        </span>
        <Badge variant="outline" className="shrink-0 text-xs gap-1">
          <Users className="h-3 w-3" />
          {priceTierFields.length} {priceTierFields.length === 1 ? 'tier' : 'tiers'}
        </Badge>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => onDuplicate(index)}
            title="Duplicate package"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => remove(index)}
            title="Delete package"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
        {isCollapsed ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </div>

      {/* Expandable Body */}
      {!isCollapsed && (
        <>
          <Separator />
          <CardContent className="pt-4 space-y-4">
            {/* Package Info */}
            <div className="grid sm:grid-cols-2 gap-4">
              <FormField
                control={control}
                name={`packages.${index}.name`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Package Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Standard, Luxury, VIP"
                        className="font-semibold"
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
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Description <span className="normal-case">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Includes entry fees and lunch"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Price Tiers */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Price Tiers
                </span>
              </div>

              {priceTierFields.map((field, tierIndex) => (
                <div
                  key={field.id}
                  className={`relative rounded-lg border p-4 ${
                    tierIndex % 2 === 0 ? 'bg-background' : 'bg-muted/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Tier {tierIndex + 1}
                    </span>
                    {priceTierFields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => removePriceTier(tierIndex)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    {/* People Range Group */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" /> People Range
                      </span>
                      <div className="flex items-center gap-2">
                        <FormField
                          control={control}
                          name={`packages.${index}.priceTiers.${tierIndex}.minPeople`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input
                                  type="number"
                                  className="h-8 text-center"
                                  placeholder="Min"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <span className="text-muted-foreground text-sm font-medium">—</span>
                        <FormField
                          control={control}
                          name={`packages.${index}.priceTiers.${tierIndex}.maxPeople`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input
                                  type="number"
                                  className="h-8 text-center"
                                  placeholder="∞"
                                  {...field}
                                  value={field.value ?? ''}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Pricing Group */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-3 w-3" /> Price Per Person
                      </span>
                      <div className="flex items-center gap-2">
                        <FormField
                          control={control}
                          name={`packages.${index}.priceTiers.${tierIndex}.pricePerAdult`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                                    $
                                  </span>
                                  <Input
                                    type="number"
                                    className="h-8 pl-6"
                                    placeholder="Adult"
                                    {...field}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={control}
                          name={`packages.${index}.priceTiers.${tierIndex}.pricePerChild`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                                    $
                                  </span>
                                  <Input
                                    type="number"
                                    className="h-8 pl-6"
                                    placeholder="Child"
                                    {...field}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Helper text on first tier only */}
                  {tierIndex === 0 && priceTierFields.length === 1 && (
                    <p className="text-[11px] text-muted-foreground mt-2">
                      Leave max people empty for unlimited group size. Add more tiers for volume
                      pricing.
                    </p>
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
                    minPeople:
                      priceTierFields.length > 0
                        ? (
                            priceTierFields[priceTierFields.length - 1] as unknown as {
                              maxPeople: number | null;
                            }
                          ).maxPeople
                          ? Number(
                              (
                                priceTierFields[priceTierFields.length - 1] as unknown as {
                                  maxPeople: number | null;
                                }
                              ).maxPeople
                            ) + 1
                          : 1
                        : 1,
                    maxPeople: null,
                    pricePerAdult: 100,
                    pricePerChild: 50,
                  })
                }
              >
                <PlusCircle className="mr-2 h-3 w-3" />
                Add Tier {priceTierFields.length + 1}
              </Button>
            </div>
          </CardContent>
        </>
      )}
    </Card>
  );
}

// Sub-component for the reactive pricing summary bar
function PricingSummary({
  control: _control,
  packageCount,
}: {
  control: ReturnType<typeof useForm<z.infer<typeof formSchema>>>['control'];
  packageCount: number;
}) {
  const { watch } = useFormContext<z.infer<typeof formSchema>>();
  const packages = watch('packages');

  const lowestPrice = packages
    ?.flatMap((p) => p.priceTiers?.map((t) => t.pricePerAdult) ?? [])
    .filter((p): p is number => typeof p === 'number' && p > 0)
    .sort((a, b) => a - b)[0];

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-3">
      <div className="rounded-full bg-primary/10 p-2">
        <DollarSign className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">
          {packageCount} {packageCount === 1 ? 'package' : 'packages'}
          {lowestPrice ? (
            <span className="text-muted-foreground font-normal">
              {' '}
              · Starting from <span className="font-semibold text-foreground">${lowestPrice}</span>
              /person
            </span>
          ) : (
            <span className="text-muted-foreground font-normal"> · Set prices below</span>
          )}
        </p>
      </div>
    </div>
  );
}

export function TourForm({
  initialData,
  onSubmit,
  formType,
  categories = [],
  destinations = [],
}: TourFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData
      ? {
          ...initialData,
          // Backfill `destinations` from the legacy singular when an existing
          // tour was last saved before multi-destination was wired through
          // the form. The DB migration already populates the column, but
          // initialData may come from a code path that hasn't been redeployed.
          destinations:
            Array.isArray(initialData.destinations) &&
            initialData.destinations.length > 0
              ? initialData.destinations
              : initialData.destination
                ? [initialData.destination]
                : [],
          highlights: initialData.highlights?.map((h) => ({ value: h })) ?? [{ value: '' }],
          includes: initialData.includes?.map((i) => ({ value: i })) ?? [{ value: '' }],
          excludes: initialData.excludes?.map((e) => ({ value: e })) ?? [{ value: '' }],
          images: initialData.images || [], // Pass existing image URLs
          packages: initialData.packages || [],
          priceTiers: initialData.priceTiers || [],
        }
      : {
          name: '',
          slug: '',
          destination: '',
          destinations: [],
          duration: 1,
          description: '',
          images: [],
          availability: true,
          rating: 4.5,
          priceTiers: [],
          packages: [],
          itinerary: [{ day: 1, activity: '' }],
          highlights: [{ value: '' }],
          includes: [{ value: '' }],
          excludes: [{ value: '' }],
          durationText: '',
          tourType: '',
          availabilityDescription: '',
          pickupAndDropoff: '',
          cancellationPolicy: '',
          type: [],
        },
  });

  const {
    fields: packageFields,
    append: appendPackage,
    remove: removePackage,
  } = useFieldArray({
    control: form.control,
    name: 'packages',
  });

  const {
    fields: itineraryFields,
    append: appendItinerary,
    remove: removeItinerary,
  } = useFieldArray({
    control: form.control,
    name: 'itinerary',
  });

  const {
    fields: highlightFields,
    append: appendHighlight,
    remove: removeHighlight,
  } = useFieldArray({
    control: form.control,
    name: 'highlights',
  });

  const {
    fields: includesFields,
    append: appendIncludes,
    remove: removeIncludes,
  } = useFieldArray({
    control: form.control,
    name: 'includes',
  });

  const {
    fields: excludesFields,
    append: appendExcludes,
    remove: removeExcludes,
  } = useFieldArray({
    control: form.control,
    name: 'excludes',
  });

  const generateSlug = () => {
    const name = form.getValues('name');
    if (name) {
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      form.setValue('slug', slug, { shouldValidate: true });
    }
  };

  const getTabHasError = (tab: string) => {
    const errors = form.formState.errors;
    if (!errors) return false;

    switch (tab) {
      case 'overview':
        return !!(
          errors.name ||
          errors.slug ||
          errors.destination ||
          errors.type ||
          errors.duration ||
          errors.durationText ||
          errors.description
        );
      case 'media':
        return !!errors.images;
      case 'itinerary':
        return !!errors.itinerary;
      case 'details':
        return !!(
          errors.highlights ||
          errors.includes ||
          errors.excludes ||
          errors.pickupAndDropoff ||
          errors.availabilityDescription ||
          errors.cancellationPolicy
        );
      case 'pricing':
        return !!(errors.packages || errors.priceTiers);
      case 'settings':
        return !!(errors.availability || errors.rating || errors.tourType);
      default:
        return false;
    }
  };

  const renderFieldArray = (
    title: string,
    fields: Record<'id', string>[],
    remove: (index: number) => void,
    append: (value: { value: string }) => void,
    fieldName: 'highlights' | 'includes' | 'excludes',
    placeholder?: string,
    className?: string
  ) => (
    <Card className={`flex flex-col ${className || ''}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          {title}
          <span className="text-xs font-normal text-muted-foreground ml-auto bg-muted px-2 py-0.5 rounded-full">
            {fields.length} items
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 flex-1">
        {fields.map((field, index) => (
          <FormField
            key={field.id}
            control={form.control}
            name={`${fieldName}.${index}.value`}
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-2 group">
                  <div className="flex-1 relative">
                    <Input
                      {...field}
                      className="pr-8"
                      placeholder={placeholder || `Enter a ${fieldName.slice(0, -1)}...`}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-70 group-hover:opacity-100 transition-all"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
        {fields.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-4 italic bg-muted/20 rounded-md">
            No items added yet.
          </div>
        )}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="w-full mt-2"
          onClick={() => append({ value: '' })}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Item
        </Button>
      </CardContent>
    </Card>
  );

  const categoriesOptions = categories.map((c) => ({ value: c, label: c }));
  const destinationOptions = destinations;

  const pageTitle = formType === 'new' ? 'Create Tour' : 'Edit Tour';
  const pageDescription =
    formType === 'new'
      ? 'Add a new tour package to your catalog.'
      : 'Modify existing tour details.';
  const submitButtonText = formType === 'new' ? 'Create Tour' : 'Save Changes';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 pb-6 border-b">
        <Button variant="ghost" size="icon" asChild className="-ml-2">
          <Link href="/admin/tours">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to tours</span>
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{pageTitle}</h2>
          <p className="text-muted-foreground mt-1">{pageDescription}</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <UnsavedChangesWarning
            dirty={form.formState.isDirty}
            disabled={form.formState.isSubmitting}
          />
          <Button
            variant="outline"
            onClick={() => form.reset()}
            disabled={!form.formState.isDirty || form.formState.isSubmitting}
          >
            Discard
          </Button>
          <Button onClick={form.handleSubmit(onSubmit)} disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              submitButtonText
            )}
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-7 h-auto">
              <TabsTrigger value="overview" className="flex gap-2 relative">
                <Map className="h-4 w-4" /> Overview
                {getTabHasError('overview') && (
                  <AlertCircle className="h-3 w-3 text-destructive absolute top-1 right-1" />
                )}
              </TabsTrigger>
              <TabsTrigger value="media" className="flex gap-2 relative">
                <ImageIcon className="h-4 w-4" /> Media
                {getTabHasError('media') && (
                  <AlertCircle className="h-3 w-3 text-destructive absolute top-1 right-1" />
                )}
              </TabsTrigger>
              <TabsTrigger value="itinerary" className="flex gap-2 relative">
                <Calendar className="h-4 w-4" /> Itinerary
                {getTabHasError('itinerary') && (
                  <AlertCircle className="h-3 w-3 text-destructive absolute top-1 right-1" />
                )}
              </TabsTrigger>
              <TabsTrigger value="details" className="flex gap-2 relative">
                <List className="h-4 w-4" /> Details
                {getTabHasError('details') && (
                  <AlertCircle className="h-3 w-3 text-destructive absolute top-1 right-1" />
                )}
              </TabsTrigger>
              <TabsTrigger value="pricing" className="flex gap-2 relative">
                <DollarSign className="h-4 w-4" /> Pricing
                {getTabHasError('pricing') && (
                  <AlertCircle className="h-3 w-3 text-destructive absolute top-1 right-1" />
                )}
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex gap-2 relative">
                <Settings className="h-4 w-4" /> Settings
                {getTabHasError('settings') && (
                  <AlertCircle className="h-3 w-3 text-destructive absolute top-1 right-1" />
                )}
              </TabsTrigger>
              {formType === 'edit' && initialData?.id && (
                <TabsTrigger value="availability" className="flex gap-2 relative">
                  <CalendarCheck className="h-4 w-4" /> Availability
                </TabsTrigger>
              )}
            </TabsList>

            <div className="mt-6">
              {/* OVERVIEW TAB */}
              <TabsContent value="overview" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                    <CardDescription>The core details of your tour.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-6">
                    <div className="grid gap-6 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel>Tour Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., Pyramids & Sphinx Expedition"
                                className="text-lg font-medium"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                }}
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
                          <FormItem className="col-span-2">
                            <FormLabel>Slug</FormLabel>
                            <div className="flex gap-2">
                              <FormControl>
                                <Input
                                  placeholder="e.g., pyramids-sphinx-expedition"
                                  className="font-mono text-sm"
                                  {...field}
                                />
                              </FormControl>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={generateSlug}
                                className="shrink-0"
                              >
                                Generate
                              </Button>
                            </div>
                            <FormDescription>
                              Unique URL identifier: /tours/<strong>{field.value || '...'}</strong>
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="destinations"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Destinations</FormLabel>
                            <FormDescription>
                              Pick one or more — the first selection is the primary destination
                              shown on cards and breadcrumbs.
                            </FormDescription>
                            {destinationOptions.length > 0 ? (
                              <Combobox
                                options={destinationOptions.map((d) => ({ value: d, label: d }))}
                                selected={field.value || []}
                                onChange={(next) => {
                                  field.onChange(next);
                                  // Keep the legacy singular `destination` in sync with
                                  // the first selection. The server reconciles too, but
                                  // doing it here means form-level validation sees a
                                  // populated value immediately.
                                  form.setValue('destination', next[0] ?? '', {
                                    shouldValidate: true,
                                    shouldDirty: true,
                                  });
                                }}
                                placeholder="Select destinations…"
                                className="w-full"
                              />
                            ) : (
                              <div className="rounded-md border border-dashed border-input bg-muted/30 p-3 text-sm text-muted-foreground text-center">
                                No destinations defined. Add some in Tour Settings first.
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Categories</FormLabel>
                            <Combobox
                              options={categoriesOptions}
                              selected={field.value || []}
                              onChange={field.onChange}
                              placeholder="Select categories…"
                              className="w-full"
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="duration"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Duration (Days)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} min={1} />
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
                            <FormLabel>Duration Label</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., 3 Days / 2 Nights" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

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
                              className="resize-y min-h-[120px]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* MEDIA TAB */}
              <TabsContent value="media">
                <Card>
                  <CardHeader>
                    <CardTitle>Media Gallery</CardTitle>
                    <CardDescription>
                      Upload high-quality images. The first image will be the main cover.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="images"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <ImageUploader value={field.value} onChange={field.onChange} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ITINERARY TAB */}
              <TabsContent value="itinerary">
                <Card>
                  <CardHeader>
                    <CardTitle>Daily Itinerary</CardTitle>
                    <CardDescription>Outline the day-by-day plan for the tour.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4 relative before:absolute before:inset-0 before:ml-6 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-muted-foreground/20 before:to-transparent">
                      {itineraryFields.map((field, index) => (
                        <div key={field.id} className="relative pl-12 group">
                          <div className="absolute left-0 top-2 flex h-12 w-12 items-center justify-center rounded-full border bg-background text-sm font-bold shadow-sm z-10">
                            D{index + 1}
                          </div>
                          <div className="space-y-2 border rounded-lg p-4 bg-card/50 hover:bg-card hover:shadow-md transition-all">
                            <div className="flex items-center justify-between">
                              <FormLabel className="font-medium text-primary">
                                Day {index + 1} Activities
                              </FormLabel>
                              {itineraryFields.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
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
                                      placeholder={`What happens on Day ${index + 1}?`}
                                      className="min-h-[80px] resize-none"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        appendItinerary({
                          day: itineraryFields.length + 1,
                          activity: '',
                        })
                      }
                      className="ml-12 w-[calc(100%-3rem)] border-dashed"
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Day {itineraryFields.length + 1}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* DETAILS TAB */}
              <TabsContent value="details" className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {renderFieldArray(
                    'Highlights',
                    highlightFields,
                    removeHighlight,
                    appendHighlight,
                    'highlights',
                    'e.g. Visit the Great Pyramid',
                    'h-full'
                  )}
                  <div className="space-y-6">
                    {renderFieldArray(
                      "What's Included",
                      includesFields,
                      removeIncludes,
                      appendIncludes,
                      'includes',
                      'e.g. Airport transfers'
                    )}
                    {renderFieldArray(
                      "What's Excluded",
                      excludesFields,
                      removeExcludes,
                      appendExcludes,
                      'excludes',
                      'e.g. International flights'
                    )}
                  </div>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Logistics & Policies</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-6 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="pickupAndDropoff"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pickup & Drop-off</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Hotel pickup included" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="availabilityDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Availability Note</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Daily departures" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="cancellationPolicy"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Cancellation Policy</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Brief policy summary..."
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* PRICING TAB */}
              <TabsContent value="pricing">
                <Card className="border-none shadow-none sm:border sm:shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Packages & Pricing
                    </CardTitle>
                    <CardDescription>
                      Create different packages (e.g. Standard, Luxury) with their own pricing tiers
                      based on group size.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Pricing Summary Bar */}
                    {packageFields.length > 0 && (
                      <PricingSummary control={form.control} packageCount={packageFields.length} />
                    )}

                    {/* Empty State */}
                    {packageFields.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="rounded-full bg-muted p-4 mb-4">
                          <Package className="h-10 w-10 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold mb-1">No packages yet</h3>
                        <p className="text-sm text-muted-foreground max-w-md mb-6">
                          Add pricing packages to define what customers can book. Each package can
                          have multiple price tiers based on group size.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Button
                            type="button"
                            variant="default"
                            onClick={() =>
                              appendPackage({
                                id: crypto.randomUUID(),
                                name: 'Standard',
                                description: '',
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
                            Start with one package
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              appendPackage({
                                id: crypto.randomUUID(),
                                name: 'Standard',
                                description: 'Basic tour experience',
                                priceTiers: [
                                  {
                                    minPeople: 1,
                                    maxPeople: 4,
                                    pricePerAdult: 100,
                                    pricePerChild: 50,
                                  },
                                  {
                                    minPeople: 5,
                                    maxPeople: null,
                                    pricePerAdult: 80,
                                    pricePerChild: 40,
                                  },
                                ],
                              });
                              appendPackage({
                                id: crypto.randomUUID(),
                                name: 'Luxury',
                                description: 'Premium experience with extras',
                                priceTiers: [
                                  {
                                    minPeople: 1,
                                    maxPeople: 4,
                                    pricePerAdult: 200,
                                    pricePerChild: 100,
                                  },
                                  {
                                    minPeople: 5,
                                    maxPeople: null,
                                    pricePerAdult: 170,
                                    pricePerChild: 85,
                                  },
                                ],
                              });
                            }}
                          >
                            <Package className="mr-2 h-4 w-4" />
                            Start with Standard + Luxury
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Package Editors */}
                        {packageFields.map((field, index) => (
                          <PackageEditor
                            key={field.id}
                            index={index}
                            remove={removePackage}
                            onDuplicate={(idx) => {
                              const packages = form.getValues('packages');
                              if (packages?.[idx]) {
                                const source = packages[idx];
                                appendPackage({
                                  id: crypto.randomUUID(),
                                  name: `${source.name} (Copy)`,
                                  description: source.description ?? '',
                                  priceTiers: source.priceTiers.map((t) => ({ ...t })),
                                });
                              }
                            }}
                          />
                        ))}

                        {/* Add Package Button */}
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full border-dashed h-12"
                          onClick={() =>
                            appendPackage({
                              id: crypto.randomUUID(),
                              name: '',
                              description: '',
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
                          Add Package {packageFields.length + 1}
                        </Button>
                      </>
                    )}

                    {/* Validation Error */}
                    {form.formState.errors.packages?.message && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          {form.formState.errors.packages.message}
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* AVAILABILITY TAB (edit mode only) */}
              {formType === 'edit' && initialData?.id && (
                <TabsContent value="availability">
                  <Card>
                    <CardHeader>
                      <CardTitle>Date Availability</CardTitle>
                      <CardDescription>
                        Block specific dates or set capacity limits. Dates without rules have
                        unlimited availability.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <TourAvailabilityManager tourId={initialData.id} />
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* SETTINGS TAB */}
              <TabsContent value="settings">
                <Card>
                  <CardHeader>
                    <CardTitle>Tour Settings</CardTitle>
                    <CardDescription>Configuration for visibility and metadata.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="availability"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Published</FormLabel>
                            <FormDescription>
                              Make this tour visible to customers on the website.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="grid sm:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="rating"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Manual Rating</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.1" min={0} max={5} {...field} />
                            </FormControl>
                            <FormDescription>
                              Override or set an initial rating (0-5).
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="tourType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tour Type Label</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Private Guided" {...field} />
                            </FormControl>
                            <FormDescription>Displayed badge on tour cards.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </form>
      </Form>
    </div>
  );
}
