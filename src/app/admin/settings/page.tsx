"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { ImageUploader } from "@/components/admin/image-uploader";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const formSchema = z
  .object({
    agencyName: z.string().min(1, "Agency name is required."),
    phoneNumber: z.string().min(10, "A valid phone number is required."),
    contactEmail: z.string().email("Invalid email address."),
    address: z.string().min(1, "Address is required."),
    logo: z.array(z.any()).optional(),
    tagline: z.string().optional(),
    navLinks: z
      .array(
        z.object({
          label: z.string().min(1, "Label is required"),
          href: z.string().min(1, "Href is required"),
        }),
      )
      .optional(),
    aboutUs: z
      .string()
      .min(10, "About us description should be at least 10 characters."),
    socialMedia: z.object({
      facebook: z.string().url().or(z.literal("")),
      twitter: z.string().url().or(z.literal("")),
      instagram: z.string().url().or(z.literal("")),
      linkedin: z.string().url().or(z.literal("")),
    }),
    currentPassword: z.string().optional(),
    newPassword: z.string().optional(),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.newPassword && !data.currentPassword) {
        return false;
      }
      return true;
    },
    {
      message: "Current password is required to set a new one.",
      path: ["currentPassword"],
    },
  )
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match.",
    path: ["confirmPassword"],
  });

export default function SettingsPage() {
  const [existingLogoUrl, setExistingLogoUrl] = useState<string | null>(null);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      agencyName: "Wanderlust Hub",
      phoneNumber: "+1 (234) 567-890",
      contactEmail: "contact@wanderlusthub.com",
      address: "123 Adventure Lane, Travel City, 98765",
      logo: [],
      tagline: "Explore The World",
      navLinks: [
        { label: "Home", href: "/" },
        { label: "About Us", href: "/#about" },
        { label: "Destination", href: "/#tours" },
        { label: "Tour", href: "/#tours" },
        { label: "Services", href: "/#services" },
        { label: "Blog", href: "/blog" },
        { label: "Contact", href: "/#contact" },
      ],
      aboutUs:
        "Wanderlust Hub is your premier partner for unforgettable journeys in Egypt. We are dedicated to providing curated travel experiences that blend adventure, culture, and relaxation.",
      socialMedia: {
        facebook: "https://facebook.com",
        twitter: "https://twitter.com",
        instagram: "https://instagram.com",
        linkedin: "https://linkedin.com",
      },
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const { fields: navLinkFields, append, remove } = useFieldArray({
    control: form.control,
    name: "navLinks",
  });

  useEffect(() => {
    async function loadSettings() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("settings")
        .select("data, logo_url")
        .eq("id", 1)
        .maybeSingle();
      if (!error && data) {
        const settingsData = (data as any).data ?? {};
        setExistingLogoUrl((data as any).logo_url ?? null);
        form.reset({
          agencyName: settingsData.agencyName ?? "",
          phoneNumber: settingsData.phoneNumber ?? "",
          contactEmail: settingsData.contactEmail ?? "",
          address: settingsData.address ?? "",
          logo: [],
          tagline: settingsData.tagline ?? "Explore The World",
          navLinks: settingsData.navLinks ?? [
            { label: "Home", href: "/" },
            { label: "About Us", href: "/#about" },
            { label: "Destination", href: "/#tours" },
            { label: "Tour", href: "/#tours" },
            { label: "Services", href: "/#services" },
            { label: "Blog", href: "/blog" },
            { label: "Contact", href: "/#contact" },
          ],
          aboutUs: settingsData.aboutUs ?? "",
          socialMedia: settingsData.socialMedia ?? {
            facebook: "",
            twitter: "",
            instagram: "",
            linkedin: "",
          },
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      }
    }
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const supabase = createClient();

    // Handle logo upload if provided
    let logoUrl: string | null = existingLogoUrl;
    try {
      const logoFile = values.logo && values.logo[0];
      if (logoFile && logoFile instanceof File) {
        const ext = logoFile.name.split(".").pop() || "png";
        const path = `logos/agency-logo-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("cms")
          .upload(path, logoFile, {
            contentType: logoFile.type || "image/png",
            upsert: true,
          });
        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from("cms")
            .getPublicUrl(path);
          logoUrl = publicUrlData.publicUrl;
        }
      }
    } catch (_) {
      // ignore upload failure
    }

    const payload = {
      id: 1,
      data: {
        agencyName: values.agencyName,
        phoneNumber: values.phoneNumber,
        contactEmail: values.contactEmail,
        address: values.address,
        tagline: values.tagline ?? "",
        navLinks: values.navLinks ?? [],
        aboutUs: values.aboutUs,
        socialMedia: values.socialMedia,
      },
      logo_url: logoUrl,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("settings").upsert(payload, {
      onConflict: "id",
    });
    if (error) {
      alert(`Failed to save settings: ${error.message}`);
      return;
    }
    alert("Settings saved!");
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
            <p className="text-muted-foreground">
              Manage your site settings, branding, and security.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Update your tour agency's public information.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="agencyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tour Agency Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Agency Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 234 567 890" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="contact@you.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="tagline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tagline</FormLabel>
                    <FormControl>
                      <Input placeholder="Explore The World" {...field} />
                    </FormControl>
                    <FormDescription>
                      Short phrase under the logo in the header/footer.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="logo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agency Logo</FormLabel>
                    <FormControl>
                      <ImageUploader
                        value={field.value || []}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription>
                      Upload your company logo. PNG or JPG recommended.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Navigation</CardTitle>
              <CardDescription>
                Configure the primary navigation links shown in the header and footer.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {navLinkFields && navLinkFields.length > 0 ? (
                navLinkFields.map((field, index) => (
                  <div key={field.id} className="grid md:grid-cols-3 gap-4 items-end">
                    <FormField
                      control={form.control}
                      name={`navLinks.${index}.label` as const}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel>Label</FormLabel>
                          <FormControl>
                            <Input placeholder="Home" {...f} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`navLinks.${index}.href` as const}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel>Href</FormLabel>
                          <FormControl>
                            <Input placeholder="/" {...f} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="button" variant="destructive" onClick={() => remove(index)}>
                      Remove
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No links. Add some below.</p>
              )}
            </CardContent>
            <CardFooter>
              <Button type="button" onClick={() => append({ label: "New Link", href: "/" })}>
                Add Link
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>About & Address</CardTitle>
              <CardDescription>
                Information that may appear on your website's footer or contact
                page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agency Address</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="123 Main St, Anytown, USA"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="aboutUs"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>About Us</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell us a little about your agency"
                        {...field}
                        rows={4}
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
              <CardTitle>Social Media</CardTitle>
              <CardDescription>
                Links to your agency's social media profiles.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="socialMedia.facebook"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Facebook</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://facebook.com/your-page"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="socialMedia.twitter"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Twitter / X</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://twitter.com/your-handle"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="socialMedia.instagram"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instagram</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://instagram.com/your-profile"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="socialMedia.linkedin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>LinkedIn</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://linkedin.com/company/your-company"
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
              <CardTitle>Security</CardTitle>
              <CardDescription>Change your account password.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" size="lg">
              Save Changes
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
