import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function TourCardSkeleton() {
  return (
    <Card className="flex h-full flex-col overflow-hidden rounded-3xl border-border/60 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        <Skeleton className="h-full w-full" />
        <div className="absolute left-3 top-3">
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <div className="absolute right-3 top-3">
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      </div>

      <CardContent className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center gap-3">
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-3.5 w-12" />
        </div>

        <Skeleton className="h-6 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/5" />

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-border/60 pt-4">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-7 w-24" />
          </div>
          <Skeleton className="h-10 w-28 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}
