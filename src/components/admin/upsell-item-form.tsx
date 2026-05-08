'use client';

import { useFieldArray, useForm } from 'react-hook-form';
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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, PlusCircle, Trash2 } from 'lucide-react';
import { ImageUploader } from '@/components/admin/image-uploader';
import type { UpsellItem, Tour } from '@/types';
import { useEffect, useState } from 'react';
import { getToursSelect } from '@/lib/supabase/tours-client';
import {
  getHotelsSelect,
  getRoomTypesSelect,
  type HotelSelectRow,
  type RoomTypeSelectRow,
} from '@/lib/supabase/hotels-client';
import { Combobox } from '@/components/ui/combobox';

const variantSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Variant name is required'),
  price: z.coerce.number().min(0, 'Price must be positive.'),
});

const placementSchema = z.object({
  match: z.enum(['any', 'all']).default('any'),
  destinations: z.array(z.string()).default([]),
  tourIds: z.array(z.string()).default([]),
  roomTypeIds: z.array(z.string()).default([]),
  hotelIds: z.array(z.string()).default([]),
  showInCart: z.boolean().default(true),
});

export const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  description: z.string().optional(),
  price: z.coerce.number().min(0, 'Price must be positive.'),
  currency: z.string().default('USD'),
  variants: z.array(variantSchema).optional(),
  pricingMode: z
    .enum(['flat', 'per_person', 'per_hour', 'per_person_per_hour'])
    .default('flat'),
  quantityMode: z.enum(['none', 'pax', 'hours', 'pax_and_hours']).default('none'),
  minPax: z.coerce.number().int().min(1).optional().nullable(),
  maxPax: z.coerce.number().int().min(1).optional().nullable(),
  minHours: z.coerce.number().min(0.25).optional().nullable(),
  maxHours: z.coerce.number().min(0.25).optional().nullable(),
  defaultHours: z.coerce.number().min(0.25).optional().nullable(),
  placement: placementSchema.default({
    match: 'any',
    destinations: [],
    tourIds: [],
    roomTypeIds: [],
    hotelIds: [],
    showInCart: true,
  }),
  sortOrder: z.coerce.number().int().default(0),
  type: z.enum(['service', 'tour_addon'], {
    errorMap: () => ({ message: 'Please select a type.' }),
  }),
  relatedTourId: z.string().nullable().optional(),
  images: z.array(z.any()).optional(),
  isActive: z.boolean().default(true),
});

interface UpsellItemFormProps {
  initialData?: UpsellItem;
  onSubmit: (values: z.infer<typeof formSchema>) => Promise<void> | void;
  formType: 'new' | 'edit';
}

const PRICING_MODE_DESCRIPTIONS: Record<z.infer<typeof formSchema>['pricingMode'], string> = {
  flat: 'Single charge for the whole service (e.g. airport pickup per car).',
  per_person: 'Charged per guest (e.g. boat ticket per person).',
  per_hour: 'Charged per hour booked (e.g. private guide).',
  per_person_per_hour: 'Combined per-guest and per-hour charge (e.g. camel ride).',
};

const QUANTITY_MODE_DESCRIPTIONS: Record<z.infer<typeof formSchema>['quantityMode'], string> = {
  none: 'No selectors at booking time — guests just toggle the addon on/off.',
  pax: 'Guests pick how many people the addon covers.',
  hours: 'Guests pick how many hours they want.',
  pax_and_hours: 'Guests pick both number of people and number of hours.',
};

