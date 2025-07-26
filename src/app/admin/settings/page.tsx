
"use client"

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUploader } from "@/components/admin/image-uploader";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  agencyName: z.string().min(1, "Agency name is required."),
  phoneNumber: z.string().min(10, "A valid phone number is required."),
  contactEmail: z.string().email("Invalid email address."),
  address: z.string().min(1, "Address is required."),
  logo: z.array(z.any()).optional(),
  aboutUs: z.string().min(10, "About us description should be at least 10 characters."),
  socialMedia: z.object({
    facebook: z.string().url().or(z.literal("")),
    twitter: z.string().url().or(z.literal("")),
    instagram: z.string().url().or(z.literal("")),
    linkedin: z.string().url().or(z.literal("")),
  }),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
  confirmPassword: z.string().optional(),
}).refine(data => {
    if (data.newPassword && !data.currentPassword) {
        return false;
    }
    return true;
}, {
    message: "Current password is required to set a new one.",
    path: ["currentPassword"],
})
.refine(data => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match.",
    path: ["confirmPassword"],
});


export default function SettingsPage() {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            agencyName: "Wanderlust Hub",
            phoneNumber: "+1 (234) 567-890",
            contactEmail: "contact@wanderlusthub.com",
            address: "123 Adventure Lane, Travel City, 98765",
            logo: [],
            aboutUs: "Wanderlust Hub is your premier partner for unforgettable journeys in Egypt. We are dedicated to providing curated travel experiences that blend adventure, culture, and relaxation.",
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

    function onSubmit(values: z.infer<typeof formSchema>) {
        console.log("Settings Saved:", values);
        alert("Settings saved! Check the console for the form data.");
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
                        <CardDescription>Update your tour agency's public information.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <FormField control={form.control} name="agencyName" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Tour Agency Name</FormLabel>
                                <FormControl><Input placeholder="Your Agency Name" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                         <div className="grid md:grid-cols-2 gap-6">
                             <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Phone Number</FormLabel>
                                    <FormControl><Input placeholder="+1 234 567 890" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <FormField control={form.control} name="contactEmail" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Contact Email</FormLabel>
                                    <FormControl><Input type="email" placeholder="contact@you.com" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
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
                                    <FormDescription>Upload your company logo. PNG or JPG recommended.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle>About & Address</CardTitle>
                        <CardDescription>Information that may appear on your website's footer or contact page.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <FormField control={form.control} name="address" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Agency Address</FormLabel>
                                <FormControl><Input placeholder="123 Main St, Anytown, USA" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="aboutUs" render={({ field }) => (
                            <FormItem>
                                <FormLabel>About Us</FormLabel>
                                <FormControl><Textarea placeholder="Tell us a little about your agency" {...field} rows={4} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Social Media</CardTitle>
                        <CardDescription>Links to your agency's social media profiles.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-6">
                         <FormField control={form.control} name="socialMedia.facebook" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Facebook</FormLabel>
                                <FormControl><Input placeholder="https://facebook.com/your-page" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                         <FormField control={form.control} name="socialMedia.twitter" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Twitter / X</FormLabel>
                                <FormControl><Input placeholder="https://twitter.com/your-handle" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                         <FormField control={form.control} name="socialMedia.instagram" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Instagram</FormLabel>
                                <FormControl><Input placeholder="https://instagram.com/your-profile" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                         <FormField control={form.control} name="socialMedia.linkedin" render={({ field }) => (
                            <FormItem>
                                <FormLabel>LinkedIn</FormLabel>
                                <FormControl><Input placeholder="https://linkedin.com/company/your-company" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </CardContent>
                </Card>


                 <Card>
                    <CardHeader>
                        <CardTitle>Security</CardTitle>
                        <CardDescription>Change your account password.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <FormField control={form.control} name="currentPassword" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Current Password</FormLabel>
                                <FormControl><Input type="password" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                         <div className="grid md:grid-cols-2 gap-6">
                             <FormField control={form.control} name="newPassword" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>New Password</FormLabel>
                                    <FormControl><Input type="password" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Confirm New Password</FormLabel>
                                    <FormControl><Input type="password" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                    </CardContent>
                </Card>

                 <div className="flex justify-end">
                    <Button type="submit" size="lg">Save Changes</Button>
                </div>
            </div>
        </form>
    </Form>
  );
}
