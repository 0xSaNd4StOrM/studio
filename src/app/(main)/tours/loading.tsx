import { Skeleton } from '@/components/ui/skeleton';
import { TourCardSkeleton } from '@/components/tour-card-skeleton';

export default function ToursLoading() {
  return (
    <div className="space-y-8">
      {/* Page heading — editorial */}
      <div className="mx-auto max-w-3xl space-y-5 py-8 text-center">
        <Skeleton className="mx-auto h-3 w-40 rounded-full" />
        <Skeleton className="mx-auto h-14 w-3/4" />
        <Skeleton className="mx-auto h-5 w-80" />
        <Skeleton className="mx-auto h-px w-24" />
      </div>

      {/* Filter bar skeleton */}
      <div className="rounded-2xl border bg-card p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-4 space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          <div className="md:col-span-3 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          <div className="md:col-span-3 space-y-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          <div className="md:col-span-2 space-y-2">
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          <div className="md:col-span-12 flex justify-end gap-3">
            <Skeleton className="h-10 w-24 rounded-md" />
            <Skeleton className="h-10 w-24 rounded-md" />
          </div>
        </div>
      </div>

      {/* Results count */}
      <Skeleton className="h-4 w-40" />

      {/* Tour cards grid — 8 skeleton cards */}
      <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <TourCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
