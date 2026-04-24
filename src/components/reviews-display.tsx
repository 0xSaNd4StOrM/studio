'use client';

import { Star } from 'lucide-react';
import type { Review } from '@/types';
import { useLanguage } from '@/hooks/use-language';

interface ReviewsDisplayProps {
  reviews: Review[];
  title?: string;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'
          }`}
        />
      ))}
    </div>
  );
}

export function ReviewsDisplay({ reviews, title }: ReviewsDisplayProps) {
  const { t, language } = useLanguage();
  if (reviews.length === 0) return null;

  const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  const resolvedTitle = title ?? t('reviews.title');
  const countLabel = reviews.length === 1 ? t('reviews.singular') : t('reviews.plural');

  return (
    <div className="space-y-6">
      {/* Header with average rating */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold">{resolvedTitle}</h2>
        <div className="flex items-center gap-2">
          <StarRating rating={Math.round(averageRating)} />
          <span className="text-sm font-medium">{averageRating.toFixed(1)}</span>
          <span className="text-sm text-muted-foreground">
            ({reviews.length} {countLabel})
          </span>
        </div>
      </div>

      {/* Review list */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <div key={review.id} className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {review.customerName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{review.customerName}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(review.createdAt).toLocaleDateString(language || 'en', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>
              <StarRating rating={review.rating} />
            </div>
            {review.content && (
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{review.content}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
