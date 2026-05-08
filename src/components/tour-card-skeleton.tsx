import { Skeleton } from '@/components/ui/skeleton';

export function TourCardSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[24px] bg-muted">
        <Skeleton className="h-full w-full" />
        <div className="absolute right-4 top-4">
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
        <div className="absolute inset-x-0 bottom-0 space-y-3 p-6">
          <Skeleton className="h-2.5 w-24 rounded-full bg-white/30" />
          <Skeleton className="h-7 w-4/5 bg-white/30" />
          <Skeleton className="h-3 w-1/2 bg-white/20" />
        </div>
      </div>
      <div className="mt-5 flex items-end justify-between gap-3 px-1">
        <div className="space-y-2">
          <Skeleton className="h-2.5 w-12" />
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-px w-10" />
        </div>
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}
