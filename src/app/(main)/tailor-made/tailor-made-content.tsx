'use client';

import { TailorMadeForm } from './tailor-made-form';
import { useLanguage } from '@/hooks/use-language';

export function TailorMadePageContent() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero Header */}
      <div className="relative bg-gradient-to-b from-primary/10 via-primary/5 to-transparent py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-headline text-4xl md:text-6xl font-bold mb-6 text-primary">
            {t('tailor.title')}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('tailor.subtitle')}
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="container mx-auto px-4 -mt-8 relative z-10">
        <div className="bg-card border rounded-2xl shadow-xl p-6 md:p-10 max-w-6xl mx-auto">
          <TailorMadeForm />
        </div>
      </div>
    </div>
  );
}
