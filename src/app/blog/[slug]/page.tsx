import { notFound } from "next/navigation";
import { getPostBySlug } from "@/lib/supabase/blog";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Calendar, Clock, User } from "lucide-react";

type Props = { params: Promise<{ slug: string }> };

function stripText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function estimateReadingMinutes(text: string) {
  const words = stripText(text).split(" ").filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export default async function BlogPost({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const paragraphs = post.content
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <div className="flex items-center justify-between gap-4">
        <Button asChild variant="outline">
          <Link href="/blog">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to blog
          </Link>
        </Button>
      </div>

      <header className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {(post.tags ?? []).slice(0, 5).map((t) => (
            <Badge key={t} variant="secondary">
              {t}
            </Badge>
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
      </header>

      <Card className="overflow-hidden rounded-3xl">
        {post.featuredImage ? (
          <div className="relative h-80 w-full">
            <Image
              src={post.featuredImage}
              alt={post.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 768px"
            />
          </div>
        ) : null}
        <CardContent className="prose prose-neutral max-w-none dark:prose-invert">
          {paragraphs.length > 0 ? (
            paragraphs.map((p, idx) => <p key={idx}>{p}</p>)
          ) : (
            <p>{post.content}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
