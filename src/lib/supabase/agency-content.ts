'use server';

import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/agency-users';
import { getCurrentAgencyId } from '@/lib/supabase/agencies';
import { HomeContent } from '@/types';
import { revalidatePath } from 'next/cache';
import type { Metadata } from 'next';

export type PageSeoSettings = {
  title?: string;
  description?: string;
  keywords?: string;
};

export type SiteSeoSettings = {
  siteName?: string;
  defaultTitle?: string;
  titleTemplate?: string;
  description?: string;
  keywords?: string;
  ogImageUrl?: string;
  twitterImageUrl?: string;
  faviconUrl?: string;
};

export type DestinationFallbackImage = {
  destination: string;
  imageUrl: string;
};

export type DestinationPageCardContent = {
  destination: string;
  description?: string;
};

export type DestinationPageSettings = {
  heroTitle?: string;
  heroSubtitle?: string;
  cards?: DestinationPageCardContent[];
};

export type AgencyImageSettings = {
  aboutHeroUrl?: string;
  aboutSideImageUrl?: string;
  contactHeroUrl?: string;
  contactCardImageUrl?: string;
  servicesHeroUrl?: string;
  blogHeroUrl?: string;
  destinationHeroUrl?: string;
  upsellHeroUrl?: string;
  destinationFallbackImages?: DestinationFallbackImage[];
};

export type AgencySettingsData = {
  agencyName?: string;
  phoneNumber?: string;
  contactEmail?: string;
  address?: string;
  tagline?: string;
  navLinks?: { label: string; href: string }[];
  aboutUs?: string;
  images?: AgencyImageSettings;
  socialMedia?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
  paymentMethods?: {
    cash?: boolean;
    online?: boolean;
    defaultMethod?: 'cash' | 'online';
  };
  theme?: {
    primaryColor?: string;
    fontFamily?: string;
  };
  seo?: {
    site?: SiteSeoSettings;
    home?: PageSeoSettings;
    about?: PageSeoSettings;
    contact?: PageSeoSettings;
    tours?: PageSeoSettings;
    services?: PageSeoSettings;
    blog?: PageSeoSettings;
    destination?: PageSeoSettings;
    tailorMade?: PageSeoSettings;
  };
  destinationPage?: DestinationPageSettings;
  tourDestinations?: string[];
  tourCategories?: string[];
  modules?: {
    tours?: boolean;
    hotels?: boolean;
    blog?: boolean;
  };
  singleHotelMode?: boolean;
  hotelSearchConfig?: {
    maxAdults?: number;
    maxChildren?: number;
    maxRooms?: number;
  };
  emailSettings?: {
    /** Agency's own Resend API key — falls back to RESEND_API_KEY env if not set */
    resendApiKey?: string;
    /** Display name for the "from" field, e.g. "Tix & Trips Egypt" */
    fromName?: string;
    /** Sender email address, must be verified in Resend */
    fromEmail?: string;
    /** Whether to send admin notification emails on new bookings */
    notifyAdminOnBooking?: boolean;
  };
};

export type TourTaxonomyType = 'category' | 'destination';

type AgencySettingsRow = {
  data: AgencySettingsData;
  logo_url: string | null;
  favicon_url: string | null;
  agency_id: string;
};

type TourTaxonomyRow = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
};

function normalizeTaxonomyName(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function slugifyTaxonomyName(value: string) {
  return normalizeTaxonomyName(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '');
}

async function getAgencySettingsRow(): Promise<AgencySettingsRow | null> {
  const supabase = await createClient();
  const agencyId = await getCurrentAgencyId();

  const { data, error } = await supabase
    .from('settings')
    .select('data, logo_url, favicon_url, agency_id')
    .eq('agency_id', agencyId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching agency settings:', error);
    return null;
  }

  return data ? (data as AgencySettingsRow) : null;
}

export async function getTourTaxonomy(type: TourTaxonomyType): Promise<string[]> {
  const supabase = await createClient();
  const agencyId = await getCurrentAgencyId();

  const { data, error } = await supabase
    .from('tour_taxonomy')
    .select('name, sort_order')
    .eq('agency_id', agencyId)
    .eq('taxonomy_type', type)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching tour taxonomy:', error);
    return [];
  }

  return (data ?? [])
    .map((row) => normalizeTaxonomyName((row as { name: string }).name))
    .filter(Boolean);
}

