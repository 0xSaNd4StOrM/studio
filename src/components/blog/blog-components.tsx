'use client';

import { useState, useEffect, useActionState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ArrowUp,
  Calendar,
  Check,
  Clock,
  Copy,
  Facebook,
  Link2,
  List,
  Mail,
  Share2,
} from 'lucide-react';
import { subscribeToNewsletter } from '@/app/actions';
import type { Post } from '@/types';

// ─── B1.6 Social Share Buttons ──────────────────────────────────────────────
type ShareProps = { url: string; title: string };

export function SocialShareButtons({ url, title }: ShareProps) {
  const [copied, setCopied] = useState(false);
  const [fullUrl, setFullUrl] = useState(url);

  useEffect(() => {
    if (typeof window !== 'undefined' && url.startsWith('/')) {
      setFullUrl(`${window.location.origin}${url}`);
    }
  }, [url]);

  const encodedUrl = encodeURIComponent(fullUrl);
  const encodedTitle = encodeURIComponent(title);

  const shareLinks = [
    {
      name: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      icon: Facebook,
      color: 'hover:bg-blue-600 hover:text-white',
    },
    {
      name: 'X',
      href: `https://x.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      icon: Share2,
      color: 'hover:bg-black hover:text-white',
    },
    {
      name: 'WhatsApp',
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      icon: () => (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      ),
      color: 'hover:bg-green-500 hover:text-white',
    },
  ];

  function handleCopy() {
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground">Share:</span>
      {shareLinks.map((link) => (
        <a
          key={link.name}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          title={`Share on ${link.name}`}
          className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${link.color}`}
        >
          <link.icon className="h-4 w-4" />
        </a>
      ))}
      <button
        onClick={handleCopy}
        title="Copy link"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors hover:bg-muted"
      >
        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}

// ─── B1.7 Table of Contents ─────────────────────────────────────────────────
type TocItem = { id: string; text: string; level: number };

export function TableOfContents({ html }: { html: string }) {
  const headings = useMemo(() => {
    const items: TocItem[] = [];
    const regex = /<h([23])[^>]*?(?:id="([^"]*)")?[^>]*>(.*?)<\/h[23]>/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
      const level = parseInt(match[1]);
      const text = match[3].replace(/<[^>]+>/g, '').trim();
      const id = match[2] || text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      if (text) items.push({ id, text, level });
    }
    return items;
  }, [html]);

  const [isOpen, setIsOpen] = useState(false);

  if (headings.length < 3) return null;

  return (
    <>
      {/* Mobile: collapsible */}
      <div className="mb-6 rounded-xl border bg-muted/30 p-4 lg:hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center justify-between text-sm font-semibold"
        >
          <span className="inline-flex items-center gap-2">
            <List className="h-4 w-4" /> Table of Contents
          </span>
          <span className="text-muted-foreground">{isOpen ? '▲' : '▼'}</span>
        </button>
        {isOpen && <TocList headings={headings} />}
      </div>
      {/* Desktop: sticky sidebar */}
      <nav className="sticky top-24 hidden max-h-[calc(100vh-8rem)] overflow-y-auto rounded-xl border bg-muted/30 p-4 lg:block">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <List className="h-4 w-4" /> Table of Contents
        </p>
        <TocList headings={headings} />
      </nav>
    </>
  );
}

function TocList({ headings }: { headings: TocItem[] }) {
  return (
    <ul className="mt-2 space-y-1">
      {headings.map((h) => (
        <li key={h.id} style={{ paddingLeft: h.level === 3 ? '1rem' : 0 }}>
          <a
            href={`#${h.id}`}
            className="block rounded px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {h.text}
          </a>
        </li>
      ))}
    </ul>
  );
}

