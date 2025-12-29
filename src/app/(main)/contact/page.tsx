import { redirect } from "next/navigation";
import { createContactMessage } from "@/lib/supabase/contact-messages";
import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Mail, MapPin, Phone } from "lucide-react";

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolved = await searchParams;
  const sent = resolved.sent === "1";
  const sentError = resolved.sent === "0";

  let agencyName = "Wanderlust Hub";
  let phoneNumber = "+20 000 000 000";
  let contactEmail = "info@wanderlusthub.com";
  let address = "Cairo, Egypt";

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("settings")
      .select("data")
      .eq("id", 1)
      .maybeSingle();

    if (!error && data) {
      const settingsData = (
        data as unknown as
          | {
              data?: {
                agencyName?: string;
                phoneNumber?: string;
                contactEmail?: string;
                address?: string;
              };
            }
          | null
      )?.data;

      agencyName = settingsData?.agencyName || agencyName;
      phoneNumber = settingsData?.phoneNumber || phoneNumber;
      contactEmail = settingsData?.contactEmail || contactEmail;
      address = settingsData?.address || address;
    }
  } catch {
  }

  async function submit(formData: FormData) {
    "use server";
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    const subject = String(formData.get("subject") || "").trim();
    const message = String(formData.get("message") || "").trim();

    if (!name || !email || !message) {
      redirect("/contact?sent=0");
    }

    await createContactMessage({
      name,
      email,
      phone: phone || null,
      subject: subject || null,
      message,
    });

    redirect("/contact?sent=1");
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10">
      <section className="relative overflow-hidden rounded-3xl border bg-card">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=2400&q=70"
            alt=""
            fill
            priority
            className="object-cover opacity-25"
            sizes="(max-width: 768px) 100vw, 1200px"
          />
        </div>
        <div className="relative p-6 md:p-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3">
              <Badge variant="secondary" className="w-fit">
                Contact
              </Badge>
              <h1 className="font-headline text-4xl font-bold tracking-tight text-foreground md:text-5xl">
                Talk to {agencyName}
              </h1>
              <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
                Send a message and we’ll get back to you as soon as possible.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/tours">Explore Tours</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/services">View Services</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-2">
          <Card className="rounded-3xl">
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Contact details
                </p>
                <p className="text-xl font-semibold tracking-tight">
                  Quick ways to reach us
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-2xl border bg-background/60 p-4">
                  <Mail className="mt-0.5 h-5 w-5 text-primary" />
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">Email</p>
                    <a
                      className="text-sm text-muted-foreground hover:text-primary"
                      href={`mailto:${contactEmail}`}
                    >
                      {contactEmail}
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border bg-background/60 p-4">
                  <Phone className="mt-0.5 h-5 w-5 text-primary" />
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">Phone</p>
                    <a
                      className="text-sm text-muted-foreground hover:text-primary"
                      href={`tel:${phoneNumber.replace(/\s+/g, "")}`}
                    >
                      {phoneNumber}
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border bg-background/60 p-4">
                  <MapPin className="mt-0.5 h-5 w-5 text-primary" />
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">Address</p>
                    <p className="text-sm text-muted-foreground">{address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border bg-background/60 p-4">
                  <Clock className="mt-0.5 h-5 w-5 text-primary" />
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">Hours</p>
                    <p className="text-sm text-muted-foreground">
                      Daily, 9:00 AM – 9:00 PM
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-3xl">
            <div className="relative h-56 w-full">
              <Image
                src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=2400&q=70"
                alt="Travel planning"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 480px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <p className="text-sm font-medium text-white/80">
                  Typical response time
                </p>
                <p className="text-lg font-semibold text-white">
                  Within 24 hours
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Card className="rounded-3xl">
            <CardContent className="space-y-6">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Send a message
                </p>
                <p className="text-2xl font-semibold tracking-tight">
                  How can we help?
                </p>
                <p className="text-sm text-muted-foreground">
                  Share dates, group size, and destinations for a faster reply.
                </p>
              </div>

              {sent && (
                <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-green-900">
                  Message sent successfully.
                </div>
              )}
              {sentError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-900">
                  Please fill in your name, email, and message.
                </div>
              )}

              <form action={submit} className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="contact-name">
                      Name
                    </label>
                    <Input
                      id="contact-name"
                      name="name"
                      placeholder="Your name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="contact-email">
                      Email
                    </label>
                    <Input
                      id="contact-email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="contact-phone">
                      Phone (optional)
                    </label>
                    <Input id="contact-phone" name="phone" placeholder="+20..." />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="contact-subject">
                      Subject (optional)
                    </label>
                    <Input
                      id="contact-subject"
                      name="subject"
                      placeholder="Booking, custom itinerary, pricing..."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="contact-message">
                    Message
                  </label>
                  <Textarea
                    id="contact-message"
                    name="message"
                    placeholder="Tell us where you want to go, dates, and number of travelers..."
                    rows={7}
                    required
                  />
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-muted-foreground">
                    By sending this form, you agree to be contacted about your request.
                  </p>
                  <Button type="submit" className="w-full sm:w-auto">
                    Send Message
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
