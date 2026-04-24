'use server';

import { createClient } from './server';
import { createAdminClient } from '@/lib/supabase/agency-users';
import type { Post } from '@/types';
import { getCurrentAgencyId } from '@/lib/supabase/agencies';
import { getPublicTargetLocale } from '@/lib/translation/get-locale';
import { translateObject, translateObjects } from '@/lib/translation/translate-object';

const POST_TRANSLATABLE_FIELDS = ['title', 'content', 'tags[]'] as const;

type DbPost = {
  id: string;
  slug: string;
  title: string;
  content: string;
  author: string;
  status: 'Published' | 'Draft';
  created_at: string;
  updated_at: string | null;
  featured_image: string | null;
  tags: string[] | null;
  is_featured: boolean;
  views: number;
};

function toPost(row: DbPost): Post {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    content: row.content,
    author: row.author,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
    featuredImage: row.featured_image ?? '',
    tags: row.tags ?? [],
    isFeatured: row.is_featured ?? false,
    views: row.views ?? 0,
  };
}

const POST_SELECT =
  'id, slug, title, content, author, status, created_at, updated_at, featured_image, tags, is_featured, views';

export async function getPosts(options: { skipTranslation?: boolean } = {}): Promise<Post[]> {
  const supabase = await createClient();
  const agencyId = await getCurrentAgencyId();

  try {
    const { data, error } = await supabase
      .from('posts')
      .select(POST_SELECT)
      .eq('agency_id', agencyId)
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching posts:', error);
      return [];
    }

    const posts = (data || []).map(toPost);
    if (options.skipTranslation) return posts;
    const target = await getPublicTargetLocale();
    if (target === 'en') return posts;
    return translateObjects(posts, POST_TRANSLATABLE_FIELDS, target);
  } catch (err) {
    console.error('Unexpected error fetching posts:', err);
    return [];
  }
}

export async function getPostBySlug(
  slug: string,
  options: { skipTranslation?: boolean } = {}
): Promise<Post | null> {
  const supabase = await createClient();
  const agencyId = await getCurrentAgencyId();

  try {
    const { data, error } = await supabase
      .from('posts')
      .select(POST_SELECT)
      .eq('slug', slug)
      .eq('agency_id', agencyId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching post by slug:', error);
      return null;
    }

    if (!data) return null;
    const post = toPost(data as DbPost);
    if (options.skipTranslation) return post;
    const target = await getPublicTargetLocale();
    if (target === 'en') return post;
    return translateObject(post, POST_TRANSLATABLE_FIELDS, target);
  } catch (err) {
    console.error('Unexpected error fetching post by slug:', err);
    return null;
  }
}

export async function upsertPost(post: Post): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createAdminClient();
  const agencyId = await getCurrentAgencyId();

  try {
    const payload = {
      id: post.id,
      slug: post.slug,
      title: post.title,
      content: post.content,
      author: post.author,
      status: post.status,
      created_at: post.createdAt,
      updated_at: new Date().toISOString(),
      featured_image: post.featuredImage ?? null,
      tags: post.tags ?? [],
      is_featured: post.isFeatured ?? false,
      agency_id: agencyId,
    };
    // Note: onConflict: "slug" might need to be "slug, agency_id" if we have a composite unique constraint.
    // However, if we only have unique constraint on slug, this might fail if multiple agencies use same slug.
    // Ideally we should update the unique constraint to be (slug, agency_id).
    // For now, assuming slug is unique globally or we rely on ID.
    const { error } = await supabase.from('posts').upsert(payload, {
      onConflict: 'id', // Use ID for upsert to avoid slug collision issues across agencies if unique constraint is not updated yet
    });
    if (error) throw error;
    return { ok: true };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    return { ok: false, error: err?.message ?? String(err) };
  }
}

export async function deletePostBySlug(slug: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createAdminClient();
  const agencyId = await getCurrentAgencyId();
  try {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('slug', slug)
      .eq('agency_id', agencyId);
    if (error) throw error;
    return { ok: true };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    return { ok: false, error: err?.message ?? String(err) };
  }
}

export async function getRelatedPosts(
  currentSlug: string,
  tags: string[],
  limit = 3,
  options: { skipTranslation?: boolean } = {}
): Promise<Post[]> {
  const supabase = await createClient();
  const agencyId = await getCurrentAgencyId();

  try {
    const { data, error } = await supabase
      .from('posts')
      .select(POST_SELECT)
      .eq('agency_id', agencyId)
      .eq('status', 'Published')
      .neq('slug', currentSlug)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error || !data) return [];

    const posts = (data as DbPost[]).map(toPost);

    // Score by shared tags, then sort by score desc, date desc
    const scored = posts.map((p) => {
      const shared = p.tags.filter((t) => tags.includes(t)).length;
      return { post: p, score: shared };
    });
    scored.sort((a, b) => b.score - a.score || 0);

    const related = scored.slice(0, limit).map((s) => s.post);
    if (options.skipTranslation) return related;
    const target = await getPublicTargetLocale();
    if (target === 'en') return related;
    return translateObjects(related, POST_TRANSLATABLE_FIELDS, target);
  } catch {
    return [];
  }
}

export async function subscribeEmail(email: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const agencyId = await getCurrentAgencyId();

  try {
    const { error } = await supabase
      .from('subscribers')
      .upsert(
        { agency_id: agencyId, email: email.toLowerCase().trim() },
        { onConflict: 'agency_id,email' }
      );
    if (error) throw error;
    return { ok: true };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    if (err?.message?.includes('duplicate') || err?.code === '23505') {
      return { ok: true }; // Already subscribed — treat as success
    }
    return { ok: false, error: err?.message ?? String(err) };
  }
}

export async function incrementPostViews(slug: string): Promise<void> {
  const supabase = await createClient();
  const agencyId = await getCurrentAgencyId();

  try {
    await supabase.rpc('increment_post_views', { post_slug: slug, post_agency_id: agencyId });
  } catch {
    // Fire-and-forget — don't block page render
  }
}