// ─── B1.8 Newsletter Email Capture ──────────────────────────────────────────
export function NewsletterForm() {
  const [state, formAction, isPending] = useActionState(subscribeToNewsletter, {
    ok: false,
    message: '',
  });

  return (
    <Card className="overflow-hidden rounded-3xl border-primary/20 bg-primary/5">
      <CardContent className="flex flex-col items-center gap-4 p-6 text-center md:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Get travel deals in your inbox</h3>
          <p className="text-sm text-muted-foreground">
            Subscribe for the latest travel tips, guides, and exclusive offers.
          </p>
        </div>
        {state.ok ? (
          <div className="flex items-center gap-2 text-sm font-medium text-green-600">
            <Check className="h-4 w-4" />
            {state.message}
          </div>
        ) : (
          <form action={formAction} className="flex w-full max-w-md gap-2">
            <Input
              name="email"
              type="email"
              required
              placeholder="your@email.com"
              className="h-11"
              disabled={isPending}
            />
            <Button type="submit" className="h-11 shrink-0" disabled={isPending}>
              {isPending ? 'Subscribing...' : 'Subscribe'}
            </Button>
          </form>
        )}
        {!state.ok && state.message && <p className="text-xs text-destructive">{state.message}</p>}
      </CardContent>
    </Card>
  );
}

// ─── B1.10 Back to Top Button ───────────────────────────────────────────────
export function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 300);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-6 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-110"
      aria-label="Back to top"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}

// ─── B1.5 Related Posts ─────────────────────────────────────────────────────
function stripText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function estimateReadingMinutes(text: string) {
  const words = stripText(text).split(' ').filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function getExcerpt(text: string, maxChars: number) {
  const clean = text
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (clean.length <= maxChars) return clean;
  return `${clean.slice(0, maxChars).trimEnd()}…`;
}

export function RelatedPosts({ posts }: { posts: Post[] }) {
  if (posts.length === 0) return null;

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">You might also like</h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <Card
            key={post.slug}
            className="group overflow-hidden rounded-3xl border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="relative h-40 w-full overflow-hidden">
              {post.featuredImage ? (
                <Image
                  src={post.featuredImage}
                  alt={post.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              ) : (
                <div className="h-full w-full bg-muted" />
              )}
            </div>
            <CardContent className="flex flex-col gap-3 p-5">
              <div className="flex flex-wrap gap-1">
                {post.tags.slice(0, 2).map((t) => (
                  <Badge key={t} variant="secondary" className="text-xs">
                    {t}
                  </Badge>
                ))}
              </div>
              <h3 className="font-headline text-base font-semibold leading-snug">
                <Link href={`/blog/${post.slug}`} className="hover:text-primary">
                  {post.title}
                </Link>
              </h3>
              <p className="text-xs text-muted-foreground">{getExcerpt(post.content, 100)}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(post.createdAt).toLocaleDateString()}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {estimateReadingMinutes(post.content)} min
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

// ─── B1.4 Author Bio Section ────────────────────────────────────────────────
type AuthorBioProps = {
  name: string;
  agencyName?: string;
  contactEmail?: string;
  social?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
};

export function AuthorBio({ name, agencyName, contactEmail, social }: AuthorBioProps) {
  return (
    <Card className="overflow-hidden rounded-3xl">
      <CardContent className="flex flex-col items-center gap-4 p-6 sm:flex-row sm:items-start">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="space-y-2 text-center sm:text-left">
          <div>
            <p className="text-lg font-semibold">{name}</p>
            {agencyName && <p className="text-sm text-muted-foreground">Writer at {agencyName}</p>}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            {social?.twitter && (
              <a
                href={social.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="Twitter / X"
              >
                <Share2 className="h-3.5 w-3.5" />
              </a>
            )}
            {social?.facebook && (
              <a
                href={social.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="Facebook"
              >
                <Facebook className="h-3.5 w-3.5" />
              </a>
            )}
            {social?.instagram && (
              <a
                href={social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="Instagram"
              >
                <Link2 className="h-3.5 w-3.5" />
              </a>
            )}
            {contactEmail && (
              <a
                href={`mailto:${contactEmail}`}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="Email"
              >
                <Mail className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