export async function getAgencySettings() {
  const agencyId = await getCurrentAgencyId();

  const [row, tourCategories, tourDestinations] = await Promise.all([
    getAgencySettingsRow(),
    getTourTaxonomy('category'),
    getTourTaxonomy('destination'),
  ]);

  const baseData = (row?.data ?? {}) as AgencySettingsData;
  const rowFaviconUrl = row?.favicon_url ?? null;
  const mergedSeoSite: SiteSeoSettings | undefined = rowFaviconUrl
    ? {
        ...(baseData.seo?.site ?? {}),
        faviconUrl: rowFaviconUrl,
      }
    : baseData.seo?.site;
  const mergedSeo: AgencySettingsData['seo'] | undefined =
    mergedSeoSite || baseData.seo
      ? {
          ...(baseData.seo ?? {}),
          site: mergedSeoSite,
        }
      : undefined;
  const mergedData: AgencySettingsData = {
    ...baseData,
    seo: mergedSeo,
  };

  return {
    data: {
      ...mergedData,
      tourCategories,
      tourDestinations,
    } as AgencySettingsData,
    logo_url: row?.logo_url ?? null,
    favicon_url: rowFaviconUrl,
    agency_id: row?.agency_id ?? agencyId,
  };
}

export async function updateAgencySettings(
  settingsData: AgencySettingsData,
  logoUrl?: string | null,
  faviconUrl?: string | null
) {
  const supabase = await createAdminClient();
  const agencyId = await getCurrentAgencyId();

  // Check if settings row exists for this agency
  const existing = await getAgencySettingsRow();

  const {
    tourCategories: _tourCategories,
    tourDestinations: _tourDestinations,
    ...settingsDataWithoutTaxonomy
  } = settingsData ?? {};

  const resolvedLogoUrl = logoUrl === undefined ? (existing?.logo_url ?? null) : logoUrl;
  const existingFaviconUrlFromData =
    existing?.data?.seo?.site?.faviconUrl && existing.data.seo.site.faviconUrl.trim()
      ? existing.data.seo.site.faviconUrl.trim()
      : null;
  const resolvedFaviconUrl =
    faviconUrl === undefined ? (existing?.favicon_url ?? existingFaviconUrlFromData) : faviconUrl;

  const currentData = (existing?.data ?? {}) as AgencySettingsData;

  const mergedSettingsData: AgencySettingsData = {
    ...currentData,
    ...settingsDataWithoutTaxonomy,
    images: {
      ...(currentData.images ?? {}),
      ...(settingsDataWithoutTaxonomy.images ?? {}),
    },
    socialMedia: {
      ...(currentData.socialMedia ?? {}),
      ...(settingsDataWithoutTaxonomy.socialMedia ?? {}),
    },
    paymentMethods: {
      ...(currentData.paymentMethods ?? {}),
      ...(settingsDataWithoutTaxonomy.paymentMethods ?? {}),
    },
    theme: {
      ...(currentData.theme ?? {}),
      ...(settingsDataWithoutTaxonomy.theme ?? {}),
    },
    destinationPage: {
      ...(currentData.destinationPage ?? {}),
      ...(settingsDataWithoutTaxonomy.destinationPage ?? {}),
    },
    seo: {
      ...(currentData.seo ?? {}),
      ...(settingsDataWithoutTaxonomy.seo ?? {}),
      site: {
        ...(currentData.seo?.site ?? {}),
        ...(settingsDataWithoutTaxonomy.seo?.site ?? {}),
      },
    },
  };

  if (resolvedFaviconUrl && resolvedFaviconUrl.trim()) {
    mergedSettingsData.seo = {
      ...(mergedSettingsData.seo ?? {}),
      site: {
        ...(mergedSettingsData.seo?.site ?? {}),
        faviconUrl: resolvedFaviconUrl.trim(),
      },
    };
  } else if (mergedSettingsData.seo?.site?.faviconUrl) {
    const nextSite = { ...(mergedSettingsData.seo.site ?? {}) };
    delete nextSite.faviconUrl;
    mergedSettingsData.seo = {
      ...(mergedSettingsData.seo ?? {}),
      site: nextSite,
    };
  }

  const payload = {
    data: mergedSettingsData,
    logo_url: resolvedLogoUrl,
    favicon_url: resolvedFaviconUrl,
    updated_at: new Date().toISOString(),
    agency_id: agencyId,
  };

  let error;
  if (existing) {
    // Update
    const { error: updateError } = await supabase
      .from('settings')
      .update(payload)
      .eq('agency_id', agencyId);
    error = updateError;
  } else {
    // Insert
    const { error: insertError } = await supabase.from('settings').insert(payload);
    error = insertError;
  }

  if (error) {
    throw new Error(`Failed to save settings: ${error.message}`);
  }

  revalidatePath('/');
  revalidatePath('/about');
  revalidatePath('/contact');
  revalidatePath('/tours');
  revalidatePath('/services');
  revalidatePath('/blog');
  revalidatePath('/destination');
  revalidatePath('/upsell-items');
  revalidatePath('/tailor-made');
  revalidatePath('/admin/tours');
  revalidatePath('/admin/tours/new');
  revalidatePath('/admin/tours/settings');
  revalidatePath('/admin/settings');
}

