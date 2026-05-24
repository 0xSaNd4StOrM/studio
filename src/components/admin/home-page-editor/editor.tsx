/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  PlusCircle,
  Trash2,
  Layout,
  Image as ImageIcon,
  MapPin,
  Tag,
  Video,
  Newspaper,
  MessageSquare,
  Eye,
  Save,
  Sparkles,
  ShieldCheck,
  Package,
  Landmark,
  BedDouble,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ImageUploader } from '@/components/admin/image-uploader';
import Image from 'next/image';
import { browseCategoryIconKeys } from '@/types';
import type { BrowseCategoryItem, HomeContent } from '@/types';
import { Separator } from '@/components/ui/separator';
import { updateHomePageContent } from '@/lib/supabase/agency-content';

const defaultBrowseCategories: BrowseCategoryItem[] = [];

const defaultHomePageData = {
  hero: {
    title: '',
    subtitle: '',
    imageUrl: '',
    imageAlt: '',
    searchType: 'tours',
    videoUrl: '',
  },
  whyChooseUs: {
    pretitle: '',
    title: '',
    imageUrl: '',
    imageAlt: '',
    badgeValue: '',
    badgeLabel: '',
    feature1: {
      title: '',
      description: '',
    },
    feature2: {
      title: '',
      description: '',
    },
    feature3: {
      title: '',
      description: '',
    },
  },
  browseCategory: {
    title: '',
    subtitle: '',
    categories: defaultBrowseCategories,
  },
  popularDestinations: {
    pretitle: '',
    title: '',
    count: 0,
  },
  discountBanners: {
    banner1: {
      title: '',
      description: '',
      imageUrl: '',
      buttonText: '',
      buttonLink: '',
    },
    banner2: {
      title: '',
      description: '',
      imageUrl: '',
      buttonText: '',
      buttonLink: '',
    },
  },
  lastMinuteOffers: {
    discount: '',
    pretitle: '',
    title: '',
    count: 0,
  },
  testimonials: [],
  testimonialCount: 0,
  videoSection: {
    pretitle: '',
    title: '',
    backgroundImageUrl: '',
    button1Text: '',
    button1Link: '',
    button2Text: '',
    button2Link: '',
  },
  newsSection: {
    pretitle: '',
    title: '',
    count: 0,
  },
  // Hotel Defaults
  roomsSection: {
    title: '',
    subtitle: '',
    count: 0,
  },
  hotelFeatures: {
    title: '',
    subtitle: '',
    features: [],
  },
  featuredRooms: {
    title: '',
    subtitle: '',
    roomIds: [],
  },
  hotelStory: {
    title: '',
    description: '',
    imageUrl: '',
    imageAlt: '',
    buttonText: '',
    buttonLink: '',
  },
  // H2 Hotel Sections
  amenitiesSection: {
    title: '',
    subtitle: '',
    items: ['wifi', 'pool', 'spa', 'restaurant', 'gym', 'parking'],
  },
  gallerySection: {
    title: '',
    subtitle: '',
    images: [],
  },
  whyBookDirect: {
    title: '',
    subtitle: '',
    benefits: [
      {
        icon: 'ShieldCheck',
        title: 'Best Price Guarantee',
        description: 'We match any price you find elsewhere.',
      },
      {
        icon: 'RefreshCw',
        title: 'Free Cancellation',
        description: 'Cancel up to 24h before check-in for free.',
      },
      {
        icon: 'Zap',
        title: 'Instant Confirmation',
        description: 'Your booking is confirmed immediately.',
      },
      {
        icon: 'Gift',
        title: 'Exclusive Perks',
        description: 'Complimentary upgrades & welcome gifts for direct guests.',
      },
    ],
  },
  locationSection: {
    title: '',
    subtitle: '',
    address: '',
    mapEmbedUrl: '',
    directionsUrl: '',
  },
  socialSection: {
    title: '',
    subtitle: '',
    handle: '',
    profileUrl: '',
    platform: 'Instagram',
    images: [],
  },
  // H3.7 Seasonal Packages
  seasonalPackagesSection: {
    title: '',
    subtitle: '',
    packages: [],
  },
  // H3.8 Nearby Attractions
  nearbyAttractionsSection: {
    title: '',
    subtitle: '',
    attractions: [],
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
    roomsSection: true,
    amenitiesSection: true,
    gallerySection: true,
    whyBookDirect: true,
    locationSection: true,
    socialSection: true,
    seasonalPackages: true,
    nearbyAttractions: true,
  },
};

const testimonialSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  role: z.string().min(1, 'Role is required'),
  avatar: z.string().url('Must be a valid URL').or(z.literal('')),
  content: z.string().min(10, 'Testimonial text is too short'),
});

const featureSchema = z.object({
  title: z.string().min(1, 'Feature title is required'),
  description: z.string().min(1, 'Feature description is required'),
});

const browseCategoryItemSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  type: z.string().min(1, 'Type is required'),
  icon: z.enum(browseCategoryIconKeys),
});

// Safe File check for SSR
const fileSchema =
  typeof window !== 'undefined' && typeof File !== 'undefined' ? z.instanceof(File) : z.any();

