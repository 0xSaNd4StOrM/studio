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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ImageUploader } from "@/components/admin/image-uploader";
import Image from "next/image";
import { browseCategoryIconKeys } from "@/types";
import type { BrowseCategoryItem } from "@/types";

const defaultBrowseCategories: BrowseCategoryItem[] = [
  { label: "Adventure", type: "adventure", icon: "mountain" },
  { label: "Relaxation", type: "relaxation", icon: "sailboat" },
  { label: "Cultural", type: "cultural", icon: "building2" },
  { label: "Culinary", type: "culinary", icon: "utensils" },
  { label: "Family", type: "family", icon: "ferrisWheel" },
  { label: "Honeymoon", type: "honeymoon", icon: "plane" },
];

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
    imageUrl:
      "https://images.unsplash.com/photo-1699115823831-cf1329dfc58f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw4fHxhZHZlbnR1cmUlMjB0cmF2ZWx8ZW58MHx8fHwxNzUyNjIyOTA5fDA&ixlib=rb-4.1.0&q=80&w=1080",
    imageAlt: "Adventure travel",
    badgeValue: "25+",
    badgeLabel: "Years Of Experience",
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
  browseCategory: {
    title: "Browse By Destination Category",
    subtitle: "Select a category to see our exclusive tour packages",
    categories: defaultBrowseCategories,
  },
  popularDestinations: {
    pretitle: "Top Destinations",
    title: "Popular Tours We Offer",
    count: 6,
  },
  discountBanners: {
    banner1: {
      title: "35% OFF",
      description: "Explore The World tour Hotel Booking.",
      imageUrl: "https://placehold.co/200x150.png",
      buttonText: "Book Now",
      buttonLink: "/tours",
    },
    banner2: {
      title: "35% OFF",
      description: "On Flight Ticket Grab This Now.",
      imageUrl: "https://placehold.co/200x150.png",
      buttonText: "Book Now",
      buttonLink: "/tours",
    },
  },
  lastMinuteOffers: {
    discount: "50%",
    pretitle: "Deals & Offers",
    title: "Incredible Last-Minute Offers",
    count: 4,
  },
  testimonials: [
    {
      name: "Brooklyn Simmons",
      role: "Brooklyn Simmons",
      avatar: "https://placehold.co/100x100.png",
      content:
        "Praesent ut lacus a velit tincidunt aliquam a eget urna. Sed ullamcorper tristique nisl at pharetra turpis accumsan et etiam eu sollicitudin eros. In imperdiet accumsan.",
    },
    {
      name: "Kristin Watson",
      role: "Web Designer",
      avatar: "https://placehold.co/100x100.png",
      content:
        "Praesent ut lacus a velit tincidunt aliquam a eget urna. Sed ullamcorper tristique nisl at pharetra turpis accumsan et etiam eu sollicitudin eros. In imperdiet accumsan.",
    },
    {
      name: "Wade Warren",
      role: "President Of Sales",
      avatar: "https://placehold.co/100x100.png",
      content:
        "Praesent ut lacus a velit tincidunt aliquam a eget urna. Sed ullamcorper tristique nisl at pharetra turpis accumsan et etiam eu sollicitudin eros. In imperdiet accumsan.",
    },
  ],
  testimonialCount: 6,
  videoSection: {
    pretitle: "Watch Our Story",
    title: "We Provide The Best Tour Facilities",
    backgroundImageUrl: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
    button1Text: "Find Out More",
    button1Link: "/tours",
    button2Text: "Watch Video",
    button2Link: "#",
  },
  newsSection: {
    pretitle: "News & Updates",
    title: "Our Latest News & Articles",
    count: 3,
  },
  visibility: {
    hero: true,
    browseCategory: true,
    whyChooseUs: true,
    popularDestinations: true,
    discountBanners: true,
    lastMinuteOffers: true,
    testimonials: true,
    videoSection: true,
    newsSection: true,
  },
};

const testimonialSchema = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.string().min(1, "Role is required"),
  avatar: z.string().url("Must be a valid URL"),
  content: z.string().min(10, "Testimonial text is too short"),
});

