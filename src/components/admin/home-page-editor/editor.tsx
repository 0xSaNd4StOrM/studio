"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PlusCircle, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { ImageUploader } from "@/components/admin/image-uploader";
import Image from "next/image";

// In a real app, this default data would come from a database or API
const defaultHomePageData = {
  hero: {
    title: "Let's Make Your Best<br />Trip With Us",
    subtitle:
      "Explore the world with our curated travel packages. Adventure awaits!",
    imageUrl: "https://placehold.co/1920x1080.png",
    imageAlt: "Ancient Egyptian temples",
  },
  whyChooseUs: {
    pretitle: "Why Choose Us",
    title: "Great Opportunity For<br/>Adventure & Travels",
    feature1: {
      title: "Safety First",
      description:
        "We prioritize your safety to ensure you have a worry-free and memorable experience.",
    },
    feature2: {
      title: "Professional Guide",
      description:
        "Our guides are local experts who bring destinations to life with their passion and knowledge.",
    },
    feature3: {
      title: "Exclusive Trip",
      description:
        "We offer unique itineraries and exclusive access to create once-in-a-lifetime journeys.",
    },
  },
  discountBanners: {
    banner1: {
      title: "35% OFF",
      description: "Explore The World tour Hotel Booking.",
    },
    banner2: {
      title: "35% OFF",
      description: "On Flight Ticket Grab This Now.",
    },
  },
  lastMinuteOffers: {
    discount: "50%",
    pretitle: "Deals & Offers",
    title: "Incredible Last-Minute Offers",
  },
  testimonials: [
    {
      name: "Brooklyn Simmons",
      role: "Brooklyn Simmons",
      avatar: "https://placehold.co/100x100.png",
      text: "Praesent ut lacus a velit tincidunt aliquam a eget urna. Sed ullamcorper tristique nisl at pharetra turpis accumsan et etiam eu sollicitudin eros. In imperdiet accumsan.",
    },
    {
      name: "Kristin Watson",
      role: "Web Designer",
      avatar: "https://placehold.co/100x100.png",
      text: "Praesent ut lacus a velit tincidunt aliquam a eget urna. Sed ullamcorper tristique nisl at pharetra turpis accumsan et etiam eu sollicitudin eros. In imperdiet accumsan.",
    },
    {
      name: "Wade Warren",
      role: "President Of Sales",
      avatar: "https://placehold.co/100x100.png",
      text: "Praesent ut lacus a velit tincidunt aliquam a eget urna. Sed ullamcorper tristique nisl at pharetra turpis accumsan et etiam eu sollicitudin eros. In imperdiet accumsan.",
    },
  ],
  videoSection: {
    pretitle: "Watch Our Story",
    title: "We Provide The Best Tour Facilities",
  },
  newsSection: {
    pretitle: "News & Updates",
    title: "Our Latest News & Articles",
  },
};

const testimonialSchema = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.string().min(1, "Role is required"),
  avatar: z.string().url("Must be a valid URL"),
  text: z.string().min(10, "Testimonial text is too short"),
});

const featureSchema = z.object({
  title: z.string().min(1, "Feature title is required"),
  description: z.string().min(1, "Feature description is required"),
});

const formSchema = z.object({
  hero: z.object({
    title: z.string().min(1, "Hero title is required"),
    subtitle: z.string().min(1, "Hero subtitle is required"),
    image: z.array(z.any()).optional(),
    imageAlt: z.string().optional(),
  }),
  whyChooseUs: z.object({
    pretitle: z.string().min(1, "Pre-title is required"),
    title: z.string().min(1, "Title is required"),
    feature1: featureSchema,
    feature2: featureSchema,
    feature3: featureSchema,
  }),
  discountBanners: z.object({
    banner1: z.object({
      title: z.string().min(1, "Title is required"),
      description: z.string().min(1, "Description is required"),
    }),
    banner2: z.object({
      title: z.string().min(1, "Title is required"),
      description: z.string().min(1, "Description is required"),
    }),
  }),
  lastMinuteOffers: z.object({
    discount: z.string().min(1, "Discount is required"),
    pretitle: z.string().min(1, "Pre-title is required"),
    title: z.string().min(1, "Title is required"),
  }),
  testimonials: z.array(testimonialSchema),
  videoSection: z.object({
    pretitle: z.string().min(1, "Pre-title is required"),
    title: z.string().min(1, "Title is required"),
  }),
  newsSection: z.object({
    pretitle: z.string().min(1, "Pre-title is required"),
    title: z.string().min(1, "Title is required"),
  }),
});

