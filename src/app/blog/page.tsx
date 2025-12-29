import Link from "next/link";
import Image from "next/image";
import { getPosts } from "@/lib/supabase/blog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowRight, Calendar, Clock, Search, User } from "lucide-react";

export const dynamic = "force-dynamic";

function stripText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function estimateReadingMinutes(text: string) {
  const words = stripText(text).split(" ").filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function getExcerpt(text: string, maxChars: number) {
  const clean = stripText(text);
  if (clean.length <= maxChars) return clean;
  return `${clean.slice(0, maxChars).trimEnd()}…`;
}

export default async function BlogListPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const q = typeof resolvedSearchParams?.q === "string" ? resolvedSearchParams.q : "";
  const tag = typeof resolvedSearchParams?.tag === "string" ? resolvedSearchParams.tag : "";

  const posts = (await getPosts()).filter((p) => p.status === "Published");

  const query = q.trim().toLowerCase();
  const selectedTag = tag.trim();
  const filteredPosts = posts.filter((p) => {
    const matchesQuery =
      query.length === 0 ||
      p.title.toLowerCase().includes(query) ||
      p.content.toLowerCase().includes(query) ||
      p.author.toLowerCase().includes(query);
    const matchesTag =
      selectedTag.length === 0 || (p.tags ?? []).includes(selectedTag);
    return matchesQuery && matchesTag;
  });

  const tags = Array.from(
    new Set(posts.flatMap((p) => p.tags ?? []).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));

  const featured = filteredPosts.find((p) => !!p.featuredImage) ?? filteredPosts[0] ?? null;
  const rest = featured ? filteredPosts.filter((p) => p.slug !== featured.slug) : filteredPosts;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10">
      <section className="relative overflow-hidden rounded-3xl border bg-card">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1452421822248-d4c2b47f0c81?auto=format&fit=crop&w=2400&q=70"
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
                Blog
              </Badge>
              <h1 className="font-headline text-4xl font-bold tracking-tight text-foreground md:text-5xl">
                Travel ideas, guides, and tips
              </h1>
              <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
                Practical planning advice and destination inspiration.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/tours">Explore Tours</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/contact">Contact Us</Link>
              </Button>
            </div>
          </div>

          <form method="get" className="mt-6 grid gap-3 md:grid-cols-[1fr_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={q}
                placeholder="Search posts by title, author, or keyword..."
                className="h-12 pl-9"
              />
            </div>
            <Button type="submit" size="lg" className="h-12">
              Search
            </Button>
          </form>
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-2">
        <Link href={q ? `/blog?q=${encodeURIComponent(q)}` : "/blog"}>
          <Badge
            variant={selectedTag.length === 0 ? "default" : "secondary"}
            className="cursor-pointer"
          >
            All
          </Badge>
        </Link>
        {tags.slice(0, 12).map((t) => {
          const href = `/blog?${new URLSearchParams(
            Object.entries({ q: q || undefined, tag: t }).filter(
              ([, v]) => v != null && v !== "",
            ) as Array<[string, string]>,
          ).toString()}`;
          const isSelected = selectedTag === t;
          return (
            <Link key={t} href={href}>
              <Badge
                variant={isSelected ? "default" : "secondary"}
                className="cursor-pointer"
              >
                {t}
              </Badge>
            </Link>
          );
        })}
      </section>

      {filteredPosts.length === 0 ? (
        <Card className="rounded-3xl">
          <CardContent className="space-y-3">
            <p className="text-lg font-semibold">No posts found</p>
            <p className="text-sm text-muted-foreground">
              Try another keyword or choose a different tag.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="w-full sm:w-auto">
                <Link href="/blog">Clear filters</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full sm:w-auto"
              >
                <Link href="/tours">Browse Tours</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {featured && (
            <Card className="group overflow-hidden rounded-3xl border bg-card transition-all duration-300 hover:shadow-xl">
              <div className="grid gap-0 lg:grid-cols-2">
                <div className="relative min-h-64 overflow-hidden">
                  {featured.featuredImage ? (
                    <Image
                      src={featured.featuredImage}
                      alt={featured.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 1024px) 100vw, 50vw"
                    />
                  ) : (
                    <div className="h-full w-full bg-muted" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
                </div>
                <CardContent className="flex flex-col gap-4 p-6 md:p-8">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">Featured</Badge>
                    {(featured.tags ?? []).slice(0, 2).map((t) => (
                      <Badge key={t} variant="outline">
                        {t}
                      </Badge>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <h2 className="font-headline text-2xl font-semibold tracking-tight md:text-3xl">
                      <Link href={`/blog/${featured.slug}`} className="hover:text-primary">
                        {featured.title}
                      </Link>
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {getExcerpt(featured.content, 170)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {featured.author}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {new Date(featured.createdAt).toLocaleDateString()}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {estimateReadingMinutes(featured.content)} min read
                    </span>
                  </div>
                  <div className="mt-auto">
                    <Button asChild className="w-full sm:w-auto">
                      <Link href={`/blog/${featured.slug}`}>
                        Read article <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </div>
            </Card>
          )}

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((post) => (
              <Card
                key={post.slug}
                className="group overflow-hidden rounded-3xl border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="relative h-44 w-full overflow-hidden">
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
                <CardContent className="flex h-full flex-col gap-4 p-6">
                  <div className="flex flex-wrap gap-2">
                    {(post.tags ?? []).slice(0, 2).map((t) => (
                      <Badge key={t} variant="secondary">
                        {t}
                      </Badge>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-headline text-lg font-semibold leading-snug">
                      <Link href={`/blog/${post.slug}`} className="hover:text-primary">
                        {post.title}
                      </Link>
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {getExcerpt(post.content, 140)}
                    </p>
                  </div>
                  <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
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
                      {estimateReadingMinutes(post.content)} min
                    </span>
                  </div>
                  <Button asChild variant="outline" className="w-full">
                    <Link href={`/blog/${post.slug}`}>
                      Read more <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
