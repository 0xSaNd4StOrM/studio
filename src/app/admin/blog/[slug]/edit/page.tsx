'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Sparkles, Loader2 } from 'lucide-react';
import { ImageUploader } from '@/components/admin/image-uploader';
import { createClient } from '@/lib/supabase/client';
import { Combobox } from '@/components/ui/combobox';
import { Switch } from '@/components/ui/switch';
import { useEffect, useState, useActionState, useRef } from 'react';
import { generateBlogPostAction } from '@/app/actions';
import { HtmlEditorToolbar } from '@/components/admin/html-editor-toolbar';
import type { Post } from '@/types';

const authors = ['Admin User', 'Guest Writer'];
const availableTags = [
  { value: 'Travel Tips', label: 'Travel Tips' },
  { value: 'Destinations', label: 'Destinations' },
  { value: 'Egypt', label: 'Egypt' },
  { value: 'Adventure', label: 'Adventure' },
  { value: 'Culture', label: 'Culture' },
  { value: 'Food', label: 'Food' },
];

const formSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters.'),
  slug: z
    .string()
    .min(3, 'Slug must be at least 3 characters.')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase with words separated by dashes.'),
  content: z.string().min(100, 'Content should be at least 100 characters.'),
  author: z.string().min(1, 'Author is required.'),
  status: z.enum(['Published', 'Draft']),
  tags: z.array(z.string()).optional(),
  featuredImage: z.array(z.any()).optional(),
  topic: z.string().optional(),
  keywords: z.string().optional(),
  isFeatured: z.boolean().optional(),
});

function GenerateButton({ pending }: { pending: boolean }) {
  return (
    <Button
      type="submit"
      name="action"
      value="generate"
      disabled={pending}
      variant="outline"
      className="w-full mt-2 md:mt-0 md:w-auto"
    >
      {pending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className="mr-2 h-4 w-4" />
      )}
      Generate Content
    </Button>
  );
}