export function HomePageEditorForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultHomePageData,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "testimonials",
  });

  useEffect(() => {
    async function loadContent() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("home_page_content")
        .select("data")
        .eq("id", 1)
        .maybeSingle();
      if (!error && data && (data as any).data) {
        const content = (data as any).data;
        form.reset({
          ...defaultHomePageData,
          ...content,
          hero: {
            title: content?.hero?.title ?? defaultHomePageData.hero.title,
            subtitle:
              content?.hero?.subtitle ?? defaultHomePageData.hero.subtitle,
            image: [],
            imageAlt:
              content?.hero?.imageAlt ?? defaultHomePageData.hero.imageAlt,
          },
        });
        // Store existing hero image URL in a hidden field via form's values
        // so we can show preview without forcing the user to re-upload
        (form as any)._existingHeroUrl = content?.hero?.imageUrl || null;
      }
    }
    loadContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const supabase = createClient();
    // Handle hero image upload if provided
    let heroUrl: string | null = (form as any)._existingHeroUrl || null;
    try {
      const heroFile = values.hero?.image && values.hero.image[0];
      if (heroFile && heroFile instanceof File) {
        const ext = heroFile.name.split(".").pop() || "png";
        const path = `home/hero-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("cms")
          .upload(path, heroFile, {
            contentType: heroFile.type || "image/png",
            upsert: true,
          });
        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from("cms")
            .getPublicUrl(path);
          heroUrl = publicUrlData.publicUrl;
        }
      }
    } catch (_) {
      // ignore upload failure
    }

    // Build content payload excluding transient file field
    const { hero, ...rest } = values as any;
    const contentToSave = {
      ...rest,
      hero: {
        title: hero?.title ?? defaultHomePageData.hero.title,
        subtitle: hero?.subtitle ?? defaultHomePageData.hero.subtitle,
        imageUrl: heroUrl ?? defaultHomePageData.hero.imageUrl,
        imageAlt: hero?.imageAlt ?? defaultHomePageData.hero.imageAlt,
      },
    };
    const payload = {
      id: 1,
      data: contentToSave,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("home_page_content")
      .upsert(payload, { onConflict: "id" });
    if (error) {
      alert(`Failed to save home content: ${error.message}`);
    } else {
      alert("Home page content saved!");
    }
  }

  const renderFeatureFields = (
    featureName: "feature1" | "feature2" | "feature3",
    title: string,
  ) => (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <FormField
          control={form.control}
          name={`whyChooseUs.${featureName}.title`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={`whyChooseUs.${featureName}.description`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea {...field} rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Accordion
          type="multiple"
          defaultValue={[
            "item-1",
            "item-2",
            "item-3",
            "item-4",
            "item-5",
            "item-6",
            "item-7",
          ]}
          className="w-full"
        >
          <AccordionItem value="item-1">
            <AccordionTrigger className="text-lg font-semibold">
              Hero Section
            </AccordionTrigger>
            <AccordionContent>
              <Card className="border-0 shadow-none">
                <CardContent className="pt-6 grid gap-6">
                  {/* Preview existing hero image */}
                  {((form as any)._existingHeroUrl || defaultHomePageData.hero.imageUrl) && (
                    <div className="relative w-full h-40 rounded-md overflow-hidden border">
                      <Image
                        src={(form as any)._existingHeroUrl || defaultHomePageData.hero.imageUrl}
                        alt={form.getValues("hero.imageAlt") || defaultHomePageData.hero.imageAlt}
                        fill
                        className="object-cover"
                        sizes="100vw"
                      />
                    </div>
                  )}
                  <FormField
                    control={form.control}
                    name="hero.image"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hero Background Image</FormLabel>
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
                  <FormField
                    control={form.control}
                    name="hero.title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Main Title</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={2} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="hero.subtitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subtitle</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={2} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="hero.imageAlt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hero Image Alt Text</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ancient Egyptian temples" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-2">
            <AccordionTrigger className="text-lg font-semibold">
              Why Choose Us Section
            </AccordionTrigger>
            <AccordionContent>
              <Card className="border-0 shadow-none">
                <CardContent className="pt-6 grid gap-6">
                  <FormField
                    control={form.control}
                    name="whyChooseUs.pretitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pre-title</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="whyChooseUs.title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={2} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid md:grid-cols-3 gap-6">
                    {renderFeatureFields("feature1", "Feature 1")}
                    {renderFeatureFields("feature2", "Feature 2")}
                    {renderFeatureFields("feature3", "Feature 3")}
                  </div>
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-3">
            <AccordionTrigger className="text-lg font-semibold">
              Discount Banners
            </AccordionTrigger>
            <AccordionContent>
              <Card className="border-0 shadow-none">
                <CardContent className="pt-6 grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Banner 1 (Cyan)</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                      <FormField
                        control={form.control}
                        name="discountBanners.banner1.title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="discountBanners.banner1.description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Banner 2 (Blue)</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                      <FormField
                        control={form.control}
                        name="discountBanners.banner2.title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="discountBanners.banner2.description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-4">
            <AccordionTrigger className="text-lg font-semibold">
              Last Minute Offers
            </AccordionTrigger>
            <AccordionContent>
              <Card className="border-0 shadow-none">
                <CardContent className="pt-6 grid gap-6">
                  <FormField
                    control={form.control}
                    name="lastMinuteOffers.discount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discount Text</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., 50%" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastMinuteOffers.pretitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pre-title</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastMinuteOffers.title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-5">
            <AccordionTrigger className="text-lg font-semibold">
              Testimonials
            </AccordionTrigger>
            <AccordionContent>
              <Card className="border-0 shadow-none">
                <CardContent className="pt-6 space-y-4">
                  {fields.map((field, index) => (
                    <Card key={field.id} className="relative p-4">
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-7 w-7"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <div className="grid md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`testimonials.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`testimonials.${index}.role`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Role</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name={`testimonials.${index}.avatar`}
                        render={({ field }) => (
                          <FormItem className="mt-4">
                            <FormLabel>Avatar URL</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="https://placehold.co/100x100.png"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`testimonials.${index}.text`}
                        render={({ field }) => (
                          <FormItem className="mt-4">
                            <FormLabel>Testimonial Text</FormLabel>
                            <FormControl>
                              <Textarea {...field} rows={3} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </Card>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      append({ name: "", role: "", avatar: "", text: "" })
                    }
                  >
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Testimonial
                  </Button>
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-6">
            <AccordionTrigger className="text-lg font-semibold">
              Video Section
            </AccordionTrigger>
            <AccordionContent>
              <Card className="border-0 shadow-none">
                <CardContent className="pt-6 grid gap-6">
                  <FormField
                    control={form.control}
                    name="videoSection.pretitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pre-title</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="videoSection.title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={2} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-7">
            <AccordionTrigger className="text-lg font-semibold">
              News & Articles Section
            </AccordionTrigger>
            <AccordionContent>
              <Card className="border-0 shadow-none">
                <CardContent className="pt-6 grid gap-6">
                  <FormField
                    control={form.control}
                    name="newsSection.pretitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pre-title</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="newsSection.title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={2} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="flex justify-end sticky bottom-0 py-4 bg-background/80 backdrop-blur-sm">
          <Button type="submit" size="lg">
            Save Changes
          </Button>
        </div>
      </form>
    </Form>
  );
}