const formSchema = z.object({
  hero: z.object({
    title: z.string().min(1, 'Hero title is required'),
    subtitle: z.string().min(1, 'Hero subtitle is required'),
    image: z.array(fileSchema).optional(),
    imageAlt: z.string().optional(),
    searchType: z.enum(['tours', 'hotels']).optional().default('tours'),
    bookDirectBadge: z.string().optional(),
    videoUrl: z.string().optional(),
  }),
  whyChooseUs: z.object({
    pretitle: z.string().min(1, 'Pre-title is required'),
    title: z.string().min(1, 'Title is required'),
    image: z.array(fileSchema).optional(),
    imageAlt: z.string().optional(),
    badgeValue: z.string().optional(),
    badgeLabel: z.string().optional(),
    feature1: featureSchema,
    feature2: featureSchema,
    feature3: featureSchema,
  }),
  browseCategory: z.object({
    title: z.string().min(1, 'Title is required'),
    subtitle: z.string().min(1, 'Subtitle is required'),
    categories: z.array(browseCategoryItemSchema).optional(),
  }),
  popularDestinations: z.object({
    pretitle: z.string().optional(),
    title: z.string().optional(),
    count: z.coerce.number().min(3).max(12).optional(),
  }),
  discountBanners: z.object({
    banner1: z.object({
      title: z.string().min(1, 'Title is required'),
      description: z.string().min(1, 'Description is required'),
      image: z.array(fileSchema).optional(),
      buttonText: z.string().optional(),
      buttonLink: z.string().optional(),
    }),
    banner2: z.object({
      title: z.string().min(1, 'Title is required'),
      description: z.string().min(1, 'Description is required'),
      image: z.array(fileSchema).optional(),
      buttonText: z.string().optional(),
      buttonLink: z.string().optional(),
    }),
  }),
  lastMinuteOffers: z.object({
    discount: z.string().min(1, 'Discount is required'),
    pretitle: z.string().min(1, 'Pre-title is required'),
    title: z.string().min(1, 'Title is required'),
    count: z.coerce.number().min(2).max(10).optional(),
  }),
  testimonials: z.array(testimonialSchema),
  testimonialCount: z.coerce.number().min(1).max(20).optional(),
  videoSection: z.object({
    pretitle: z.string().min(1, 'Pre-title is required'),
    title: z.string().min(1, 'Title is required'),
    backgroundImage: z.array(fileSchema).optional(),
    button1Text: z.string().optional(),
    button1Link: z.string().optional(),
    button2Text: z.string().optional(),
    button2Link: z.string().optional(),
  }),
  newsSection: z.object({
    pretitle: z.string().min(1, 'Pre-title is required'),
    title: z.string().min(1, 'Title is required'),
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
    hotelFeatures: z.boolean().default(true).optional(),
    featuredRooms: z.boolean().default(true).optional(),
    hotelStory: z.boolean().default(true).optional(),
    roomsSection: z.boolean().default(true).optional(),
    amenitiesSection: z.boolean().default(true).optional(),
    gallerySection: z.boolean().default(true).optional(),
    whyBookDirect: z.boolean().default(true).optional(),
    locationSection: z.boolean().default(true).optional(),
    socialSection: z.boolean().default(true).optional(),
    seasonalPackages: z.boolean().default(true).optional(),
    nearbyAttractions: z.boolean().default(true).optional(),
  }),
});