export async function updateTourTaxonomy(input: { categories: string[]; destinations: string[] }) {
  const agencyId = await getCurrentAgencyId();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('You must be signed in to update tour settings.');
  }

  const { data: adminMembership, error: adminMembershipError } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (adminMembershipError) {
    throw new Error(adminMembershipError.message);
  }

  if (!adminMembership) {
    const { data: agencyMembership, error: agencyMembershipError } = await supabase
      .from('agency_users')
      .select('role')
      .eq('user_id', user.id)
      .eq('agency_id', agencyId)
      .maybeSingle();

    if (agencyMembershipError) {
      throw new Error(agencyMembershipError.message);
    }

    const role = agencyMembership?.role;
    if (role !== 'owner' && role !== 'admin') {
      throw new Error('You are not authorized to update tour settings.');
    }
  }

  const adminClient = createServiceRoleClient();
  const now = new Date().toISOString();

  async function syncType(taxonomyType: TourTaxonomyType, values: string[]) {
    const normalizedValues = values.map(normalizeTaxonomyName).filter(Boolean);

    const seen = new Set<string>();
    const unique = normalizedValues.filter((name) => {
      const key = name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    unique.sort((a, b) => a.localeCompare(b));

    const usedSlugs = new Set<string>();
    const upsertRows = unique.map((name, idx) => {
      let baseSlug = slugifyTaxonomyName(name);
      if (!baseSlug) {
        baseSlug = crypto.randomUUID();
      }

      let slug = baseSlug;
      let suffix = 2;
      while (usedSlugs.has(slug)) {
        slug = `${baseSlug}-${suffix}`;
        suffix += 1;
      }
      usedSlugs.add(slug);

      return {
        agency_id: agencyId,
        taxonomy_type: taxonomyType,
        name,
        slug,
        is_active: true,
        sort_order: idx,
        updated_at: now,
      };
    });

    if (upsertRows.length > 0) {
      const { error: upsertError } = await adminClient
        .from('tour_taxonomy')
        .upsert(upsertRows, { onConflict: 'agency_id,taxonomy_type,slug' });

      if (upsertError) {
        throw new Error(upsertError.message);
      }
    }

    const { data: existingActive, error: existingError } = await adminClient
      .from('tour_taxonomy')
      .select('id, name, slug, is_active')
      .eq('agency_id', agencyId)
      .eq('taxonomy_type', taxonomyType)
      .eq('is_active', true);

    if (existingError) {
      throw new Error(existingError.message);
    }

    const desiredKeys = new Set(unique.map((name) => name.toLowerCase()));
    const toDeactivateIds = ((existingActive ?? []) as TourTaxonomyRow[])
      .filter((row) => !desiredKeys.has(normalizeTaxonomyName(row.name).toLowerCase()))
      .map((row) => row.id);

    if (toDeactivateIds.length > 0) {
      const { error: deactivateError } = await adminClient
        .from('tour_taxonomy')
        .update({ is_active: false, updated_at: now })
        .in('id', toDeactivateIds);

      if (deactivateError) {
        throw new Error(deactivateError.message);
      }
    }
  }

  await syncType('category', input.categories ?? []);
  await syncType('destination', input.destinations ?? []);

  revalidatePath('/');
  revalidatePath('/tours');
  revalidatePath('/destination');
  revalidatePath('/admin/tours');
  revalidatePath('/admin/tours/new');
  revalidatePath('/admin/tours/settings');
}

export async function getHomePageContent() {
  const supabase = await createClient();
  const agencyId = await getCurrentAgencyId();

  const { data, error } = await supabase
    .from('home_page_content')
    .select('data')
    .eq('agency_id', agencyId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching home page content:', error);
    return null;
  }

  return data ? (data.data as HomeContent) : null;
}

export async function updateHomePageContent(content: HomeContent) {
  const supabase = await createAdminClient();
  const agencyId = await getCurrentAgencyId();

  const existing = await getHomePageContent();

  const payload = {
    data: content,
    updated_at: new Date().toISOString(),
    agency_id: agencyId,
  };

  let error;
  if (existing) {
    const { error: updateError } = await supabase
      .from('home_page_content')
      .update(payload)
      .eq('agency_id', agencyId);
    error = updateError;
  } else {
    const { error: insertError } = await supabase.from('home_page_content').insert(payload);
    error = insertError;
  }

  if (error) {
    throw new Error(`Failed to save home page content: ${error.message}`);
  }

  revalidatePath('/');
}

export async function getPageMetadata(
  page: 'home' | 'about' | 'contact' | 'tours' | 'services' | 'blog' | 'destination' | 'tailorMade',
  defaults?: { title?: string; description?: string }
): Promise<Metadata> {
  let settings;
  try {
    settings = await getAgencySettings();
  } catch {
    // ignore
  }

  const site = settings?.data?.seo?.site;
  const seo = settings?.data?.seo?.[page];

  const siteName = site?.siteName || settings?.data?.agencyName || 'Travel Agency';

  const title = seo?.title || defaults?.title || site?.defaultTitle || siteName;
  const description = seo?.description || defaults?.description || site?.description || '';

  const keywordsSource = seo?.keywords || site?.keywords;
  const keywords = keywordsSource
    ? keywordsSource
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean)
    : undefined;

  return {
    title,
    description,
    keywords,
  };
}
