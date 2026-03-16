import { notFound } from 'next/navigation';
import { getPostBySlug, getRelatedPosts, incrementPostViews } from '@/lib/supabase/blog';
import { getAgencySettings } from '@/lib/supabase/agency-content';
import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Calendar, Clock, User } from 'lucide-react';
import {
  SocialShareButtons,
  TableOfContents,
  AuthorBio,
  RelatedPosts,
  NewsletterForm,
  BackToTopButton,
} from '@/components/blog/blog-components';
import type { Metadata } from 'next';

type Props = { params: Promise<{ slug: string }> };

function stripText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function estimateReadingMinutes(text: string) {
  const words = stripText(text).split(' ').filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/**
 * Inject IDs into h2/h3 tags so the TOC links can scroll to them.
 */
function injectHeadingIds(html: string): string {
  return html.replace(/<h([23])([^>]*)>(.*?)<\/h[23]>/gi, (match, level, attrs, content) => {
    if (attrs.includes('id=')) return match;
    const text = content.replace(/<[^>]+>/g, '').trim();
    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return `<h${level}${attrs} id="${id}">${content}</h${level}>`;
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return {
      title: 'Post Not Found',
    };
  }

  // Simple description extraction
  const description = post.content
    .replace(/[#*`]/g, '') // Remove some common markdown chars
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 160);

  return {
    title: post.title,
    description: description,
    keywords: post.tags,
    openGraph: {
      title: post.title,
      description: description,
      type: 'article',
      publishedTime: post.createdAt,
      authors: [post.author],
      tags: post.tags,
      images: post.featuredImage ? [{ url: post.featuredImage }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: description,
      images: post.featuredImage ? [post.featuredImage] : [],
    },
  };
}

export default async function BlogPost({ params }: Props) {
  const { slug } = await params;
  const [post, settings] = await Promise.all([getPostBySlug(slug), getAgencySettings()]);

  if (!post) {
    notFound();
  }

  // Fire-and-forget view increment
  incrementPostViews(slug);

  const relatedPosts = await getRelatedPosts(slug, post.tags, 3);

  const agencyName = settings?.data?.agencyName;
  const contactEmail = settings?.data?.contactEmail;
  const social = settings?.data?.socialMedia;

  const htmlContent = injectHeadingIds(post.content);
  const postUrl = `/blog/${slug}`;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <div className="flex items-center justify-between gap-4">
        <Button asChild variant="outline">
          <Link href="/blog">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to blog
          </Link>
        </Button>
      </div>

      <header className="mx-auto max-w-3xl space-y-4">
        <div className="flex flex-wrap gap-2">
          {(post.tags ?? []).slice(0, 5).map((t) => (
            <Link key={t} href={`/blog?tag=${encodeURIComponent(t)}`}>
              <Badge variant="secondary" className="cursor-pointer">
                {t}
              </Badge>
            </Link>
          ))}
        </div>

        <h1 className="font-headline text-4xl font-bold tracking-tight md:text-5xl">
          {post.title}
        </h1>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <User className="h-4 w-4" />
            {post.author}
          </span>
          <span className="inline-flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {new Date(post.createdAt).toLocaleDateString()}
          </span>
          <span className="inline-flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {estimateReadingMinutes(post.content)} min read
          </span>
        </div>

        <SocialShareButtons url={postUrl} title={post.title} />
      </header>

      {post.featuredImage && (
        <div className="relative mx-auto h-80 max-w-3xl overflow-hidden rounded-3xl md:h-96">
          <Image
            src={post.featuredImage}
            alt={post.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 768px"
          />
        </div>
      )}

      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_240px]">
        <Card className="overflow-hidden rounded-3xl">
          <CardContent className="prose prose-neutral max-w-none dark:prose-invert">
            <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
          </CardContent>
        </Card>

        <aside className="hidden lg:block">
          <TableOfContents html={htmlContent} />
        </aside>
      </div>

      {/* Mobile TOC shown above content */}
      <div className="mx-auto max-w-3xl lg:hidden">
        <TableOfContents html={htmlContent} />
      </div>

      <div className="mx-auto max-w-3xl space-y-8">
        <SocialShareButtons url={postUrl} title={post.title} />

        <AuthorBio
          name={post.author}
          agencyName={agencyName}
          contactEmail={contactEmail}
          social={social}
        />

        <NewsletterForm />
      </div>

      <div className="mx-auto max-w-5xl">
        <RelatedPosts posts={relatedPosts} />
      </div>

      <BackToTopButton />
    </div>
  );
}