export function HomePageEditorForm({ initialContent }: { initialContent: HomeContent | null }) {
  // Merge initial content with defaults
  const mergedValues = initialContent
    ? {
        ...defaultHomePageData,
        ...initialContent,
        hero: {
          ...defaultHomePageData.hero,
          ...initialContent.hero,
          image: undefined,
        },
        whyChooseUs: {
          ...defaultHomePageData.whyChooseUs,
          ...initialContent.whyChooseUs,
          image: undefined,
        },
        browseCategory: {
          ...defaultHomePageData.browseCategory,
          ...initialContent.browseCategory,
          categories:
            initialContent.browseCategory?.categories ||
            defaultHomePageData.browseCategory.categories,
        },
        popularDestinations: {
          ...defaultHomePageData.popularDestinations,
          ...initialContent.popularDestinations,
        },
        discountBanners: {
          banner1: {
            ...defaultHomePageData.discountBanners.banner1,
            ...initialContent.discountBanners?.banner1,
            image: undefined,
          },
          banner2: {
            ...defaultHomePageData.discountBanners.banner2,
            ...initialContent.discountBanners?.banner2,
            image: undefined,
          },
        },
        lastMinuteOffers: {
          ...defaultHomePageData.lastMinuteOffers,
          ...initialContent.lastMinuteOffers,
        },
        videoSection: {
          ...defaultHomePageData.videoSection,
          ...initialContent.videoSection,
          backgroundImage: undefined,
        },
        newsSection: {
          ...defaultHomePageData.newsSection,
          ...initialContent.newsSection,
        },
        roomsSection: {
          ...defaultHomePageData.roomsSection,
          ...initialContent.roomsSection,
        },
        hotelFeatures: {
          ...defaultHomePageData.hotelFeatures,
          ...initialContent.hotelFeatures,
        },
        featuredRooms: {
          ...defaultHomePageData.featuredRooms,
          ...initialContent.featuredRooms,
        },
        hotelStory: {
          ...defaultHomePageData.hotelStory,
          ...initialContent.hotelStory,
        },
        amenitiesSection: {
          ...defaultHomePageData.amenitiesSection,
          ...initialContent.amenitiesSection,
        },
        gallerySection: {
          ...defaultHomePageData.gallerySection,
          ...initialContent.gallerySection,
        },
        whyBookDirect: {
          ...defaultHomePageData.whyBookDirect,
          ...initialContent.whyBookDirect,
        },
        locationSection: {
          ...defaultHomePageData.locationSection,
          ...initialContent.locationSection,
        },
        socialSection: {
          ...defaultHomePageData.socialSection,
          ...initialContent.socialSection,
        },
        seasonalPackagesSection: {
          ...defaultHomePageData.seasonalPackagesSection,
          ...initialContent.seasonalPackagesSection,
        },
        nearbyAttractionsSection: {
          ...defaultHomePageData.nearbyAttractionsSection,
          ...initialContent.nearbyAttractionsSection,
        },
        visibility: {
          ...defaultHomePageData.visibility,
          ...initialContent.visibility,
        },
        testimonials: (initialContent.testimonials || defaultHomePageData.testimonials).map(
          (t) => ({
            name: t.name,
            role: t.role,
            avatar: t.avatar,
            content: t.content || t.text || '',
          })
        ),
        testimonialCount: initialContent.testimonialCount ?? defaultHomePageData.testimonialCount,
      }
    : defaultHomePageData;

  const [existingHeroUrls, setExistingHeroUrls] = useState<string[]>(() => {
    const hero = initialContent?.hero;
    const fromArray = Array.isArray(hero?.imageUrls)
      ? hero.imageUrls.filter(
          (value): value is string => typeof value === 'string' && value.trim().length > 0
        )
      : [];
    if (fromArray.length > 0) return fromArray;
    const single = typeof hero?.imageUrl === 'string' ? hero.imageUrl.trim() : '';
    return single ? [single] : [];
  });
  const [existingBanner1Url] = useState<string | null>(
    initialContent?.discountBanners?.banner1?.imageUrl || null
  );
  const [existingBanner2Url] = useState<string | null>(
    initialContent?.discountBanners?.banner2?.imageUrl || null
  );
  const [existingVideoBgUrl] = useState<string | null>(
    initialContent?.videoSection?.backgroundImageUrl || null
  );
  const [existingWhyChooseUsUrl] = useState<string | null>(
    initialContent?.whyChooseUs?.imageUrl || null
  );
  const [existingGalleryImages, setExistingGalleryImages] = useState<(File | string)[]>(
    initialContent?.gallerySection?.images || []
  );
  const [existingSocialImages, setExistingSocialImages] = useState<(File | string)[]>(
    initialContent?.socialSection?.images || []
  );
  const [activeTab, setActiveTab] = useState('visibility');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: mergedValues as any,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'testimonials',
  });

  const {
    fields: categoryFields,
    append: appendCategory,
    remove: removeCategory,
  } = useFieldArray({
    control: form.control,
    name: 'browseCategory.categories',
  });

  const {
    fields: packageFields,
    append: appendPackage,
    remove: removePackage,
  } = useFieldArray({
    control: form.control,
    name: 'seasonalPackagesSection.packages' as any,
  });

  const {
    fields: attractionFields,
    append: appendAttraction,
    remove: removeAttraction,
  } = useFieldArray({
    control: form.control,
    name: 'nearbyAttractionsSection.attractions' as any,
  });

  async function handleImageUpload(
    file: File | undefined | null,
    pathPrefix: string
  ): Promise<string | null> {
    if (!file || typeof File === 'undefined' || !(file instanceof File)) return null;
    const supabase = createClient();
    const ext = file.name.split('.').pop() || 'png';
    const path = `home/${pathPrefix}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('cms').upload(path, file, {
      contentType: file.type || 'image/png',
      upsert: true,
    });
    if (!uploadError) {
      const { data: publicUrlData } = supabase.storage.from('cms').getPublicUrl(path);
      return publicUrlData.publicUrl;
    }
    return null;
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    // Handle uploads
    const heroFiles = Array.isArray(values.hero?.image) ? values.hero.image : [];
    const whyChooseUsFile = values.whyChooseUs?.image && values.whyChooseUs.image[0];
    const banner1File =
      values.discountBanners?.banner1?.image && values.discountBanners.banner1.image[0];
    const banner2File =
      values.discountBanners?.banner2?.image && values.discountBanners.banner2.image[0];
    const videoBgFile =
      values.videoSection?.backgroundImage && values.videoSection.backgroundImage[0];

    const uploadedHeroUrls = (
      await Promise.all(
        heroFiles.map((file, idx) => handleImageUpload(file as any, `hero-${idx + 1}`))
      )
    ).filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
    const newWhyChooseUsUrl = await handleImageUpload(whyChooseUsFile, 'why-choose-us');
    const newBanner1Url = await handleImageUpload(banner1File, 'banner1');
    const newBanner2Url = await handleImageUpload(banner2File, 'banner2');
    const newVideoBgUrl = await handleImageUpload(videoBgFile, 'video-bg');

    // Gallery images — upload any File objects, keep existing URLs
    const galleryStringUrls = existingGalleryImages.filter(
      (f): f is string => typeof f === 'string'
    );
    const galleryFileObjects = existingGalleryImages.filter((f): f is File => f instanceof File);
    const uploadedGalleryUrls = (
      await Promise.all(galleryFileObjects.map((f, i) => handleImageUpload(f, `gallery-${i}`)))
    ).filter((u): u is string => typeof u === 'string' && u.trim().length > 0);
    const allGalleryUrls = [...galleryStringUrls, ...uploadedGalleryUrls];

    // Social images
    const socialStringUrls = existingSocialImages.filter((f): f is string => typeof f === 'string');
    const socialFileObjects = existingSocialImages.filter((f): f is File => f instanceof File);
    const uploadedSocialUrls = (
      await Promise.all(socialFileObjects.map((f, i) => handleImageUpload(f, `social-${i}`)))
    ).filter((u): u is string => typeof u === 'string' && u.trim().length > 0);
    const allSocialUrls = [...socialStringUrls, ...uploadedSocialUrls];

    const seenHeroUrls = new Set<string>();
    const nextHeroUrls = [...existingHeroUrls, ...uploadedHeroUrls].filter((url) => {
      const normalized = typeof url === 'string' ? url.trim() : '';
      if (!normalized) return false;
      if (seenHeroUrls.has(normalized)) return false;
      seenHeroUrls.add(normalized);
      return true;
    });

    const heroUrl = nextHeroUrls[0] || defaultHomePageData.hero.imageUrl;
    const whyChooseUsUrl =
      newWhyChooseUsUrl || existingWhyChooseUsUrl || defaultHomePageData.whyChooseUs.imageUrl;
    const banner1Url =
      newBanner1Url || existingBanner1Url || defaultHomePageData.discountBanners.banner1.imageUrl;
    const banner2Url =
      newBanner2Url || existingBanner2Url || defaultHomePageData.discountBanners.banner2.imageUrl;
    const videoBgUrl =
      newVideoBgUrl || existingVideoBgUrl || defaultHomePageData.videoSection.backgroundImageUrl;

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
        imageUrls: nextHeroUrls,
        imageAlt: values.hero.imageAlt,
        searchType: values.hero.searchType,
        bookDirectBadge: values.hero.bookDirectBadge || undefined,
        videoUrl: (values.hero as any).videoUrl || undefined,
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
      // Pass through hotel specific data
      roomsSection: (values as any).roomsSection,
      hotelFeatures: (values as any).hotelFeatures,
      featuredRooms: (values as any).featuredRooms,
      hotelStory: (values as any).hotelStory,
      amenitiesSection: (values as any).amenitiesSection,
      gallerySection: {
        ...((values as any).gallerySection || {}),
        images: allGalleryUrls,
      },
      whyBookDirect: (values as any).whyBookDirect,
      locationSection: (values as any).locationSection,
      socialSection: {
        ...((values as any).socialSection || {}),
        images: allSocialUrls,
      },
      seasonalPackagesSection: (values as any).seasonalPackagesSection,
      nearbyAttractionsSection: (values as any).nearbyAttractionsSection,
    };

    try {
      await updateHomePageContent(contentToSave as HomeContent);
      alert('Home page content updated successfully!');
    } catch (error) {
      console.error('Failed to save content:', error);
      alert('Failed to update content.');
    }
  }

  const renderFeatureFields = (
    featureName: 'feature1' | 'feature2' | 'feature3',
    label: string
  ) => (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{label}</CardTitle>
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
      <form
        onSubmit={form.handleSubmit(onSubmit, (errors) => {
          console.error('Form validation errors:', errors);
          alert('Please check the form for errors. Some required fields might be missing.');
        })}
        className="space-y-8 pb-20"
      >
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            orientation="vertical"
            className="w-full lg:w-auto flex-1 lg:flex-none lg:min-w-[250px]"
          >
            <TabsList className="flex flex-col h-auto w-full items-start justify-start gap-1 bg-muted/20 p-2 rounded-lg">
              <TabsTrigger value="visibility" className="w-full justify-start gap-2">
                <Eye className="h-4 w-4" /> Visibility
              </TabsTrigger>
              <TabsTrigger value="hero" className="w-full justify-start gap-2">
                <Layout className="h-4 w-4" /> Hero Section
              </TabsTrigger>
              <TabsTrigger value="categories" className="w-full justify-start gap-2">
                <Layout className="h-4 w-4" /> Categories
              </TabsTrigger>
              <TabsTrigger value="why-choose-us" className="w-full justify-start gap-2">
                <Layout className="h-4 w-4" /> Why Choose Us
              </TabsTrigger>
              <TabsTrigger value="popular" className="w-full justify-start gap-2">
                <MapPin className="h-4 w-4" /> Popular Destinations
              </TabsTrigger>
              <TabsTrigger value="banners" className="w-full justify-start gap-2">
                <ImageIcon className="h-4 w-4" /> Banners
              </TabsTrigger>
              <TabsTrigger value="offers" className="w-full justify-start gap-2">
                <Tag className="h-4 w-4" /> Last Minute Offers
              </TabsTrigger>
              <TabsTrigger value="video" className="w-full justify-start gap-2">
                <Video className="h-4 w-4" /> Video Section
              </TabsTrigger>
              <TabsTrigger value="news" className="w-full justify-start gap-2">
                <Newspaper className="h-4 w-4" /> News Section
              </TabsTrigger>
              <TabsTrigger value="testimonials" className="w-full justify-start gap-2">
                <MessageSquare className="h-4 w-4" /> Testimonials
              </TabsTrigger>
              <TabsTrigger value="rooms-section" className="w-full justify-start gap-2">
                <BedDouble className="h-4 w-4" /> Rooms Section
              </TabsTrigger>
              <TabsTrigger value="hotel-features" className="w-full justify-start gap-2">
                <Layout className="h-4 w-4" /> Hotel Features
              </TabsTrigger>
              <TabsTrigger value="hotel-story" className="w-full justify-start gap-2">
                <Layout className="h-4 w-4" /> Hotel Story
              </TabsTrigger>
              <TabsTrigger value="amenities" className="w-full justify-start gap-2">
                <Sparkles className="h-4 w-4" /> Amenities
              </TabsTrigger>
              <TabsTrigger value="gallery" className="w-full justify-start gap-2">
                <ImageIcon className="h-4 w-4" /> Photo Gallery
              </TabsTrigger>
              <TabsTrigger value="why-book-direct" className="w-full justify-start gap-2">
                <ShieldCheck className="h-4 w-4" /> Why Book Direct
              </TabsTrigger>
              <TabsTrigger value="location" className="w-full justify-start gap-2">
                <MapPin className="h-4 w-4" /> Location
              </TabsTrigger>
              <TabsTrigger value="social" className="w-full justify-start gap-2">
                <Sparkles className="h-4 w-4" /> Social Feed
              </TabsTrigger>
              <TabsTrigger value="seasonal-packages" className="w-full justify-start gap-2">
                <Package className="h-4 w-4" /> Seasonal Packages
              </TabsTrigger>
              <TabsTrigger value="nearby-attractions" className="w-full justify-start gap-2">
                <Landmark className="h-4 w-4" /> Nearby Attractions
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Content Area */}
          <div className="flex-1 min-w-0">
            <Tabs value={activeTab} className="w-full">
              {/* Visibility Tab */}
              <TabsContent value="visibility" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Section Visibility</CardTitle>
                    <CardDescription>
                      Toggle sections on or off to customize your home page layout.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.keys(defaultHomePageData.visibility).map((key) => {
                      // Skip hotel sections if not in single hotel mode - simplified check for now
                      if (
                        [
                          'hotelFeatures',
                          'featuredRooms',
                          'hotelStory',
                          'roomsSection',
                          'amenitiesSection',
                          'gallerySection',
                          'whyBookDirect',
                          'locationSection',
                          'socialSection',
                        ].includes(key)
                      ) {
                        return (
                          <FormField
                            key={key}
                            control={form.control}
                            name={`visibility.${key}` as any}
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/50">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base capitalize">
                                    {key.replace(/([A-Z])/g, ' $1').trim()} (Hotel Mode)
                                  </FormLabel>
                                </div>
                                <FormControl>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        );
                      }

                      return (
                        <FormField
                          key={key}
                          control={form.control}
                          name={`visibility.${key}` as any}
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base capitalize">
                                  {key.replace(/([A-Z])/g, ' $1').trim()}
                                </FormLabel>
                              </div>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      );
                    })}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Hero Tab */}
              <TabsContent value="hero" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Hero Section</CardTitle>
                    <CardDescription>Customize the main banner of your website.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-6">
                    {existingHeroUrls.length > 0 ? (
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {existingHeroUrls.map((url) => (
                          <div
                            key={url}
                            className="relative aspect-video overflow-hidden rounded-md border bg-muted"
                          >
                            <Image src={url} alt="Hero Preview" fill className="object-cover" />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute right-2 top-2 h-8 w-8"
                              onClick={() =>
                                setExistingHeroUrls((prev) => prev.filter((item) => item !== url))
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : defaultHomePageData.hero.imageUrl ? (
                      <div className="relative w-full aspect-video rounded-md overflow-hidden border bg-muted">
                        <Image
                          src={defaultHomePageData.hero.imageUrl}
                          alt="Hero Preview"
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : null}
                    <FormField
                      control={form.control}
                      name="hero.image"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hero Images</FormLabel>
                          <FormControl>
                            <ImageUploader value={field.value || []} onChange={field.onChange} />
                          </FormControl>
                          <FormDescription>
                            Upload multiple images for the auto slider.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="hero.searchType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Search Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select search type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="tours">Tours Search</SelectItem>
                              <SelectItem value="hotels">Hotels Search</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Choose which search bar to display in the hero section.
                          </FormDescription>
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
                      name={'hero.videoUrl' as any}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Background Video URL{' '}
                            <span className="text-muted-foreground font-normal">(optional)</span>
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="https://example.com/hero-video.mp4" />
                          </FormControl>
                          <FormDescription>
                            Direct link to an .mp4 file. When set, plays as a looping silent
                            background instead of the image slider. Host on Cloudinary, S3, or
                            similar.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="hero.imageAlt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Image Alt Text (SEO)</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={'hero.bookDirectBadge' as any}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>&quot;Book Direct&quot; Badge Text (Hotel Mode)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g. Book Direct & Save Up to 15%" />
                          </FormControl>
                          <FormDescription>
                            Shown below the search widget in hotel mode. Leave blank to hide.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Categories Tab */}
              <TabsContent value="categories" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Browse Categories</CardTitle>
                    <CardDescription>Manage the category shortcuts.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-4">
                      <FormField
                        control={form.control}
                        name="browseCategory.title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Section Title</FormLabel>
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
                            <FormLabel>Section Subtitle</FormLabel>
                            <FormControl>
                              <Textarea {...field} rows={2} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">Categories List</h4>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            appendCategory({
                              label: 'New Category',
                              type: 'adventure',
                              icon: 'mountain',
                            })
                          }
                        >
                          <PlusCircle className="mr-2 h-4 w-4" /> Add Category
                        </Button>
                      </div>
                      <div className="grid gap-4">
                        {categoryFields.map((field, index) => (
                          <div
                            key={field.id}
                            className="flex gap-4 items-start border p-4 rounded-lg bg-card"
                          >
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                              <FormField
                                control={form.control}
                                name={`browseCategory.categories.${index}.label`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs">Label</FormLabel>
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
                                    <FormLabel className="text-xs">Type Param</FormLabel>
                                    <FormControl>
                                      <Input {...field} placeholder="e.g. adventure" />
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
                                    <FormLabel className="text-xs">Icon</FormLabel>
                                    <Select
                                      onValueChange={field.onChange}
                                      defaultValue={field.value}
                                    >
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select icon" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {browseCategoryIconKeys.map((icon) => (
                                          <SelectItem
                                            key={icon}
                                            value={icon}
                                            className="capitalize"
                                          >
                                            {icon}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => removeCategory(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Rooms Section Tab */}
              <TabsContent value="rooms-section" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Rooms Section</CardTitle>
                    <CardDescription>
                      Configure the &quot;Our Rooms&quot; section on the home page.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-6">
                    <FormField
                      control={form.control}
                      name={'roomsSection.title' as any}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Section Title</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g. Our Rooms" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={'roomsSection.subtitle' as any}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Section Subtitle</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g. Accommodation" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={'roomsSection.count' as any}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rooms to Display</FormLabel>
                          <Select
                            onValueChange={(v) => field.onChange(v === '0' ? 0 : Number(v))}
                            value={String(field.value ?? 0)}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select count" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="0">All rooms</SelectItem>
                              <SelectItem value="3">3 rooms</SelectItem>
                              <SelectItem value="6">6 rooms</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Choose how many rooms to show. &quot;All rooms&quot; displays every
                            active room.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Hotel Features Tab */}
              <TabsContent value="hotel-features" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Hotel Features</CardTitle>
                    <CardDescription>Highlight your hotel amenities and services.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-6">
                    <FormField
                      control={form.control}
                      name={'hotelFeatures.title' as any}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Section Title</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g. World Class Amenities" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={'hotelFeatures.subtitle' as any}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Section Subtitle</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              rows={2}
                              placeholder="Brief description of your amenities"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">Features List</h4>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const currentFeatures =
                              form.getValues('hotelFeatures.features' as any) || [];
                            form.setValue(
                              'hotelFeatures.features' as any,
                              [
                                ...currentFeatures,
                                { title: 'New Feature', description: 'Description', icon: 'wifi' },
                              ] as any
                            );
                          }}
                        >
                          <PlusCircle className="mr-2 h-4 w-4" /> Add Feature
                        </Button>
                      </div>
                      <div className="grid gap-4">
                        {(form.watch('hotelFeatures.features' as any) || []).map(
                          (feature: any, index: number) => (
                            <div
                              key={index}
                              className="flex gap-4 items-start border p-4 rounded-lg bg-card relative group"
                            >
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                                <FormField
                                  control={form.control}
                                  name={`hotelFeatures.features.${index}.title` as any}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-xs">Title</FormLabel>
                                      <FormControl>
                                        <Input {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`hotelFeatures.features.${index}.description` as any}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-xs">Description</FormLabel>
                                      <FormControl>
                                        <Input {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`hotelFeatures.features.${index}.icon` as any}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-xs">Icon (Lucide Name)</FormLabel>
                                      <FormControl>
                                        <Input {...field} placeholder="e.g. wifi, coffee, pool" />
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
                                className="absolute top-2 right-2 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => {
                                  const currentFeatures =
                                    form.getValues('hotelFeatures.features' as any) || [];
                                  form.setValue(
                                    'hotelFeatures.features' as any,
                                    currentFeatures.filter(
                                      (_: any, i: number) => i !== index
                                    ) as any
                                  );
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Hotel Story Tab */}
              <TabsContent value="hotel-story" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Hotel Story</CardTitle>
                    <CardDescription>
                      Share your hotel&apos;s story or welcome message.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-6">
                    <FormField
                      control={form.control}
                      name={'hotelStory.title' as any}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g. A Sanctuary in the City" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={'hotelStory.description' as any}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={6} placeholder="Tell your story..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={'hotelStory.buttonText' as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Button Text</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g. Read More" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={'hotelStory.buttonLink' as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Button Link</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g. /about" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="space-y-2">
                      <FormLabel>Story Image</FormLabel>
                      <ImageUploader
                        value={
                          form.watch('hotelStory.imageUrl' as any)
                            ? [form.watch('hotelStory.imageUrl' as any) as string]
                            : []
                        }
                        onChange={(urls) =>
                          form.setValue('hotelStory.imageUrl' as any, urls[0] || '')
                        }
                        maxFiles={1}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ─── H2.4 Amenities Tab ─── */}
              <TabsContent value="amenities" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Amenities Showcase</CardTitle>
                    <CardDescription>
                      Select which hotel amenities to display on the home page.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={'amenitiesSection.title' as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Section Title</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g. Our Amenities" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={'amenitiesSection.subtitle' as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pre-title</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g. What We Offer" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Separator />
                    <div>
                      <FormLabel className="text-base mb-3 block">
                        Select Amenities to Display
                      </FormLabel>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {[
                          { id: 'wifi', label: 'Free WiFi' },
                          { id: 'pool', label: 'Swimming Pool' },
                          { id: 'spa', label: 'Spa & Wellness' },
                          { id: 'restaurant', label: 'Restaurant' },
                          { id: 'gym', label: 'Fitness Center' },
                          { id: 'parking', label: 'Free Parking' },
                          { id: 'bar', label: 'Bar & Lounge' },
                          { id: 'shuttle', label: 'Airport Shuttle' },
                          { id: 'roomService', label: 'Room Service' },
                          { id: 'pets', label: 'Pet Friendly' },
                          { id: 'kids', label: 'Kids Club' },
                          { id: 'meetings', label: 'Meeting Rooms' },
                          { id: 'ac', label: 'Air Conditioning' },
                          { id: 'beach', label: 'Beach Access' },
                          { id: 'laundry', label: 'Laundry' },
                          { id: 'concierge', label: 'Concierge' },
                        ].map((amenity) => {
                          const currentItems: string[] =
                            form.watch('amenitiesSection.items' as any) || [];
                          const isActive = currentItems.includes(amenity.id);
                          return (
                            <div
                              key={amenity.id}
                              className={`flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-colors ${isActive ? 'bg-primary/5 border-primary/40' : 'hover:bg-muted/50'}`}
                              onClick={() => {
                                const next = isActive
                                  ? currentItems.filter((i) => i !== amenity.id)
                                  : [...currentItems, amenity.id];
                                form.setValue('amenitiesSection.items' as any, next);
                              }}
                            >
                              <span className="text-sm font-medium">{amenity.label}</span>
                              <Switch checked={isActive} onCheckedChange={() => {}} tabIndex={-1} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ─── H2.5 Gallery Tab ─── */}
              <TabsContent value="gallery" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Photo Gallery</CardTitle>
                    <CardDescription>
                      Upload hotel photos for the home page gallery with lightbox.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={'gallerySection.title' as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Section Title</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g. Our Hotel in Photos" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={'gallerySection.subtitle' as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pre-title</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g. Gallery" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <FormLabel>Gallery Photos</FormLabel>
                      <ImageUploader
                        value={existingGalleryImages}
                        onChange={(files) => setExistingGalleryImages(files)}
                        maxFiles={20}
                      />
                      <p className="text-xs text-muted-foreground">
                        Upload up to 20 photos. Guests can click to enlarge.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ─── H2.6 Why Book Direct Tab ─── */}
              <TabsContent value="why-book-direct" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Why Book Direct</CardTitle>
                    <CardDescription>
                      4 benefit cards that persuade guests to book directly.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={'whyBookDirect.title' as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Section Title</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g. Why Book Direct?" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={'whyBookDirect.subtitle' as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pre-title</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g. Direct Booking Benefits" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Separator />
                    {[0, 1, 2, 3].map((idx) => (
                      <Card key={idx} className="bg-muted/30">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Benefit {idx + 1}</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-3">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <FormField
                              control={form.control}
                              name={`whyBookDirect.benefits.${idx}.icon` as any}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Icon</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="ShieldCheck" />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <div className="md:col-span-2">
                              <FormField
                                control={form.control}
                                name={`whyBookDirect.benefits.${idx}.title` as any}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs">Title</FormLabel>
                                    <FormControl>
                                      <Input {...field} placeholder="e.g. Best Price Guarantee" />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                          <FormField
                            control={form.control}
                            name={`whyBookDirect.benefits.${idx}.description` as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Description</FormLabel>
                                <FormControl>
                                  <Textarea
                                    {...field}
                                    rows={2}
                                    placeholder="Short benefit description..."
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ─── H2.7 Location Tab ─── */}
              <TabsContent value="location" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Location & Map</CardTitle>
                    <CardDescription>
                      Show the hotel location with an embedded map on the home page.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={'locationSection.title' as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Section Title</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g. Find Us" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={'locationSection.subtitle' as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pre-title</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g. Our Location" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name={'locationSection.address' as any}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              rows={2}
                              placeholder="123 Beach Road, Sharm El-Sheikh, Egypt"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={'locationSection.mapEmbedUrl' as any}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Google Maps Embed URL</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="https://www.google.com/maps/embed?pb=..."
                            />
                          </FormControl>
                          <FormDescription>
                            In Google Maps: Share → Embed a map → copy the <code>src</code> URL from
                            the &lt;iframe&gt;.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={'locationSection.directionsUrl' as any}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>&quot;Get Directions&quot; Link</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="https://maps.google.com/?q=..." />
                          </FormControl>
                          <FormDescription>
                            Regular Google Maps link for the &quot;Get Directions&quot; button.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ─── H2.8 Social Feed Tab ─── */}
              <TabsContent value="social" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Social Media Feed</CardTitle>
                    <CardDescription>
                      A &quot;Follow Us&quot; photo grid with your social handle and link.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={'socialSection.title' as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Section Title</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g. Follow Our Journey" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={'socialSection.subtitle' as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pre-title</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g. Instagram" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name={'socialSection.platform' as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Platform</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Instagram" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={'socialSection.handle' as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Handle</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="@myhotel" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={'socialSection.profileUrl' as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Profile Link</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="https://instagram.com/myhotel" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <FormLabel>Feed Photos</FormLabel>
                      <ImageUploader
                        value={existingSocialImages}
                        onChange={(files) => setExistingSocialImages(files)}
                        maxFiles={9}
                      />
                      <p className="text-xs text-muted-foreground">
                        Upload up to 9 square photos to simulate an Instagram feed grid.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ─── H3.7 Seasonal Packages Tab ─── */}
              <TabsContent value="seasonal-packages" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Seasonal Packages</CardTitle>
                    <CardDescription>
                      Time-limited hotel packages with countdown timers. Shown on the home page as
                      prominent booking cards.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={'seasonalPackagesSection.title' as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Section Title</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g. Seasonal Packages" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={'seasonalPackagesSection.subtitle' as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pre-title</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g. Special Offers" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Separator />
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">Packages List</h4>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            appendPackage({
                              id: Date.now().toString(),
                              title: 'New Package',
                              description: '',
                              price: 0,
                              nights: 3,
                              expiresAt: '',
                              imageUrl: '',
                              buttonText: 'Book Now',
                              buttonLink: '',
                              includes: '',
                            } as any)
                          }
                        >
                          <PlusCircle className="mr-2 h-4 w-4" /> Add Package
                        </Button>
                      </div>
                      <div className="grid gap-4">
                        {packageFields.map((field, index) => (
                          <Card key={field.id} className="bg-muted/30">
                            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                              <CardTitle className="text-sm">Package {index + 1}</CardTitle>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => removePackage(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </CardHeader>
                            <CardContent className="grid gap-3">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <FormField
                                  control={form.control}
                                  name={`seasonalPackagesSection.packages.${index}.title` as any}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-xs">Package Name</FormLabel>
                                      <FormControl>
                                        <Input {...field} placeholder="e.g. Summer Escape" />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`seasonalPackagesSection.packages.${index}.price` as any}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-xs">Price</FormLabel>
                                      <FormControl>
                                        <Input type="number" {...field} placeholder="299" />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <FormField
                                control={form.control}
                                name={
                                  `seasonalPackagesSection.packages.${index}.description` as any
                                }
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs">Description</FormLabel>
                                    <FormControl>
                                      <Textarea
                                        {...field}
                                        rows={2}
                                        placeholder="A short pitch for this package..."
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <FormField
                                  control={form.control}
                                  name={`seasonalPackagesSection.packages.${index}.nights` as any}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-xs">Nights</FormLabel>
                                      <FormControl>
                                        <Input type="number" {...field} placeholder="3" />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                                <div className="md:col-span-2">
                                  <FormField
                                    control={form.control}
                                    name={
                                      `seasonalPackagesSection.packages.${index}.expiresAt` as any
                                    }
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-xs">
                                          Offer Expires (date)
                                        </FormLabel>
                                        <FormControl>
                                          <DatePicker
                                            value={field.value}
                                            onChange={field.onChange}
                                            placeholder="No expiry"
                                            disablePast
                                          />
                                        </FormControl>
                                        <FormDescription className="text-[11px]">
                                          Leave blank to hide the countdown timer.
                                        </FormDescription>
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              </div>
                              <FormField
                                control={form.control}
                                name={`seasonalPackagesSection.packages.${index}.includes` as any}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs">
                                      What&apos;s Included (comma-separated)
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        {...field}
                                        placeholder="3 Nights, Breakfast, Airport Transfer, Spa Session"
                                      />
                                    </FormControl>
                                    <FormDescription className="text-[11px]">
                                      Each item separated by a comma will appear as a badge chip.
                                    </FormDescription>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`seasonalPackagesSection.packages.${index}.imageUrl` as any}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs">Image URL</FormLabel>
                                    <FormControl>
                                      <Input {...field} placeholder="https://..." />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <FormField
                                  control={form.control}
                                  name={
                                    `seasonalPackagesSection.packages.${index}.buttonText` as any
                                  }
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-xs">Button Text</FormLabel>
                                      <FormControl>
                                        <Input {...field} placeholder="Book Package" />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={
                                    `seasonalPackagesSection.packages.${index}.buttonLink` as any
                                  }
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-xs">Button Link</FormLabel>
                                      <FormControl>
                                        <Input {...field} placeholder="/checkout?room=deluxe" />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ─── H3.8 Nearby Attractions Tab ─── */}
              <TabsContent value="nearby-attractions" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Nearby Attractions</CardTitle>
                    <CardDescription>
                      List landmarks and distances so guests can research the location before
                      booking.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={'nearbyAttractionsSection.title' as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Section Title</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g. Nearby Attractions" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={'nearbyAttractionsSection.subtitle' as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pre-title</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g. Explore Nearby" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Separator />
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">Attractions List</h4>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            appendAttraction({ name: '', distance: '', category: '' } as any)
                          }
                        >
                          <PlusCircle className="mr-2 h-4 w-4" /> Add Attraction
                        </Button>
                      </div>
                      <div className="grid gap-3">
                        {attractionFields.map((field, index) => (
                          <div
                            key={field.id}
                            className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30"
                          >
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1">
                              <div className="md:col-span-2">
                                <FormField
                                  control={form.control}
                                  name={`nearbyAttractionsSection.attractions.${index}.name` as any}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-xs">Attraction Name</FormLabel>
                                      <FormControl>
                                        <Input {...field} placeholder="e.g. Pyramids of Giza" />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <FormField
                                control={form.control}
                                name={
                                  `nearbyAttractionsSection.attractions.${index}.distance` as any
                                }
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs">Distance</FormLabel>
                                    <FormControl>
                                      <Input {...field} placeholder="e.g. 12 km" />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 mt-5 text-destructive hover:text-destructive shrink-0"
                              onClick={() => removeAttraction(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        {attractionFields.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-6">
                            No attractions added yet. Click &quot;Add Attraction&quot; to start.
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ─── H2.8 Social Feed Tab ─── */}
              <TabsContent value="why-choose-us" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Why Choose Us</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-4">
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
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="whyChooseUs.image"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Section Image</FormLabel>
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
                        {(existingWhyChooseUsUrl || defaultHomePageData.whyChooseUs.imageUrl) && (
                          <div className="relative w-full h-40 rounded-md overflow-hidden border bg-muted">
                            <Image
                              src={
                                existingWhyChooseUsUrl || defaultHomePageData.whyChooseUs.imageUrl
                              }
                              alt="Why choose us preview"
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}
                      </div>
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="whyChooseUs.imageAlt"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Image Alt Text</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-4">
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
                                  <Input {...field} placeholder="Years Exp." />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4">
                      {renderFeatureFields('feature1', 'Feature 1')}
                      {renderFeatureFields('feature2', 'Feature 2')}
                      {renderFeatureFields('feature3', 'Feature 3')}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Popular Destinations Tab */}
              <TabsContent value="popular" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Popular Destinations</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4">
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
                            <Input {...field} />
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
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormDescription>Min 3, Max 12</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Discount Banners Tab */}
              <TabsContent value="banners" className="mt-0">
                <div className="grid gap-6">
                  {['banner1', 'banner2'].map((bannerKey, idx) => {
                    // @ts-expect-error - iterating over keys
                    const banner = form.watch(`discountBanners.${bannerKey}`);
                    const existingUrl =
                      bannerKey === 'banner1' ? existingBanner1Url : existingBanner2Url;

                    return (
                      <Card key={bannerKey}>
                        <CardHeader>
                          <CardTitle>Banner {idx + 1}</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                          <FormField
                            control={form.control}
                            name={`discountBanners.${bannerKey}.title` as any}
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
                            name={`discountBanners.${bannerKey}.description` as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Description</FormLabel>
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
                              name={`discountBanners.${bannerKey}.buttonText` as any}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Button Text</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`discountBanners.${bannerKey}.buttonLink` as any}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Button Link</FormLabel>
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
                            name={`discountBanners.${bannerKey}.image` as any}
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
                          {(existingUrl || (banner as any)?.imageUrl) && (
                            <div className="relative w-full h-32 rounded-md overflow-hidden border bg-muted">
                              <Image
                                src={existingUrl || (banner as any)?.imageUrl}
                                alt={`Banner ${idx + 1} preview`}
                                fill
                                className="object-cover"
                              />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>

              {/* Last Minute Offers Tab */}
              <TabsContent value="offers" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Last Minute Offers</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <FormField
                      control={form.control}
                      name="lastMinuteOffers.discount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Discount Badge (e.g. 20% OFF)</FormLabel>
                          <FormControl>
                            <Input {...field} />
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
                          <FormLabel>Number of Tours</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Video Section Tab */}
              <TabsContent value="video" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Video Section</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-6">
                    <div className="grid gap-4">
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
                    </div>

                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="videoSection.backgroundImage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Background Image</FormLabel>
                            <FormControl>
                              <ImageUploader value={field.value || []} onChange={field.onChange} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {(existingVideoBgUrl ||
                        defaultHomePageData.videoSection.backgroundImageUrl) && (
                        <div className="relative w-full h-40 rounded-md overflow-hidden border bg-muted">
                          <Image
                            src={
                              existingVideoBgUrl ||
                              defaultHomePageData.videoSection.backgroundImageUrl
                            }
                            alt="Video background preview"
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4 border p-4 rounded-md">
                        <h4 className="font-medium text-sm">Button 1</h4>
                        <FormField
                          control={form.control}
                          name="videoSection.button1Text"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Text</FormLabel>
                              <FormControl>
                                <Input {...field} />
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
                              <FormLabel>Link</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="space-y-4 border p-4 rounded-md">
                        <h4 className="font-medium text-sm">Button 2</h4>
                        <FormField
                          control={form.control}
                          name="videoSection.button2Text"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Text</FormLabel>
                              <FormControl>
                                <Input {...field} />
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
                              <FormLabel>Link</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* News Section Tab */}
              <TabsContent value="news" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>News Section</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4">
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
                            <Input {...field} />
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
                          <FormLabel>Number of Posts</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Testimonials Tab */}
              <TabsContent value="testimonials" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Testimonials</CardTitle>
                    <CardDescription>Add customer reviews to build trust.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="testimonialCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Count to Show</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">Reviews List</h4>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            append({
                              name: 'Happy Customer',
                              role: 'Traveler',
                              avatar: '',
                              content: 'Great experience!',
                            })
                          }
                        >
                          <PlusCircle className="mr-2 h-4 w-4" /> Add Review
                        </Button>
                      </div>

                      <div className="grid gap-4">
                        {fields.map((field, index) => (
                          <div
                            key={field.id}
                            className="flex gap-4 items-start border p-4 rounded-lg bg-card relative"
                          >
                            <div className="grid gap-4 flex-1">
                              <div className="grid md:grid-cols-2 gap-4">
                                <FormField
                                  control={form.control}
                                  name={`testimonials.${index}.name`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-xs">Name</FormLabel>
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
                                      <FormLabel className="text-xs">Role</FormLabel>
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
                                name={`testimonials.${index}.content`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs">Content</FormLabel>
                                    <FormControl>
                                      <Textarea {...field} rows={2} />
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
                              className="text-destructive absolute top-2 right-2"
                              onClick={() => remove(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Sticky Footer for Save Action */}
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 z-50 flex justify-end md:pl-64">
          <div className="container max-w-6xl flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => form.reset()}>
              Discard Changes
            </Button>
            <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