export function UpsellItemForm({ initialData, onSubmit, formType }: UpsellItemFormProps) {
  const [tours, setTours] = useState<Array<Pick<Tour, 'id' | 'name' | 'destination'>>>([]);
  const [hotels, setHotels] = useState<HotelSelectRow[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomTypeSelectRow[]>([]);

  useEffect(() => {
    void getToursSelect().then(setTours).catch(() => setTours([]));
    void getHotelsSelect().then(setHotels).catch(() => setHotels([]));
    void getRoomTypesSelect().then(setRoomTypes).catch(() => setRoomTypes([]));
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData
      ? {
          ...initialData,
          relatedTourId: initialData.relatedTourId || null,
          variants: initialData.variants ?? [],
          pricingMode: initialData.pricingMode ?? 'flat',
          quantityMode: initialData.quantityMode ?? 'none',
          minPax: initialData.minPax ?? null,
          maxPax: initialData.maxPax ?? null,
          minHours: initialData.minHours ?? null,
          maxHours: initialData.maxHours ?? null,
          defaultHours: initialData.defaultHours ?? null,
          currency: initialData.currency ?? 'USD',
          sortOrder: initialData.sortOrder ?? 0,
          placement: {
            match: initialData.placement?.match ?? 'any',
            tourIds: initialData.placement?.tourIds ?? [],
            destinations: initialData.placement?.destinations ?? [],
            roomTypeIds: initialData.placement?.roomTypeIds ?? [],
            hotelIds: initialData.placement?.hotelIds ?? [],
            showInCart: initialData.placement?.showInCart ?? true,
          },
          images: initialData.imageUrl ? [initialData.imageUrl] : [],
        }
      : {
          name: '',
          description: '',
          price: 0,
          currency: 'USD',
          variants: [],
          pricingMode: 'flat',
          quantityMode: 'none',
          minPax: null,
          maxPax: null,
          minHours: null,
          maxHours: null,
          defaultHours: null,
          placement: {
            match: 'any',
            destinations: [],
            tourIds: [],
            roomTypeIds: [],
            hotelIds: [],
            showInCart: true,
          },
          sortOrder: 0,
          type: 'service',
          relatedTourId: null,
          images: [],
          isActive: true,
        },
  });

  const variantsFieldArray = useFieldArray({
    control: form.control,
    name: 'variants',
    keyName: 'fieldId',
  });

  const destinationOptions = Array.from(
    new Set(tours.map((tour) => tour.destination).filter((v) => v && v.length > 0))
  )
    .sort((a, b) => a.localeCompare(b))
    .map((destination) => ({ value: destination, label: destination }));

  const tourOptions = tours.map((tour) => ({ value: tour.id, label: tour.name }));
  const hotelOptions = hotels.map((h) => ({ value: h.id, label: h.name }));
  const roomTypeOptions = roomTypes.map((r) => ({
    value: r.id,
    label: r.hotelName ? `${r.hotelName} — ${r.name}` : r.name,
  }));

  const pricingMode = form.watch('pricingMode');
  const quantityMode = form.watch('quantityMode');
  const showsPax = quantityMode === 'pax' || quantityMode === 'pax_and_hours';
  const showsHours = quantityMode === 'hours' || quantityMode === 'pax_and_hours';

  const pageTitle = formType === 'new' ? 'Create New Add-on' : 'Edit Add-on';
  const pageDescription =
    formType === 'new'
      ? 'Define a service guests can attach to their tour or room booking.'
      : `Editing: "${initialData?.name}"`;
  const submitButtonText = formType === 'new' ? 'Create Add-on' : 'Save Changes';

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
              <CardTitle>Basic details</CardTitle>
              <CardDescription>What is the add-on and what does it cost?</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
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
              <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit price</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormDescription>Interpreted by the pricing mode below.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <FormControl>
                        <Input maxLength={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing &amp; quantity</CardTitle>
              <CardDescription>
                Decide how the price is interpreted and which quantity controls guests see.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <FormField
                control={form.control}
                name="pricingMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pricing mode</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select pricing mode" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="flat">Flat (per service)</SelectItem>
                        <SelectItem value="per_person">Per person</SelectItem>
                        <SelectItem value="per_hour">Per hour</SelectItem>
                        <SelectItem value="per_person_per_hour">Per person · per hour</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>{PRICING_MODE_DESCRIPTIONS[pricingMode]}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="quantityMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity controls</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select quantity controls" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No selectors</SelectItem>
                        <SelectItem value="pax">People only</SelectItem>
                        <SelectItem value="hours">Hours only</SelectItem>
                        <SelectItem value="pax_and_hours">People &amp; hours</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>{QUANTITY_MODE_DESCRIPTIONS[quantityMode]}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {showsPax && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="minPax"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Min people</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            placeholder="1"
                            value={field.value ?? ''}
                            onChange={(e) =>
                              field.onChange(e.target.value === '' ? null : Number(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="maxPax"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max people</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            placeholder="∞"
                            value={field.value ?? ''}
                            onChange={(e) =>
                              field.onChange(e.target.value === '' ? null : Number(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {showsHours && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="minHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Min hours</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.5"
                            min={0.5}
                            placeholder="1"
                            value={field.value ?? ''}
                            onChange={(e) =>
                              field.onChange(e.target.value === '' ? null : Number(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="defaultHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default hours</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.5"
                            min={0.5}
                            placeholder="1"
                            value={field.value ?? ''}
                            onChange={(e) =>
                              field.onChange(e.target.value === '' ? null : Number(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="maxHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max hours</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.5"
                            min={0.5}
                            placeholder="∞"
                            value={field.value ?? ''}
                            onChange={(e) =>
                              field.onChange(e.target.value === '' ? null : Number(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <Card className="bg-muted/20">
                <CardHeader>
                  <CardTitle className="text-base">Variants</CardTitle>
                  <CardDescription>
                    Optional price overrides (e.g. Big Car / Small Car). Variants inherit the
                    pricing mode above.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {variantsFieldArray.fields.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No variants. The unit price will be used.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {variantsFieldArray.fields.map((variant, index) => (
                        <div
                          key={variant.fieldId}
                          className="grid gap-3 rounded-2xl border bg-background p-4 sm:grid-cols-[1fr_160px_auto]"
                        >
                          <FormField
                            control={form.control}
                            name={`variants.${index}.name`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Variant name</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., Big Car" {...field} />
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
                    onClick={() => variantsFieldArray.append({ name: '', price: 0 })}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add variant
                  </Button>
                </CardContent>
              </Card>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Placement</CardTitle>
              <CardDescription>
                Where should guests see this add-on while booking?
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <FormField
                control={form.control}
                name="placement.match"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Match mode</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select match mode" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="any">Any (show if at least one matches)</SelectItem>
                        <SelectItem value="all">All (require every selected target)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="placement.destinations"
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
                name="placement.tourIds"
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
              <FormField
                control={form.control}
                name="placement.hotelIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hotels</FormLabel>
                    <FormControl>
                      <Combobox
                        options={hotelOptions}
                        selected={field.value ?? []}
                        onChange={field.onChange}
                        placeholder="Select hotels..."
                        className="w-full"
                      />
                    </FormControl>
                    <FormDescription>
                      Surface this add-on on every room in the selected hotel(s).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="placement.roomTypeIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specific room types</FormLabel>
                    <FormControl>
                      <Combobox
                        options={roomTypeOptions}
                        selected={field.value ?? []}
                        onChange={field.onChange}
                        placeholder="Select rooms..."
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="placement.showInCart"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Show as suggestion in cart</FormLabel>
                      <FormDescription>
                        When enabled, the add-on also appears in the cart&apos;s
                        &quot;Suggested services&quot; panel for matching itineraries.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Image &amp; classification</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6">
              <FormField
                control={form.control}
                name="images"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image</FormLabel>
                    <FormControl>
                      <ImageUploader value={field.value || []} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
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
                    <FormLabel>Related tour (optional)</FormLabel>
                    <Select
                      value={field.value ?? '__none__'}
                      onValueChange={(value) =>
                        field.onChange(value === '__none__' ? null : value)
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
                      Legacy field used for analytics; placement above drives where this surfaces.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sort order</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormDescription>Lower values appear first in the picker.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>Inactive add-ons are hidden from guests.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
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
