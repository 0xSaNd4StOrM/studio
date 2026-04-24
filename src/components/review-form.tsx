'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { submitReview } from '@/lib/supabase/reviews';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';

interface ReviewFormProps {
  agencyId: string;
  tourId?: string;
  hotelId?: string;
  itemName: string; // tour or hotel name — used in the heading
}

export function ReviewForm({ agencyId, tourId, hotelId, itemName }: ReviewFormProps) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast({ title: t('reviews.form.selectRating'), variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      await submitReview({
        agencyId,
        tourId,
        hotelId,
        customerName: name,
        customerEmail: email,
        rating,
        content,
      });
      setSubmitted(true);
      toast({
        title: t('reviews.form.submitted'),
        description: t('reviews.form.submittedDesc'),
      });
    } catch {
      toast({
        title: t('reviews.form.failed'),
        description: t('reviews.form.failedDesc'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
          <div className="flex items-center justify-center rounded-full bg-green-100 p-3 dark:bg-green-900/30">
            <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
          </div>
          <h3 className="text-lg font-semibold">{t('reviews.form.thankYou')}</h3>
          <p className="text-sm text-muted-foreground">{t('reviews.form.thankYouDesc')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('reviews.form.title')}</CardTitle>
        <CardDescription>{`${t('reviews.form.description')} ${itemName}`}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Star Rating */}
          <div className="space-y-2">
            <Label>{t('reviews.form.rating')}</Label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="rounded-sm p-0.5 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <Star
                    className={`h-7 w-7 transition-colors ${
                      star <= (hoveredRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground/40'
                    }`}
                  />
                </button>
              ))}
              {rating > 0 && <span className="ml-2 text-sm text-muted-foreground">{rating}/5</span>}
            </div>
          </div>

          {/* Name & Email */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="review-name">{t('reviews.form.name')}</Label>
              <Input
                id="review-name"
                placeholder={t('reviews.form.namePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="review-email">{t('reviews.form.email')}</Label>
              <Input
                id="review-email"
                type="email"
                placeholder={t('reviews.form.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="review-content">{t('reviews.form.content')}</Label>
            <Textarea
              id="review-content"
              placeholder={t('reviews.form.contentPlaceholder')}
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
            {isSubmitting ? t('reviews.form.submitting') : t('reviews.form.submit')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