const featureSchema = z.object({
  title: z.string().min(1, "Feature title is required"),
  description: z.string().min(1, "Feature description is required"),
});

const browseCategoryItemSchema = z.object({
  label: z.string().min(1, "Label is required"),
  type: z.string().min(1, "Type is required"),
  icon: z.enum(browseCategoryIconKeys),
});

// Safe File check for SSR
const fileSchema =
  typeof window !== "undefined" && typeof File !== "undefined"
    ? z.instanceof(File)
    : z.any();

const formSchema = z.object({
  hero: z.object({
    title: z.string().min(1, "Hero title is required"),
    subtitle: z.string().min(1, "Hero subtitle is required"),
    image: z.array(fileSchema).optional(),
    imageAlt: z.string().optional(),
  }),
  whyChooseUs: z.object({
    pretitle: z.string().min(1, "Pre-title is required"),
    title: z.string().min(1, "Title is required"),
    image: z.array(fileSchema).optional(),
    imageAlt: z.string().optional(),
    badgeValue: z.string().optional(),
    badgeLabel: z.string().optional(),
    feature1: featureSchema,
    feature2: featureSchema,
    feature3: featureSchema,
  }),
  browseCategory: z.object({
    title: z.string().min(1, "Title is required"),
    subtitle: z.string().min(1, "Subtitle is required"),
    categories: z.array(browseCategoryItemSchema).optional(),
  }),
  popularDestinations: z.object({
    pretitle: z.string().optional(),
    title: z.string().optional(),
    count: z.coerce.number().min(3).max(12).optional(),
  }),
  discountBanners: z.object({
    banner1: z.object({
      title: z.string().min(1, "Title is required"),
      description: z.string().min(1, "Description is required"),
      image: z.array(fileSchema).optional(),
      buttonText: z.string().optional(),
      buttonLink: z.string().optional(),
    }),
    banner2: z.object({
      title: z.string().min(1, "Title is required"),
      description: z.string().min(1, "Description is required"),
      image: z.array(fileSchema).optional(),
      buttonText: z.string().optional(),
      buttonLink: z.string().optional(),
    }),
  }),
  lastMinuteOffers: z.object({
    discount: z.string().min(1, "Discount is required"),
    pretitle: z.string().min(1, "Pre-title is required"),
    title: z.string().min(1, "Title is required"),
    count: z.coerce.number().min(2).max(10).optional(),
  }),
  testimonials: z.array(testimonialSchema),
  testimonialCount: z.coerce.number().min(1).max(20).optional(),
  videoSection: z.object({
    pretitle: z.string().min(1, "Pre-title is required"),
    title: z.string().min(1, "Title is required"),
    backgroundImage: z.array(fileSchema).optional(),
    button1Text: z.string().optional(),
    button1Link: z.string().optional(),
    button2Text: z.string().optional(),
    button2Link: z.string().optional(),
  }),
  newsSection: z.object({
    pretitle: z.string().min(1, "Pre-title is required"),
    title: z.string().min(1, "Title is required"),
    count: z.coerce.number().min(1).max(9).optional(),
  }),
  visibility: z.object({
    hero: z.boolean().default(true),
    browseCategory: z.boolean().default(true),
    whyChooseUs: z.boolean().default(true),
    popularDestinations: z.boolean().default(true),
    discountBanners: z.boolean().default(true),
    lastMinuteOffers: z.boolean().default(true),
    testimonials: z.boolean().default(true),
    videoSection: z.boolean().default(true),
    newsSection: z.boolean().default(true),
  }),
});

