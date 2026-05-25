'use client';

import { TourForm, formSchema } from '@/components/admin/tour-form';
import { addTour } from '@/lib/supabase/tours';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Tour } from '@/types';

const TOUR_DRAFT_STORAGE_KEY = 'admin-ai-tour-draft';

type TourFormValues = z.infer<typeof formSchema>;
type PriceTierValue = NonNullable<TourFormValues['priceTiers']>[number];
type ItineraryValue = NonNullable<TourFormValues['itinerary']>[number];
type TourPackageValue = NonNullable<Tour['packages']>[number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getStringValue(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' || typeof item === 'number' ? String(item) : ''))
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  if (typeof value === 'string') {
    return value
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  return [];
}

function createTourSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function mapPriceTiers(value: unknown): PriceTierValue[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!isRecord(item)) return null;

      const minPeople = Math.max(1, Math.round(toNumber(item.minPeople, 1)));
      const maxPeopleRaw = item.maxPeople;
      const maxPeople =
        maxPeopleRaw === null || maxPeopleRaw === '' || maxPeopleRaw === undefined
          ? null
          : Math.max(minPeople, Math.round(toNumber(maxPeopleRaw, minPeople)));

      return {
        minPeople,
        maxPeople,
        pricePerAdult: Math.max(0, toNumber(item.pricePerAdult, 0)),
        pricePerChild: Math.max(0, toNumber(item.pricePerChild, 0)),
      };
    })
    .filter((item): item is PriceTierValue => item !== null);
}

function mapPackages(value: unknown): TourPackageValue[] {
  if (!Array.isArray(value)) return [];

  const mappedPackages: TourPackageValue[] = [];

  value.forEach((item, index) => {
    if (!isRecord(item)) return;

    const priceTiers = mapPriceTiers(item.priceTiers);
    if (priceTiers.length === 0) return;

    mappedPackages.push({
      id: getStringValue(item.id) ?? crypto.randomUUID(),
      name: getStringValue(item.name) ?? `Package ${index + 1}`,
      description: getStringValue(item.description) ?? '',
      priceTiers,
    });
  });

  return mappedPackages;
}

function mapItinerary(value: unknown): ItineraryValue[] {
  if (!Array.isArray(value)) return [];

  const mapped = value
    .map((item, index) => {
      if (!isRecord(item)) return null;

      const activity =
        getStringValue(item.activity) ??
        getStringValue(item.plan) ??
        getStringValue(item.description) ??
        toStringArray(item.activities).join(', ');
      if (!activity) return null;

      const day = Math.max(1, Math.round(toNumber(item.day, index + 1)));
      return { day, activity };
    })
    .filter((item): item is ItineraryValue => item !== null)
    .sort((left, right) => left.day - right.day)
    .map((item, index) => ({ ...item, day: index + 1 }));

  return mapped;
}

function getTourDraftSource(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) return null;
  if (isRecord(value.data)) return value.data;
  return value;
}

function mapTourDraftToTour(value: unknown): Tour | null {
  const draft = getTourDraftSource(value);
  if (!draft) return null;

  const name =
    getStringValue(draft.name) ?? getStringValue(draft.tourName) ?? getStringValue(draft.title);
  const destination = getStringValue(draft.destination) ?? toStringArray(draft.region)[0] ?? '';
  const description =
    getStringValue(draft.description) ??
    getStringValue(draft.summary) ??
    getStringValue(draft.excerpt) ??
    '';
  const slugSeed = getStringValue(draft.slug) ?? name ?? destination;
  const slug = slugSeed ? createTourSlug(slugSeed) : '';

  const packages = mapPackages(draft.packages);
  const priceTiers = packages.length > 0 ? [] : mapPriceTiers(draft.priceTiers);
  const itinerary = mapItinerary(draft.itinerary);
  const highlights = toStringArray(draft.highlights);
  const includes = toStringArray(draft.includes ?? draft.inclusions);
  const excludes = toStringArray(draft.excludes ?? draft.exclusions);

  const hasImportedData = Boolean(
    name ||
      destination ||
      description ||
      itinerary.length > 0 ||
      highlights.length > 0 ||
      includes.length > 0 ||
      excludes.length > 0 ||
      packages.length > 0 ||
      priceTiers.length > 0
  );
  if (!hasImportedData) return null;

  const images = Array.isArray(draft.images)
    ? draft.images.filter((item): item is string => typeof item === 'string' && item.length > 0)
    : [];

  // Multi-destination support: prefer an imported `destinations` array,
  // fall back to wrapping the singular `destination` so AI/import flows
  // stay backwards-compatible.
  const importedDestinations = toStringArray(
    (draft as Record<string, unknown>).destinations
  );
  const destinations =
    importedDestinations.length > 0
      ? importedDestinations
      : destination
        ? [destination]
        : [];

  return {
    id: getStringValue(draft.id) ?? crypto.randomUUID(),
    name: name ?? '',
    slug,
    destination: destinations[0] ?? destination,
    destinations,
    type: toStringArray(draft.type ?? draft.categories ?? draft.tourStyle),
    duration: Math.max(1, Math.round(toNumber(draft.duration ?? draft.durationDays, 1))),
    description,
    itinerary,
    availability: typeof draft.availability === 'boolean' ? draft.availability : true,
    images,
    rating: Math.min(5, Math.max(1, toNumber(draft.rating, 4.5))),
    priceTiers,
    packages,
    durationText: getStringValue(draft.durationText) ?? '',
    tourType: getStringValue(draft.tourType) ?? '',
    availabilityDescription: getStringValue(draft.availabilityDescription) ?? '',
    pickupAndDropoff: getStringValue(draft.pickupAndDropoff) ?? '',
    highlights,
    includes,
    excludes,
    cancellationPolicy: getStringValue(draft.cancellationPolicy) ?? '',
  };
}

interface NewTourClientProps {
  categories: string[];
  destinations: string[];
}

export function NewTourClient({ categories, destinations }: NewTourClientProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [draftTour, setDraftTour] = useState<Tour | undefined>(undefined);
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);

  useEffect(() => {
    try {
      const storedDraft = localStorage.getItem(TOUR_DRAFT_STORAGE_KEY);
      if (!storedDraft) return;

      const parsedDraft = JSON.parse(storedDraft) as unknown;
      const mappedDraft = mapTourDraftToTour(parsedDraft);
      if (!mappedDraft) return;

      setDraftTour(mappedDraft);
      localStorage.removeItem(TOUR_DRAFT_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to import tour draft from localStorage:', error);
    } finally {
      setHasLoadedDraft(true);
    }
  }, []);

  const handleSave = async (data: z.infer<typeof formSchema>) => {
    try {
      // Transform the form data to match the Tour type
      const transformedData = {
        ...data,
        highlights: data.highlights?.map((h) => h.value),
        includes: data.includes?.map((i) => i.value),
        excludes: data.excludes?.map((e) => e.value),
      };

      // @ts-expect-error - The images type in form is any[], but addTour expects any[] too. Types should match.
      await addTour(transformedData);

      toast({
        title: 'Success',
        description: 'Tour created successfully.',
      });

      router.push('/admin/tours');
      router.refresh();
    } catch (error) {
      console.error('Failed to save tour:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to create tour. Please try again.';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  };

  if (!hasLoadedDraft) {
    return null;
  }

  return (
    <TourForm
      initialData={draftTour}
      onSubmit={handleSave}
      formType="new"
      categories={categories}
      destinations={destinations}
    />
  );
}