export default function EditPostPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const isNewPost = slug === 'new';
  const [post, setPost] = useState<Post | null>(null);
  const [existingId, setExistingId] = useState<string | null>(null);

  const [aiState, formAction, isGenerating] = useActionState(generateBlogPostAction, {
    message: '',
    content: '',
  });

  const contentTextAreaRef = useRef<HTMLTextAreaElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      slug: '',
      content: '',
      author: '',
      status: 'Draft',
      tags: [],
      featuredImage: [],
      topic: '',
      keywords: '',
      isFeatured: false,
    },
  });

  useEffect(() => {
    async function fetchPost() {
      if (isNewPost) return;
      const supabase = createClient();
      const { data, error } = await supabase
        .from('posts')
        .select(
          'id, slug, title, content, author, status, tags, featured_image, created_at, updated_at, is_featured'
        )
        .eq('slug', slug)
        .maybeSingle();
      if (!error && data) {
        const mappedPost = {
          ...data,
          featuredImage: data.featured_image,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        } as unknown as Post;

        setPost(mappedPost);
        setExistingId(data.id as string);
        form.reset({
          title: data.title,
          slug: data.slug,
          content: data.content,
          author: data.author,
          status: data.status,
          tags: (data.tags as string[] | null) ?? [],
          featuredImage: [], // Can't pre-populate file inputs
          isFeatured: (data as Record<string, unknown>).is_featured === true,
        });
      }
    }
    fetchPost();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, isNewPost]);

  useEffect(() => {
    if (aiState.content) {
      form.setValue('content', aiState.content, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  }, [aiState.content, form]);

  if (!isNewPost && !post) {
    return <div>Post not found.</div>;
  }

  const handleFormAction = (formData: FormData) => {
    const action = (formData.get('action') as string) || 'submit';
    if (action === 'generate') {
      formAction(formData);
    } else {
      form.handleSubmit(onSubmit)();
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const supabase = createClient();

    let featuredImageUrl: string | undefined = undefined;
    // Upload featured image if provided
    try {
      const file = values.featuredImage && values.featuredImage[0];
      if (file && file instanceof File) {
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `featured/${values.slug}-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('blog').upload(path, file, {
          contentType: file.type || 'image/jpeg',
          upsert: true,
        });
        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage.from('blog').getPublicUrl(path);
          featuredImageUrl = publicUrlData.publicUrl;
        }
      }
    } catch {
      // Ignore upload errors for now
    }

    const payload = {
      id: existingId ?? crypto.randomUUID(),
      slug: values.slug,
      title: values.title,
      content: values.content,
      author: values.author,
      status: values.status,
      tags: values.tags ?? [],
      featured_image: featuredImageUrl ?? post?.featuredImage ?? null,
      created_at: post?.createdAt ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_featured: values.isFeatured ?? false,
    };

    const { error } = await supabase.from('posts').upsert(payload, {
      onConflict: 'slug',
    });
    if (error) {
      alert(`Failed to save post: ${error.message}`);
      return;
    }
    alert(`${isNewPost ? 'New post created' : 'Post updated'}!`);
    router.push('/admin/blog');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/admin/blog">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to blog posts</span>
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {isNewPost ? 'Create a New Post' : 'Edit Post'}
          </h2>
          <p className="text-muted-foreground">
            {isNewPost
              ? 'Fill out the details to publish a new article.'
              : `Editing "${post?.title}"`}
          </p>
        </div>
      </div>
      <Form {...form}>
        <form action={handleFormAction} className="space-y-8">
          <div className="grid lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Post Content</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Post Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Top 10 Things to Do in Cairo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slug</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., top-10-cairo" {...field} />
                        </FormControl>
                        <FormDescription>
                          A unique, URL-friendly identifier for the post.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Card className="bg-muted/50">
                    <CardHeader>
                      <CardTitle className="text-lg">AI Content Generator</CardTitle>
                      <CardDescription>
                        Provide a topic and keywords, and let AI draft the content for you.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4">
                        <FormField
                          control={form.control}
                          name="topic"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Topic</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="e.g., A 3-day itinerary for Luxor"
                                  disabled={isGenerating}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="keywords"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Keywords (optional)</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="e.g., family friendly, budget, historical sites"
                                  disabled={isGenerating}
                                />
                              </FormControl>
                              <FormDescription>
                                Comma-separated keywords to guide the AI.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="flex justify-end mt-4">
                        <GenerateButton pending={isGenerating} />
                      </div>
                      {aiState.message && aiState.message !== 'Success' && (
                        <p className="text-sm text-destructive mt-2">{aiState.message}</p>
                      )}
                    </CardContent>
                  </Card>

                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Content</FormLabel>
                        <HtmlEditorToolbar
                          textAreaRef={contentTextAreaRef}
                          onContentChange={(newContent) =>
                            form.setValue('content', newContent, {
                              shouldDirty: true,
                              shouldValidate: true,
                            })
                          }
                        />
                        <FormControl>
                          <Textarea
                            placeholder="Write your article here. Supports HTML."
                            {...field}
                            ref={contentTextAreaRef}
                            rows={15}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-1 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Publishing</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Published">Published</SelectItem>
                            <SelectItem value="Draft">Draft</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="author"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Author</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an author" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {authors.map((author) => (
                              <SelectItem key={author} value={author}>
                                {author}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isFeatured"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="cursor-pointer">Featured Post</FormLabel>
                          <FormDescription className="text-xs">
                            Pin this post as the hero on the blog page.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button
                    type="submit"
                    name="action"
                    value="submit"
                    disabled={isGenerating || form.formState.isSubmitting}
                  >
                    {(isGenerating || form.formState.isSubmitting) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {isGenerating
                      ? 'Generating...'
                      : form.formState.isSubmitting
                        ? isNewPost
                          ? 'Creating...'
                          : 'Saving...'
                        : isNewPost
                          ? 'Create Post'
                          : 'Save Changes'}
                  </Button>
                </CardFooter>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Organization</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6">
                  <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tags</FormLabel>
                        <Combobox
                          options={availableTags}
                          selected={field.value || []}
                          onChange={field.onChange}
                          placeholder="Select tags..."
                          className="w-full"
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Featured Image</CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="featuredImage"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <ImageUploader value={field.value || []} onChange={field.onChange} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