export function HomePageEditorForm() {
  const [existingHeroUrl, setExistingHeroUrl] = useState<string | null>(null);
  const [existingBanner1Url, setExistingBanner1Url] = useState<string | null>(null);
  const [existingBanner2Url, setExistingBanner2Url] = useState<string | null>(null);
  const [existingVideoBgUrl, setExistingVideoBgUrl] = useState<string | null>(null);
  const [existingWhyChooseUsUrl, setExistingWhyChooseUsUrl] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultHomePageData,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "testimonials",
  });

  const {
    fields: categoryFields,
    append: appendCategory,
    remove: removeCategory,
  } = useFieldArray({
    control: form.control,
    name: "browseCategory.categories",
  });

  useEffect(() => {
    async function loadContent() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("home_page_content")
        .select("data")
        .eq("id", 1)
        .maybeSingle();
      
      if (!error && data && data.data) {
        const content = data.data as Partial<typeof defaultHomePageData>;
        // Safe casting for nested properties
        const heroContent = (content.hero || {}) as Partial<typeof defaultHomePageData.hero>;
        const discountBanners = (content.discountBanners || {}) as Partial<typeof defaultHomePageData.discountBanners>;
        const videoSection = (content.videoSection || {}) as Partial<typeof defaultHomePageData.videoSection>;
        const whyChooseUs = (content.whyChooseUs || {}) as Partial<typeof defaultHomePageData.whyChooseUs>;
        const browseCategory = (content.browseCategory || {}) as Partial<typeof defaultHomePageData.browseCategory>;
        const popularDestinations = (content.popularDestinations || {}) as Partial<typeof defaultHomePageData.popularDestinations>;
        const lastMinuteOffers = (content.lastMinuteOffers || {}) as Partial<typeof defaultHomePageData.lastMinuteOffers>;
        const newsSection = (content.newsSection || {}) as Partial<typeof defaultHomePageData.newsSection>;
        const visibility = (content.visibility || {}) as Partial<typeof defaultHomePageData.visibility>;

        const normalizedTestimonials = (content.testimonials || defaultHomePageData.testimonials).map(
          (t) => ({
            name: (t as { name?: string }).name ?? "",
            role: (t as { role?: string }).role ?? "",
            avatar: (t as { avatar?: string }).avatar ?? "https://placehold.co/100x100.png",
            content:
              (t as { content?: string }).content ??
              (t as { text?: string }).text ??
              "",
          }),
        );
        
        form.reset({
          ...defaultHomePageData,
          hero: {
            title: heroContent.title ?? defaultHomePageData.hero.title,
            subtitle: heroContent.subtitle ?? defaultHomePageData.hero.subtitle,
            image: [],
            imageAlt: heroContent.imageAlt ?? defaultHomePageData.hero.imageAlt,
          },
          whyChooseUs: {
            ...defaultHomePageData.whyChooseUs,
            ...whyChooseUs,
            image: [],
            feature1: { ...defaultHomePageData.whyChooseUs.feature1, ...whyChooseUs.feature1 },
            feature2: { ...defaultHomePageData.whyChooseUs.feature2, ...whyChooseUs.feature2 },
            feature3: { ...defaultHomePageData.whyChooseUs.feature3, ...whyChooseUs.feature3 },
          },
          browseCategory: {
            ...defaultHomePageData.browseCategory,
            ...browseCategory,
            categories: browseCategory.categories ?? defaultHomePageData.browseCategory.categories,
          },
          popularDestinations: {
            ...defaultHomePageData.popularDestinations,
            ...popularDestinations,
          },
          lastMinuteOffers: {
            ...defaultHomePageData.lastMinuteOffers,
            ...lastMinuteOffers,
          },
          newsSection: {
            ...defaultHomePageData.newsSection,
            ...newsSection,
          },
          visibility: {
            ...defaultHomePageData.visibility,
            ...visibility,
          },
          testimonials: normalizedTestimonials,
          testimonialCount: content.testimonialCount ?? defaultHomePageData.testimonialCount,
          discountBanners: {
             banner1: {
                 ...defaultHomePageData.discountBanners.banner1,
                 ...discountBanners.banner1,
                 image: [],
             },
             banner2: {
                 ...defaultHomePageData.discountBanners.banner2,
                 ...discountBanners.banner2,
                 image: [],
             },
          },
          videoSection: {
              ...defaultHomePageData.videoSection,
              ...videoSection,
              backgroundImage: [],
          }
        });
        
        setExistingHeroUrl(heroContent.imageUrl || null);
        setExistingBanner1Url(discountBanners.banner1?.imageUrl || null);
        setExistingBanner2Url(discountBanners.banner2?.imageUrl || null);
        setExistingVideoBgUrl(videoSection.backgroundImageUrl || null);
        setExistingWhyChooseUsUrl(whyChooseUs.imageUrl || null);
      }
    }
    loadContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleImageUpload(file: File | undefined | null, pathPrefix: string): Promise<string | null> {
      if (!file || typeof File === "undefined" || !(file instanceof File)) return null;
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "png";
      const path = `home/${pathPrefix}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("cms")
        .upload(path, file, {
          contentType: file.type || "image/png",
          upsert: true,
        });
      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage
          .from("cms")
          .getPublicUrl(path);
        return publicUrlData.publicUrl;
      }
      return null;
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const supabase = createClient();
    
    // Handle uploads
    const heroFile = values.hero?.image && values.hero.image[0];
    const whyChooseUsFile = values.whyChooseUs?.image && values.whyChooseUs.image[0];
    const banner1File = values.discountBanners?.banner1?.image && values.discountBanners.banner1.image[0];
    const banner2File = values.discountBanners?.banner2?.image && values.discountBanners.banner2.image[0];
    const videoBgFile = values.videoSection?.backgroundImage && values.videoSection.backgroundImage[0];

    const newHeroUrl = await handleImageUpload(heroFile, "hero");
    const newWhyChooseUsUrl = await handleImageUpload(whyChooseUsFile, "why-choose-us");
    const newBanner1Url = await handleImageUpload(banner1File, "banner1");
    const newBanner2Url = await handleImageUpload(banner2File, "banner2");
    const newVideoBgUrl = await handleImageUpload(videoBgFile, "video-bg");

    const heroUrl = newHeroUrl || existingHeroUrl || defaultHomePageData.hero.imageUrl;
    const whyChooseUsUrl =
      newWhyChooseUsUrl || existingWhyChooseUsUrl || defaultHomePageData.whyChooseUs.imageUrl;
    const banner1Url =
      newBanner1Url || existingBanner1Url || defaultHomePageData.discountBanners.banner1.imageUrl;
    const banner2Url =
      newBanner2Url || existingBanner2Url || defaultHomePageData.discountBanners.banner2.imageUrl;
    const videoBgUrl =
      newVideoBgUrl ||
      existingVideoBgUrl ||
      defaultHomePageData.videoSection.backgroundImageUrl;

    // Build content payload excluding transient file field
    const {
      hero: _hero,
      whyChooseUs: _whyChooseUs,
      discountBanners: _discountBanners,
      videoSection: _videoSection,
      ...rest
    } = values;
    
    const contentToSave = {
      ...rest,
      hero: {
        title: values.hero.title,
        subtitle: values.hero.subtitle,
        imageUrl: heroUrl,
        imageAlt: values.hero.imageAlt,
      },
      whyChooseUs: {
        pretitle: values.whyChooseUs.pretitle,
        title: values.whyChooseUs.title,
        imageUrl: whyChooseUsUrl,
        imageAlt: values.whyChooseUs.imageAlt,
        badgeValue: values.whyChooseUs.badgeValue,
        badgeLabel: values.whyChooseUs.badgeLabel,
        feature1: values.whyChooseUs.feature1,
        feature2: values.whyChooseUs.feature2,
        feature3: values.whyChooseUs.feature3,
      },
      discountBanners: {
          banner1: {
              title: values.discountBanners.banner1.title,
              description: values.discountBanners.banner1.description,
              imageUrl: banner1Url,
              buttonText: values.discountBanners.banner1.buttonText,
              buttonLink: values.discountBanners.banner1.buttonLink,
          },
          banner2: {
              title: values.discountBanners.banner2.title,
              description: values.discountBanners.banner2.description,
              imageUrl: banner2Url,
              buttonText: values.discountBanners.banner2.buttonText,
              buttonLink: values.discountBanners.banner2.buttonLink,
          },
      },
      videoSection: {
          pretitle: values.videoSection.pretitle,
          title: values.videoSection.title,
          backgroundImageUrl: videoBgUrl,
          button1Text: values.videoSection.button1Text,
          button1Link: values.videoSection.button1Link,
          button2Text: values.videoSection.button2Text,
          button2Link: values.videoSection.button2Link,
      },
    };

    const { error } = await supabase
      .from("home_page_content")
      .upsert({ id: 1, data: contentToSave });

    if (!error) {
      alert("Home page content updated successfully!");
    } else {
      alert("Failed to update content.");
    }
  }

  const renderFeatureFields = (featureName: "feature1" | "feature2" | "feature3", label: string) => (
    <Card>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <FormField
          control={form.control}
          name={`whyChooseUs.${featureName}.title`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Feature Title</FormLabel>
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
      <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
        console.error("Form validation errors:", errors);
        alert("Please check the form for errors. Some required fields might be missing.");
      })} className="space-y-8">
        <Accordion type="single" collapsible defaultValue="hero" className="w-full">
          <AccordionItem value="visibility">
            <AccordionTrigger className="text-lg font-semibold">
              Section Visibility
            </AccordionTrigger>
            <AccordionContent>
              <Card className="border-0 shadow-none">
                <CardContent className="pt-6 grid gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="visibility.hero"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Hero Section</FormLabel>
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
                      name="visibility.browseCategory"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Browse Category</FormLabel>
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
                      name="visibility.whyChooseUs"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Why Choose Us</FormLabel>
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
                      name="visibility.popularDestinations"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Popular Destinations</FormLabel>
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
                      name="visibility.discountBanners"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Discount Banners</FormLabel>
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
                      name="visibility.lastMinuteOffers"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Last Minute Offers</FormLabel>
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
                      name="visibility.testimonials"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Testimonials</FormLabel>
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
                      name="visibility.videoSection"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Video Section</FormLabel>
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
                      name="visibility.newsSection"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">News Section</FormLabel>
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
                  </div>
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="hero">
            <AccordionTrigger className="text-lg font-semibold">
              Hero Section
            </AccordionTrigger>
            <AccordionContent>
              <Card className="border-0 shadow-none">
                <CardContent className="pt-6 grid gap-6">
                  {/* Preview existing hero image */}
                  {(existingHeroUrl || defaultHomePageData.hero.imageUrl) && (
                    <div className="relative w-full h-40 rounded-md overflow-hidden border">
                      <Image
                        src={existingHeroUrl || defaultHomePageData.hero.imageUrl}
                        alt={form.getValues("hero.imageAlt") || defaultHomePageData.hero.imageAlt || "Hero Image"}
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

          <AccordionItem value="browseCategory">
            <AccordionTrigger className="text-lg font-semibold">
              Browse Category Section
            </AccordionTrigger>
            <AccordionContent>
              <Card className="border-0 shadow-none">
                <CardContent className="pt-6 grid gap-6">
                  <FormField
                    control={form.control}
                    name="browseCategory.title"
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
                    name="browseCategory.subtitle"
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
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-base">Categories</FormLabel>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          appendCategory({
                            label: "New Category",
                            type: "adventure",
                            icon: "mountain",
                          })
                        }
                      >
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Category
                      </Button>
                    </div>
                    <div className="grid gap-4">
                      {categoryFields.map((field, index) => (
                        <Card key={field.id} className="relative p-4">
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-7 w-7"
                            onClick={() => removeCategory(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <div className="grid md:grid-cols-3 gap-4">
                            <FormField
                              control={form.control}
                              name={`browseCategory.categories.${index}.label`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Label</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`browseCategory.categories.${index}.type`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Type Param</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="e.g., adventure" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`browseCategory.categories.${index}.icon`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Icon</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select icon" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="mountain">Mountain</SelectItem>
                                      <SelectItem value="sailboat">Sailboat</SelectItem>
                                      <SelectItem value="building2">Building</SelectItem>
                                      <SelectItem value="utensils">Utensils</SelectItem>
                                      <SelectItem value="ferrisWheel">Ferris Wheel</SelectItem>
                                      <SelectItem value="plane">Plane</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
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
                  {(existingWhyChooseUsUrl || defaultHomePageData.whyChooseUs.imageUrl) && (
                    <div className="relative w-full h-48 rounded-md overflow-hidden border">
                      <Image
                        src={existingWhyChooseUsUrl || defaultHomePageData.whyChooseUs.imageUrl}
                        alt={form.getValues("whyChooseUs.imageAlt") || defaultHomePageData.whyChooseUs.imageAlt || "Why choose us image"}
                        fill
                        className="object-cover"
                        sizes="100vw"
                      />
                    </div>
                  )}
                  <FormField
                    control={form.control}
                    name="whyChooseUs.image"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Section Image</FormLabel>
                        <FormControl>
                          <ImageUploader value={field.value || []} onChange={field.onChange} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="whyChooseUs.imageAlt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Image Alt Text</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Adventure travel" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="whyChooseUs.badgeValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Badge Value</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="25+" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="whyChooseUs.badgeLabel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Badge Label</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Years Of Experience" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid md:grid-cols-3 gap-6">
                    {renderFeatureFields("feature1", "Feature 1")}
                    {renderFeatureFields("feature2", "Feature 2")}
                    {renderFeatureFields("feature3", "Feature 3")}
                  </div>
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="popularDestinations">
            <AccordionTrigger className="text-lg font-semibold">
              Popular Destinations
            </AccordionTrigger>
            <AccordionContent>
              <Card className="border-0 shadow-none">
                <CardContent className="pt-6 grid gap-6">
                  <FormField
                    control={form.control}
                    name="popularDestinations.pretitle"
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
                    name="popularDestinations.title"
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
                  <FormField
                    control={form.control}
                    name="popularDestinations.count"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Tours to Show</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} min={3} max={12} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                      {(existingBanner1Url || defaultHomePageData.discountBanners.banner1.imageUrl) && (
                        <div className="relative w-full h-32 rounded-md overflow-hidden border">
                          <Image
                            src={existingBanner1Url || defaultHomePageData.discountBanners.banner1.imageUrl}
                            alt="Banner 1"
                            fill
                            className="object-contain"
                          />
                        </div>
                      )}
                      <FormField
                        control={form.control}
                        name="discountBanners.banner1.image"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Banner Image</FormLabel>
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


                      <FormField
                        control={form.control}
                        name="discountBanners.banner1.buttonText"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Button Text</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Book Now" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="discountBanners.banner1.buttonLink"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Button Link</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="/tours" />
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
                      {(existingBanner2Url || defaultHomePageData.discountBanners.banner2.imageUrl) && (
                        <div className="relative w-full h-32 rounded-md overflow-hidden border">
                          <Image
                            src={existingBanner2Url || defaultHomePageData.discountBanners.banner2.imageUrl}
                            alt="Banner 2"
                            fill
                            className="object-contain"
                          />
                        </div>
                      )}
                      <FormField
                        control={form.control}
                        name="discountBanners.banner2.image"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Banner Image</FormLabel>
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
                      <FormField
                        control={form.control}
                        name="discountBanners.banner2.buttonText"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Button Text</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Book Now" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="discountBanners.banner2.buttonLink"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Button Link</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="/tours" />
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
                  <FormField
                    control={form.control}
                    name="lastMinuteOffers.count"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Offers to Show</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} min={2} max={10} />
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
                  <FormField
                    control={form.control}
                    name="testimonialCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Testimonials to Show</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} min={1} max={20} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                        name={`testimonials.${index}.content`}
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
                      append({ name: "", role: "", avatar: "", content: "" })
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
                  {/* Preview existing video background */}
                  {(existingVideoBgUrl || defaultHomePageData.videoSection.backgroundImageUrl) && (
                    <div className="relative w-full h-40 rounded-md overflow-hidden border">
                      <Image
                        src={existingVideoBgUrl || defaultHomePageData.videoSection.backgroundImageUrl || ""}
                        alt="Video Background"
                        fill
                        className="object-cover"
                        sizes="100vw"
                      />
                    </div>
                  )}
                  <FormField
                    control={form.control}
                    name="videoSection.backgroundImage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Background Image</FormLabel>
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
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="videoSection.button1Text"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Button 1 Text</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Find Out More" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="videoSection.button1Link"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Button 1 Link</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="/about" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="videoSection.button2Text"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Button 2 Text</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Watch Video" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="videoSection.button2Link"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Button 2 Link</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="https://youtube.com/..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
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
                  <FormField
                    control={form.control}
                    name="newsSection.count"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Articles to Show</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} min={1} max={9} />
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
