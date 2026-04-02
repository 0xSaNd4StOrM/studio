'use client';

import { TourForm, formSchema } from '@/components/admin/tour-form';
import { addTour } from '@/lib/supabase/tours';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface NewTourClientProps {
  categories: string[];
  destinations: string[];
}

export function NewTourClient({ categories, destinations }: NewTourClientProps) {
  const { toast } = useToast();
  const router = useRouter();

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

  return (
    <TourForm
      onSubmit={handleSave}
      formType="new"
      categories={categories}
      destinations={destinations}
    />
  );
}
