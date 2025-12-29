import { getTours } from "@/lib/supabase/tours";
import { ToursClient } from "./tours-client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default async function AllToursPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const q = typeof resolvedSearchParams?.q === "string" ? resolvedSearchParams.q : "";
  const destination =
    typeof resolvedSearchParams?.destination === "string" ? resolvedSearchParams.destination : "";
  const type = typeof resolvedSearchParams?.type === "string" ? resolvedSearchParams.type : "";
  const sort = typeof resolvedSearchParams?.sort === "string" ? resolvedSearchParams.sort : "";

  const getTypeLabelFromTour = (tour: { tourType?: string; type?: string[] }) => {
    if (tour.tourType && tour.tourType.trim()) return tour.tourType.trim();
    const first = Array.isArray(tour.type) ? tour.type.find((v) => v && v.trim()) : undefined;
    return first?.trim() || "";
  };
  const getSortLabel = (value: string) => {
    switch (value) {
      case "rating_desc":
        return "Top rated";
      case "price_asc":
        return "Price: low to high";
      case "price_desc":
        return "Price: high to low";
      case "duration_asc":
        return "Duration: short to long";
      case "duration_desc":
        return "Duration: long to short";
      case "name_asc":
        return "Name: A to Z";
      default:
        return value;
    }
  };

  let tours = [] as Awaited<ReturnType<typeof getTours>>;
  let hasLoadError = false;
  try {
    tours = await getTours({ q, destination, type });
  } catch {
    tours = [];
    hasLoadError = true;
  }
  let allTours = tours;
  try {
    allTours = await getTours();
  } catch {
    allTours = tours;
  }

  const uniqueDestinations = Array.from(
    new Set(allTours.map((t) => t.destination).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));

  const uniqueTypes = Array.from(
    new Set(allTours.map(getTypeLabelFromTour).filter((v) => v && v.length > 0)),
  ).sort((a, b) => a.localeCompare(b));

  const getMinAdultPrice = (tour: {
    priceTiers?: Array<{ pricePerAdult: number }>;
    packages?: Array<{ priceTiers: Array<{ pricePerAdult: number }> }>;
  }) => {
    const prices: number[] = [];
    for (const tier of tour.priceTiers ?? []) {
      if (typeof tier?.pricePerAdult === "number") prices.push(tier.pricePerAdult);
    }
    for (const pkg of tour.packages ?? []) {
      for (const tier of pkg.priceTiers ?? []) {
        if (typeof tier?.pricePerAdult === "number") prices.push(tier.pricePerAdult);
      }
    }
    if (prices.length === 0) return Number.POSITIVE_INFINITY;
    return Math.min(...prices);
  };

  const sortedTours = [...tours];
  switch (sort) {
    case "price_asc":
      sortedTours.sort((a, b) => getMinAdultPrice(a) - getMinAdultPrice(b));
      break;
    case "price_desc":
      sortedTours.sort((a, b) => getMinAdultPrice(b) - getMinAdultPrice(a));
      break;
    case "duration_asc":
      sortedTours.sort((a, b) => (a.duration ?? 0) - (b.duration ?? 0));
      break;
    case "duration_desc":
      sortedTours.sort((a, b) => (b.duration ?? 0) - (a.duration ?? 0));
      break;
    case "rating_desc":
      sortedTours.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      break;
    case "name_asc":
      sortedTours.sort((a, b) => a.name.localeCompare(b.name));
      break;
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-4xl font-bold font-headline">Explore All Tours</h1>
        <p className="text-muted-foreground">
          Browse, filter, and compare tours before you book.
        </p>
      </div>

      <form
        method="get"
        className="rounded-2xl border bg-card p-4 md:p-6"
        aria-label="Filter tours"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-4 space-y-2">
            <label className="text-sm font-medium" htmlFor="tours-q">
              Search
            </label>
            <Input
              id="tours-q"
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search by name..."
            />
          </div>

          <div className="md:col-span-3 space-y-2">
            <label className="text-sm font-medium" htmlFor="tours-destination">
              Destination
            </label>
            <select
              id="tours-destination"
              name="destination"
              defaultValue={destination}
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">All destinations</option>
              {uniqueDestinations.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3 space-y-2">
            <label className="text-sm font-medium" htmlFor="tours-type">
              Type
            </label>
            <select
              id="tours-type"
              name="type"
              defaultValue={type}
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">All types</option>
              {uniqueTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2 space-y-2">
            <label className="text-sm font-medium" htmlFor="tours-sort">
              Sort
            </label>
            <select
              id="tours-sort"
              name="sort"
              defaultValue={sort}
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Recommended</option>
              <option value="rating_desc">Top rated</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
              <option value="duration_asc">Duration: short to long</option>
              <option value="duration_desc">Duration: long to short</option>
              <option value="name_asc">Name: A to Z</option>
            </select>
          </div>

          <div className="md:col-span-12 flex flex-col sm:flex-row gap-3 sm:justify-end">
            <Button type="submit">Apply</Button>
            <Button asChild type="button" variant="outline">
              <Link href="/tours">Clear</Link>
            </Button>
          </div>
        </div>
      </form>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {sortedTours.length} of {allTours.length} tour
          {allTours.length === 1 ? "" : "s"}
        </div>

        {(q || destination || type || sort) && (
          <div className="flex flex-wrap gap-2">
            {q && <Badge variant="secondary">Search: {q}</Badge>}
            {destination && <Badge variant="secondary">Destination: {destination}</Badge>}
            {type && <Badge variant="secondary">Type: {type}</Badge>}
            {sort && <Badge variant="secondary">Sort: {getSortLabel(sort)}</Badge>}
          </div>
        )}
      </div>

      {hasLoadError ? (
        <div className="rounded-2xl border bg-card p-8 text-center">
          <h2 className="text-2xl font-semibold mb-2">Tours are temporarily unavailable</h2>
          <p className="text-muted-foreground mb-6">
            Please try again in a moment.
          </p>
          <Button asChild>
            <Link href="/tours">Retry</Link>
          </Button>
        </div>
      ) : sortedTours.length > 0 ? (
        <ToursClient tours={sortedTours} />
      ) : (
        <div className="rounded-2xl border bg-card p-8 text-center">
          <h2 className="text-2xl font-semibold mb-2">No tours found</h2>
          <p className="text-muted-foreground mb-6">
            Try adjusting filters, changing the search, or clearing everything.
          </p>
          <Button asChild>
            <Link href="/tours">Clear filters</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

